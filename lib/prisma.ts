import { PrismaClient } from "@prisma/client";
import { readEnv, readEnvTrimmed } from "@/lib/env/runtime";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export function getPrisma(): PrismaClient {
  if (!readEnv("DATABASE_URL")) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export function isPrismaEnabled(): boolean {
  return Boolean(readEnvTrimmed("DATABASE_URL"));
}
