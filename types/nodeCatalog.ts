export type NodeCatalogRuntime =
  | "inline_activity"
  | "azure_function"
  | "container_job"
  | "external_http";

export interface NodeCatalogEntry {
  handlerId: string;
  version: string;
  displayName: string;
  category: string;
  runtime: NodeCatalogRuntime;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  azureTarget?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
}
