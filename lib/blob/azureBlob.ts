import { BlobServiceClient } from "@azure/storage-blob";

import { azureStorageConfigured } from "@/lib/env/execution";

let client: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient | null {
  if (!azureStorageConfigured()) return null;
  if (!client) {
    client = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING!,
    );
  }
  return client;
}

export function documentsContainerName(): string {
  return process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER?.trim() || "pipeline-documents";
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
