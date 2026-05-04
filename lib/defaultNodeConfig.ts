import type { PipelineNodeType } from "@/types/pipeline";

const BUILT_IN: Record<string, Record<string, unknown>> = {
  http: { method: "GET", url: "{{target_url}}", headers: {} },
  extract: { selector: "body", attribute: "text" },
  transform: { operation: "trim", parameters: {} },
  diff: { strategy: "text" },
  storage: { container: "scrapes", format: "text" },
  python_scrape: { entrypoint: "scrape:run", args: {} },
  browser_scrape: { urlTemplate: "{{target_url}}", waitUntil: "networkidle" },
  js_script: { mode: "stub", expression: "upstream" },
  external_api_scrape: { method: "GET", url: "{{target_url}}", headers: {} },
};

export function defaultConfigForHandlerId(handlerId: string): Record<string, unknown> {
  return BUILT_IN[handlerId] ? { ...BUILT_IN[handlerId] } : {};
}

/** @deprecated use defaultConfigForHandlerId */
export function defaultConfigForNodeType(
  type: PipelineNodeType | string,
): Record<string, unknown> {
  return defaultConfigForHandlerId(String(type));
}
