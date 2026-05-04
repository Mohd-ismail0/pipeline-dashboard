import type { NodeCatalogEntry } from "@/types/nodeCatalog";

export const BUILT_IN_NODE_CATALOG: NodeCatalogEntry[] = [
  {
    handlerId: "http",
    version: "1.0.0",
    displayName: "HTTP fetch",
    category: "network",
    runtime: "inline_activity",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["GET", "POST"] },
        url: { type: "string" },
        headers: { type: "object" },
      },
      required: ["url"],
    },
    capabilities: { maxDurationSec: 120 },
  },
  {
    handlerId: "extract",
    version: "1.0.0",
    displayName: "CSS extract",
    category: "parse",
    runtime: "inline_activity",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        attribute: { type: "string" },
      },
      required: ["selector"],
    },
    capabilities: { maxDurationSec: 30 },
  },
  {
    handlerId: "transform",
    version: "1.0.0",
    displayName: "Transform",
    category: "transform",
    runtime: "inline_activity",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string" },
        parameters: { type: "object" },
      },
      required: ["operation"],
    },
    capabilities: { maxDurationSec: 30 },
  },
  {
    handlerId: "diff",
    version: "1.0.0",
    displayName: "Diff vs baseline",
    category: "storage",
    runtime: "inline_activity",
    inputSchema: {
      type: "object",
      properties: { strategy: { type: "string", enum: ["text", "json"] } },
    },
    capabilities: { maxDurationSec: 60 },
  },
  {
    handlerId: "storage",
    version: "1.0.0",
    displayName: "Store document",
    category: "storage",
    runtime: "inline_activity",
    inputSchema: {
      type: "object",
      properties: {
        container: { type: "string" },
        format: { type: "string", enum: ["text", "json"] },
      },
      required: ["container"],
    },
    capabilities: { maxDurationSec: 60 },
  },
  {
    handlerId: "python_scrape",
    version: "1.0.0",
    displayName: "Python scrape (Azure worker)",
    category: "scrape",
    runtime: "azure_function",
    inputSchema: {
      type: "object",
      properties: {
        entrypoint: { type: "string", description: "Module:function in worker" },
        args: { type: "object" },
      },
    },
    azureTarget: { functionName: "PythonScrapeActivity", resourceGroup: "${RG}" },
    capabilities: { needsBrowser: false, maxDurationSec: 900 },
  },
  {
    handlerId: "browser_scrape",
    version: "1.0.0",
    displayName: "Browser scrape (Container Apps)",
    category: "scrape",
    runtime: "container_job",
    inputSchema: {
      type: "object",
      properties: {
        urlTemplate: { type: "string" },
        waitUntil: { type: "string" },
      },
    },
    azureTarget: { jobName: "playwright-scrape", image: "${ACR}/scrape:latest" },
    capabilities: { needsBrowser: true, maxDurationSec: 1800 },
  },
  {
    handlerId: "js_script",
    version: "1.0.0",
    displayName: "JS transform (sandbox)",
    category: "transform",
    runtime: "inline_activity",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["stub", "eval_upstream"] },
        expression: { type: "string" },
      },
    },
    capabilities: { maxDurationSec: 10 },
  },
  {
    handlerId: "external_api_scrape",
    version: "1.0.0",
    displayName: "External scraping API",
    category: "network",
    runtime: "external_http",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string" },
        url: { type: "string" },
        headers: { type: "object" },
      },
      required: ["url"],
    },
    capabilities: { maxDurationSec: 300 },
  },
];
