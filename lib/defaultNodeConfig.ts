import type { PipelineNodeType } from "@/types/pipeline";

export function defaultConfigForNodeType(
  type: PipelineNodeType,
): Record<string, unknown> {
  switch (type) {
    case "http":
      return { method: "GET", url: "{{target_url}}", headers: {} };
    case "extract":
      return { selector: "body", attribute: "text" };
    case "transform":
      return { operation: "trim", parameters: {} };
    case "diff":
      return { strategy: "text" };
    case "storage":
      return { container: "scrapes", format: "text" };
    default:
      return {};
  }
}
