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

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      if (props.node) {
        const c = { ...(props.node.data?.config ?? {}) };
        setDraft(c);
        setHeadersStr(headersToText(c.headers));
      } else {
        setDraft({});
        setHeadersStr("{}");
      }
    })();
  }, [props.node]);

  if (!props.node) return null;

  const type = props.node.type as PipelineNodeType;

  const apply = () => {
    let next = { ...draft };
    if (type === "http") {
      try {
        next = { ...next, headers: JSON.parse(headersStr || "{}") as Record<string, string> };
      } catch {
        next = { ...next, headers: {} };
      }
    }
    props.onApply(props.node!.id, next);
    props.onOpenChange(false);
  };

  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle className="font-mono text-sm">
            {type.toUpperCase()}
          </DrawerTitle>
          <DrawerDescription>Node {props.node.id}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {type === "http" ? (
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
              </div>
              <div className="grid gap-2">
                <Label>Headers (JSON)</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  value={headersStr}
                  onChange={(e) => setHeadersStr(e.target.value)}
                />
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
          <Button type="button" size="sm" className="h-8" onClick={apply}>
            Apply
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
