import { randomUUID } from "crypto";

import type { StoredDocument } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/jsonStore";

export interface BlobPutParams {
  configId: string;
  name: string;
  body: string;
  contentType: string;
}

/**
 * Mock Azure Blob — persists via JSON store `documents` list.
 */
export const blobService = {
  async listByConfig(configId: string): Promise<StoredDocument[]> {
    const state = await readAppState();
    return state.documents.filter((d) => d.configId === configId);
  },

  async put(params: BlobPutParams): Promise<StoredDocument> {
    const doc: StoredDocument = {
      id: randomUUID(),
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
    return state.documents.find((d) => d.id === id) ?? null;
  },

  async getLatestBody(configId: string): Promise<string | null> {
    const list = await this.listByConfig(configId);
    if (!list.length) return null;
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted[0]?.body ?? null;
  },

  async getPreviousAndCurrentBodies(
    configId: string,
  ): Promise<{ previous: string | null; current: string | null }> {
    const list = await this.listByConfig(configId);
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const current = sorted[0]?.body ?? null;
    const previous = sorted[1]?.body ?? null;
    return { previous, current };
  },
};
