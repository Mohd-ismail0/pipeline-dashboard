import { BlobServiceClient } from "@azure/storage-blob";

import { azureStorageConfigured } from "@/lib/env/execution";
import { readEnv, readEnvTrimmed } from "@/lib/env/runtime";

let client: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient | null {
  if (!azureStorageConfigured()) return null;
  if (!client) {
    const conn = readEnv("AZURE_STORAGE_CONNECTION_STRING");
    if (!conn) return null;
    client = BlobServiceClient.fromConnectionString(conn);
  }
  return client;
}

export function documentsContainerName(): string {
  return readEnvTrimmed("AZURE_STORAGE_DOCUMENTS_CONTAINER") || "documents";
}

export async function uploadDocumentBlob(args: {
  blobPath: string;
  body: string;
  contentType: string;
}): Promise<void> {
  const svc = getBlobServiceClient();
  if (!svc) throw new Error("Azure Storage not configured");
  const container = svc.getContainerClient(documentsContainerName());
  await container.createIfNotExists();
  const block = container.getBlockBlobClient(args.blobPath);
  await block.uploadData(Buffer.from(args.body, "utf-8"), {
    blobHTTPHeaders: { blobContentType: args.contentType },
  });
}

export async function downloadDocumentBlob(blobPath: string): Promise<string> {
  const svc = getBlobServiceClient();
  if (!svc) throw new Error("Azure Storage not configured");
  const container = svc.getContainerClient(documentsContainerName());
  const block = container.getBlockBlobClient(blobPath);
  const buf = await block.downloadToBuffer();
  return buf.toString("utf-8");
}
