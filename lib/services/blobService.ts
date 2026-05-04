import { randomUUID } from "crypto";

import { downloadDocumentBlob, uploadDocumentBlob } from "@/lib/blob/azureBlob";
import { azureStorageConfigured } from "@/lib/env/execution";
import type { StoredDocument } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/appStore";

export interface BlobPutParams {
  configId: string;
  name: string;
  body: string;
  contentType: string;
}

function blobPathFor(configId: string, docId: string, name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._/-]/g, "_");
  return `configs/${configId}/documents/${docId}/${safe}`;
}

/**
 * Documents: Azure Blob when `AZURE_STORAGE_CONNECTION_STRING` is set (metadata in DB/JSON);
 * otherwise mock store via app persistence.
 */
export const blobService = {
  async listByConfig(configId: string): Promise<StoredDocument[]> {
    const state = await readAppState();
    return state.documents.filter((d) => d.configId === configId);
  },

  async put(params: BlobPutParams): Promise<StoredDocument> {
    const id = randomUUID();
    if (azureStorageConfigured()) {
      const blobPath = blobPathFor(params.configId, id, params.name);
      await uploadDocumentBlob({
        blobPath,
        body: params.body,
        contentType: params.contentType,
      });
      const doc: StoredDocument = {
        id,
        configId: params.configId,
        name: params.name,
        createdAt: new Date().toISOString(),
        body: "",
        contentType: params.contentType,
        blobPath,
      };
      await updateAppState((s) => {
        s.documents.push(doc);
      });
      return doc;
    }
    const doc: StoredDocument = {
      id,
      configId: params.configId,
      name: params.name,
      createdAt: new Date().toISOString(),
      body: params.body,
      contentType: params.contentType,
    };
    await updateAppState((s) => {
      s.documents.push(doc);
    });
    return doc;
  },

  async getById(id: string): Promise<StoredDocument | null> {
    const state = await readAppState();
    const doc = state.documents.find((d) => d.id === id) ?? null;
    if (!doc) return null;
    if (doc.blobPath && azureStorageConfigured()) {
      const body = await downloadDocumentBlob(doc.blobPath);
      return { ...doc, body };
    }
    return doc;
  },

  async getLatestBody(configId: string): Promise<string | null> {
    const list = await this.listByConfig(configId);
    if (!list.length) return null;
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const head = sorted[0];
    if (!head) return null;
    if (head.blobPath && azureStorageConfigured()) {
      return downloadDocumentBlob(head.blobPath);
    }
    return head.body ?? null;
  },

  async getPreviousAndCurrentBodies(
    configId: string,
  ): Promise<{ previous: string | null; current: string | null }> {
    const list = await this.listByConfig(configId);
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const resolveBody = async (d: StoredDocument | undefined) => {
      if (!d) return null;
      if (d.blobPath && azureStorageConfigured()) {
        return downloadDocumentBlob(d.blobPath);
      }
      return d.body ?? null;
    };
    const current = await resolveBody(sorted[0]);
    const previous = await resolveBody(sorted[1]);
    return { previous, current };
  },
};
