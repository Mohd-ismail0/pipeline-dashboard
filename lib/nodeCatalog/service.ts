import { getPrisma, isPrismaEnabled } from "@/lib/prisma";
import type { NodeCatalogEntry } from "@/types/nodeCatalog";

import { BUILT_IN_NODE_CATALOG } from "./builtInCatalog";

function rowToEntry(r: {
  handlerId: string;
  version: string;
  displayName: string;
  category: string;
  inputSchema: unknown;
  outputSchema: unknown | null;
  runtime: string;
  azureTarget: unknown | null;
  capabilities: unknown | null;
}): NodeCatalogEntry {
  return {
    handlerId: r.handlerId,
    version: r.version,
    displayName: r.displayName,
    category: r.category,
    runtime: r.runtime as NodeCatalogEntry["runtime"],
    inputSchema: r.inputSchema as Record<string, unknown>,
    outputSchema: (r.outputSchema as Record<string, unknown>) ?? undefined,
    azureTarget: (r.azureTarget as Record<string, unknown>) ?? undefined,
    capabilities: (r.capabilities as Record<string, unknown>) ?? undefined,
  };
}

export async function listNodeCatalog(): Promise<NodeCatalogEntry[]> {
  if (!isPrismaEnabled()) {
    return BUILT_IN_NODE_CATALOG;
  }
  const prisma = getPrisma();
  const rows = await prisma.nodeCatalog.findMany({
    orderBy: [{ category: "asc" }, { handlerId: "asc" }],
  });
  if (rows.length === 0) {
    return BUILT_IN_NODE_CATALOG;
  }
  return rows.map(rowToEntry);
}
