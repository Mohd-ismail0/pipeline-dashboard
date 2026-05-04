import type { ScrapingConfig } from "@/types/config";
import type { PipelinePersist } from "@/types/pipeline";

export interface ScheduleRegistration {
  configId: string;
  cron: string;
  updatedAt: string;
}

export interface StoredDocument {
  id: string;
  configId: string;
  name: string;
  createdAt: string;
  /** Raw body for downloads / diff (mock blob) */
  body: string;
  contentType: string;
}

export interface AppState {
  configs: ScrapingConfig[];
  pipelines: Record<string, PipelinePersist>;
  documents: StoredDocument[];
  /** Last successful scrape snapshot per config (for diff node baseline) */
  lastSnapshots: Record<string, string>;
  schedules: ScheduleRegistration[];
}

export const EMPTY_PIPELINE: PipelinePersist = {
  nodes: [],
  edges: [],
};

export function createSeedState(): AppState {
  const cfg1: ScrapingConfig = {
    id: "cfg-seed-1",
    country: "US",
    target_url: "https://example.com",
    archetype: "static",
    cron: "0 9 * * *",
    status: "Active",
  };
  const cfg2: ScrapingConfig = {
    id: "cfg-seed-2",
    country: "DE",
    target_url: "https://httpbin.org/html",
    archetype: "spa",
    cron: "*/15 * * * *",
    status: "Paused",
  };

  const samplePipeline: PipelinePersist = {
    nodes: [
      {
        id: "n-http",
        type: "http",
        position: { x: 40, y: 80 },
        data: {
          config: {
            method: "GET",
            url: "{{target_url}}",
            headers: {},
          },
        },
      },
      {
        id: "n-extract",
        type: "extract",
        position: { x: 280, y: 80 },
        data: {
          config: {
            selector: "h1",
            attribute: "text",
          },
        },
      },
      {
        id: "n-transform",
        type: "transform",
        position: { x: 520, y: 80 },
        data: {
          config: {
            operation: "trim",
            parameters: {},
          },
        },
      },
      {
        id: "n-diff",
        type: "diff",
        position: { x: 760, y: 80 },
        data: {
          config: { strategy: "text" },
        },
      },
      {
        id: "n-storage",
        type: "storage",
        position: { x: 1000, y: 80 },
        data: {
          config: {
            container: "scrapes",
            format: "text",
          },
        },
      },
    ],
    edges: [
      { id: "e1", source: "n-http", target: "n-extract" },
      { id: "e2", source: "n-extract", target: "n-transform" },
      { id: "e3", source: "n-transform", target: "n-diff" },
      { id: "e4", source: "n-diff", target: "n-storage" },
    ],
  };

  return {
    configs: [cfg1, cfg2],
    pipelines: {
      [cfg1.id]: samplePipeline,
      [cfg2.id]: { nodes: [], edges: [] },
    },
    documents: [],
    lastSnapshots: {},
    schedules: [
      {
        configId: cfg1.id,
        cron: cfg1.cron,
        updatedAt: new Date().toISOString(),
      },
      {
        configId: cfg2.id,
        cron: cfg2.cron,
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}
