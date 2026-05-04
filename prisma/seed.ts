import { PrismaClient } from "@prisma/client";

import { BUILT_IN_NODE_CATALOG } from "../lib/nodeCatalog/builtInCatalog";
import { createSeedState } from "../lib/store/appState";
import { writeAppState } from "../lib/store/prismaStore";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.config.count();
  if (n === 0) {
    const seed = createSeedState();
    await writeAppState(seed);
  }

  for (const e of BUILT_IN_NODE_CATALOG) {
    await prisma.nodeCatalog.upsert({
      where: {
        handlerId_version: { handlerId: e.handlerId, version: e.version },
      },
      create: {
        handlerId: e.handlerId,
        version: e.version,
        displayName: e.displayName,
        category: e.category,
        inputSchema: e.inputSchema as object,
        outputSchema: (e.outputSchema ?? null) as object | null,
        runtime: e.runtime,
        azureTarget: (e.azureTarget ?? null) as object | null,
        capabilities: (e.capabilities ?? null) as object | null,
      },
      update: {
        displayName: e.displayName,
        category: e.category,
        inputSchema: e.inputSchema as object,
        outputSchema: (e.outputSchema ?? null) as object | null,
        runtime: e.runtime,
        azureTarget: (e.azureTarget ?? null) as object | null,
        capabilities: (e.capabilities ?? null) as object | null,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
