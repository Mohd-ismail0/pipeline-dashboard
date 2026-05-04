import * as cheerio from "cheerio";

import { blobService } from "@/lib/services/blobService";
import type { ScrapingConfig } from "@/types/config";
import type {
  DiffNodeConfig,
  ExtractNodeConfig,
  HttpNodeConfig,
  StorageNodeConfig,
  TransformNodeConfig,
} from "@/types/pipeline";
import type { Node } from "@xyflow/react";

export type PipelineNode = Node<{ config: Record<string, unknown> }, string>;

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function normalizeHeaders(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
    );
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function applyTemplate(url: string, config: ScrapingConfig): string {
  return url.replace(/\{\{\s*target_url\s*\}\}/g, config.target_url);
}

export type HandlerResult =
  | { ok: true; output: unknown }
  | { ok: false; error: string };

export type NodeHandlerContext = {
  config: ScrapingConfig;
  upstream: unknown;
};

async function handleHttp(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  const c = asRecord(node.data?.config) as unknown as HttpNodeConfig;
  const method = c.method === "POST" ? "POST" : "GET";
  const url = applyTemplate(String(c.url ?? ""), ctx.config);
  if (!url) return { ok: false, error: "HTTP node: url is required" };
  try {
    const res = await fetch(url, {
      method,
      headers: normalizeHeaders(c.headers),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true, output: text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "HTTP fetch failed",
    };
  }
}

function handleExtract(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  const c = asRecord(node.data?.config) as unknown as ExtractNodeConfig;
  const selector = String(c.selector ?? "");
  if (!selector) return Promise.resolve({ ok: false, error: "Extract: selector required" });
  const attribute = (c.attribute ?? "text") as ExtractNodeConfig["attribute"];
  try {
    const doc = cheerio.load(String(ctx.upstream ?? ""));
    const el = doc(selector).first();
    let out = "";
    if (attribute === "text") out = el.text();
    else if (attribute === "html") out = el.html() ?? "";
    else out = el.attr(String(attribute)) ?? "";
    return Promise.resolve({ ok: true, output: out });
  } catch (e) {
    return Promise.resolve({
      ok: false,
      error: e instanceof Error ? e.message : "Extract failed",
    });
  }
}

function handleTransform(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  const c = asRecord(node.data?.config) as unknown as TransformNodeConfig;
  const op = c.operation;
  let s = String(ctx.upstream ?? "");
  const params = asRecord(c.parameters);
  try {
    switch (op) {
      case "trim":
        s = s.trim();
        break;
      case "lowercase":
        s = s.toLowerCase();
        break;
      case "regex_replace": {
        const pattern = String(params.pattern ?? "");
        const replacement = String(params.replacement ?? "");
        if (!pattern) return Promise.resolve({ ok: false, error: "regex_replace: pattern required" });
        const re = new RegExp(pattern, "g");
        s = s.replace(re, replacement);
        break;
      }
      default:
        return Promise.resolve({ ok: false, error: `Unknown transform: ${String(op)}` });
    }
    return Promise.resolve({ ok: true, output: s });
  } catch (e) {
    return Promise.resolve({
      ok: false,
      error: e instanceof Error ? e.message : "Transform failed",
    });
  }
}

function formatForDiff(strategy: DiffNodeConfig["strategy"], value: unknown): string {
  if (strategy === "json") {
    try {
      return JSON.stringify(
        typeof value === "string" ? JSON.parse(value) : value,
        null,
        2,
      );
    } catch {
      return String(value ?? "");
    }
  }
  return String(value ?? "");
}

async function handleDiff(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  const c = asRecord(node.data?.config) as unknown as DiffNodeConfig;
  const strategy = c.strategy === "json" ? "json" : "text";
  const current = formatForDiff(strategy, ctx.upstream);
  const baseline = await blobService.getLatestBody(ctx.config.id);
  const previous = baseline ?? "";
  return {
    ok: true,
    output: {
      strategy,
      previous,
      current,
      changed: previous !== current,
    },
  };
}

async function handleStorage(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  const c = asRecord(node.data?.config) as unknown as StorageNodeConfig;
  const container = String(c.container ?? "default");
  const format = c.format === "json" ? "json" : "text";
  let body: string;
  const upstream = ctx.upstream;
  if (format === "json") {
    try {
      body =
        typeof upstream === "string"
          ? JSON.stringify(JSON.parse(upstream), null, 2)
          : JSON.stringify(upstream, null, 2);
    } catch {
      body = JSON.stringify({ value: upstream }, null, 2);
    }
  } else {
    body = typeof upstream === "string" ? upstream : String(upstream ?? "");
  }
  const name = `${container}/${Date.now()}-output.${format === "json" ? "json" : "txt"}`;
  const doc = await blobService.put({
    configId: ctx.config.id,
    name,
    body,
    contentType: format === "json" ? "application/json" : "text/plain",
  });
  return { ok: true, output: { documentId: doc.id, name: doc.name } };
}

/** Placeholder: wire to Azure Python Function or Container Apps job. */
async function handlePythonScrape(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  void ctx;
  void node;
  return {
    ok: true,
    output: {
      _runtime: "python",
      message:
        "Stub node: deploy Azure Function activity or container job and set node catalog azureTarget.",
    },
  };
}

/** Placeholder: Playwright / browser workloads belong on Container Apps. */
async function handleBrowserScrape(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  void ctx;
  void node;
  return {
    ok: true,
    output: {
      _runtime: "browser",
      message: "Stub node: run Playwright workers on Azure Container Apps; route via catalog azureTarget.",
    },
  };
}

/** High-risk: curated scripts only; default stub in dev. */
async function handleJsScript(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  const c = asRecord(node.data?.config);
  const mode = String(c.mode ?? "stub");
  if (mode === "eval_upstream") {
    try {
      const fn = new Function("upstream", "config", `return (${String(c.expression ?? "null")});`);
      const out = fn(ctx.upstream, ctx.config);
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "script error" };
    }
  }
  return {
    ok: true,
    output: {
      _runtime: "js",
      message: "Use mode=eval_upstream with caution; production should use isolated workers.",
    },
  };
}

/** Third-party HTTP scraping APIs (Bright Data, Zyte, etc.) — config holds URL template + headers. */
async function handleExternalApiScrape(
  ctx: NodeHandlerContext,
  node: PipelineNode,
): Promise<HandlerResult> {
  return handleHttp(ctx, node);
}

export const nodeHandlers: Record<
  string,
  (ctx: NodeHandlerContext, node: PipelineNode) => Promise<HandlerResult>
> = {
  http: handleHttp,
  extract: handleExtract,
  transform: handleTransform,
  diff: handleDiff,
  storage: handleStorage,
  python_scrape: handlePythonScrape,
  browser_scrape: handleBrowserScrape,
  js_script: handleJsScript,
  external_api_scrape: handleExternalApiScrape,
};
