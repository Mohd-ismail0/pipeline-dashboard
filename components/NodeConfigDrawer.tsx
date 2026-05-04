"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PipelineNodeType, PipelineReactFlowNode } from "@/types/pipeline";

function headersToText(h: unknown): string {
  if (typeof h === "string") return h;
  try {
    return JSON.stringify(h ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export function NodeConfigDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  node: PipelineReactFlowNode | null;
  onApply: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [headersStr, setHeadersStr] = useState("{}");
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [argsStr, setArgsStr] = useState("{}");
  const [argsError, setArgsError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      if (props.node) {
        const c = { ...(props.node.data?.config ?? {}) };
        setDraft(c);
        setHeadersStr(headersToText(c.headers));
        setHeadersError(null);
        setArgsStr(JSON.stringify(c.args ?? {}, null, 2));
        setArgsError(null);
      } else {
        setDraft({});
        setHeadersStr("{}");
        setHeadersError(null);
        setArgsStr("{}");
        setArgsError(null);
      }
    })();
  }, [props.node]);

  if (!props.node) return null;

  const effective =
    (typeof props.node.data?.handlerId === "string" && props.node.data.handlerId) ||
    props.node.type;
  const type = effective as PipelineNodeType | string;

  const apply = () => {
    let next = { ...draft };
    if (type === "http" || type === "external_api_scrape") {
      try {
        next = { ...next, headers: JSON.parse(headersStr || "{}") as Record<string, string> };
      } catch {
        setHeadersError("Headers must be valid JSON");
        return;
      }
    }
    props.onApply(props.node!.id, next);
    props.onOpenChange(false);
  };

  const hasRequiredErrors =
    ((type === "http" || type === "external_api_scrape") && !String(draft.url ?? "").trim()) ||
    (type === "extract" && !String(draft.selector ?? "").trim()) ||
    (type === "storage" && !String(draft.container ?? "").trim()) ||
    (type === "python_scrape" && !String(draft.entrypoint ?? "").trim()) ||
    Boolean(headersError) ||
    Boolean(argsError);

  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle className="font-mono text-sm">
            {String(type).toUpperCase()}
          </DrawerTitle>
          <DrawerDescription>Node {props.node.id}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {type === "http" || type === "external_api_scrape" ? (
            <>
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select
                  value={String(draft.method ?? "GET")}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, method: v === "POST" ? "POST" : "GET" }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>URL</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={String(draft.url ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="{{target_url}}"
                />
                <p className="text-muted-foreground text-[11px]">
                  Supports template variable <code>{"{{target_url}}"}</code>.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Headers (JSON)</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  value={headersStr}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHeadersStr(v);
                    try {
                      JSON.parse(v || "{}");
                      setHeadersError(null);
                    } catch {
                      setHeadersError("Headers must be valid JSON");
                    }
                  }}
                />
                {headersError ? (
                  <p className="text-[11px] text-red-600 dark:text-red-400">{headersError}</p>
                ) : null}
              </div>
            </>
          ) : null}

          {type === "extract" ? (
            <>
              <div className="grid gap-2">
                <Label>Selector (CSS)</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={String(draft.selector ?? "")}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, selector: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Attribute</Label>
                <Select
                  value={String(draft.attribute ?? "text")}
                  onValueChange={(v) => setDraft((d) => ({ ...d, attribute: v }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="html">html</SelectItem>
                    <SelectItem value="href">href (attr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          {type === "transform" ? (
            <>
              <div className="grid gap-2">
                <Label>Operation</Label>
                <Select
                  value={String(draft.operation ?? "trim")}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, operation: v, parameters: d.parameters ?? {} }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regex_replace">regex_replace</SelectItem>
                    <SelectItem value="trim">trim</SelectItem>
                    <SelectItem value="lowercase">lowercase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {String(draft.operation) === "regex_replace" ? (
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Pattern (regex)</Label>
                    <Input
                      className="h-8 font-mono text-xs"
                      value={String(
                        (draft.parameters as Record<string, unknown> | undefined)
                          ?.pattern ?? "",
                      )}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          parameters: {
                            ...(typeof d.parameters === "object" && d.parameters
                              ? (d.parameters as Record<string, unknown>)
                              : {}),
                            pattern: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Replacement</Label>
                    <Input
                      className="h-8 font-mono text-xs"
                      value={String(
                        (draft.parameters as Record<string, unknown> | undefined)
                          ?.replacement ?? "",
                      )}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          parameters: {
                            ...(typeof d.parameters === "object" && d.parameters
                              ? (d.parameters as Record<string, unknown>)
                              : {}),
                            replacement: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}
              <p className="text-muted-foreground text-[11px]">
                Use regex replace carefully; invalid patterns fail node execution.
              </p>
            </>
          ) : null}

          {type === "diff" ? (
            <div className="grid gap-2">
              <Label>Strategy</Label>
              <Select
                value={String(draft.strategy ?? "text")}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, strategy: v === "json" ? "json" : "text" }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">text</SelectItem>
                  <SelectItem value="json">json</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {type === "python_scrape" ? (
            <>
              <div className="grid gap-2">
                <Label>Entrypoint</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={String(draft.entrypoint ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, entrypoint: e.target.value }))}
                  placeholder="module:function"
                />
              </div>
              <div className="grid gap-2">
                <Label>Args (JSON)</Label>
                <Textarea
                  className="min-h-[80px] font-mono text-xs"
                  value={argsStr}
                  onChange={(e) => {
                    const v = e.target.value;
                    setArgsStr(v);
                    try {
                      setDraft((d) => ({ ...d, args: JSON.parse(v) as object }));
                      setArgsError(null);
                    } catch {
                      setArgsError("Args must be valid JSON");
                    }
                  }}
                />
                {argsError ? (
                  <p className="text-[11px] text-red-600 dark:text-red-400">{argsError}</p>
                ) : null}
              </div>
            </>
          ) : null}

          {type === "browser_scrape" ? (
            <>
              <div className="grid gap-2">
                <Label>URL template</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={String(draft.urlTemplate ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, urlTemplate: e.target.value }))}
                  placeholder="{{target_url}}"
                />
              </div>
              <div className="grid gap-2">
                <Label>waitUntil</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={String(draft.waitUntil ?? "networkidle")}
                  onChange={(e) => setDraft((d) => ({ ...d, waitUntil: e.target.value }))}
                />
              </div>
            </>
          ) : null}

          {type === "js_script" ? (
            <>
              <div className="grid gap-2">
                <Label>Mode</Label>
                <Select
                  value={String(draft.mode ?? "stub")}
                  onValueChange={(v) => setDraft((d) => ({ ...d, mode: v }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stub">stub</SelectItem>
                    <SelectItem value="eval_upstream">eval_upstream (unsafe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Expression (JS, upstream only)</Label>
                <Textarea
                  className="min-h-[80px] font-mono text-xs"
                  value={String(draft.expression ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, expression: e.target.value }))}
                  placeholder="upstream"
                />
              </div>
            </>
          ) : null}

          {type === "storage" ? (
            <>
              <div className="grid gap-2">
                <Label>Container name</Label>
                <Input
                  className="h-8"
                  value={String(draft.container ?? "")}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, container: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Format</Label>
                <Select
                  value={String(draft.format ?? "text")}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, format: v === "json" ? "json" : "text" }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">json</SelectItem>
                    <SelectItem value="text">text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </div>
        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild>
            <Button type="button" variant="outline" size="sm" className="h-8">
              Cancel
            </Button>
          </DrawerClose>
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={apply}
            disabled={hasRequiredErrors}
          >
            Apply
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
