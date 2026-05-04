"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { PipelineRunLog } from "@/types/config";

const ReactDiffViewer = dynamic(
  () =>
    import("react-diff-viewer-continued").then((m) => m.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[min(480px,70vh)] w-full rounded-md" />,
  },
);

export function DiffDrawer(props: {
  configId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [previous, setPrevious] = useState("");
  const [current, setCurrent] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [runs, setRuns] = useState<PipelineRunLog[]>([]);

  useEffect(() => {
    if (!props.open || !props.configId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/diff/${encodeURIComponent(props.configId!)}`,
        );
        const j = (await res.json()) as { previous?: string; current?: string; error?: string };
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        if (!cancelled) {
          setPrevious(j.previous ?? "");
          setCurrent(j.current ?? "");
          setRuns((j as { runs?: PipelineRunLog[] }).runs ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load diff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.configId]);

  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:max-w-[min(960px,96vw)]">
        <DrawerHeader>
          <DrawerTitle>Diff</DrawerTitle>
          <DrawerDescription>
            Previous vs current stored output
            {props.configId ? (
              <span className="text-muted-foreground font-mono">
                {" "}
                · {props.configId}
              </span>
            ) : null}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pb-6">
          {runs.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Comparing run {runs[1]?.id?.slice(0, 8) ?? "n/a"} to {runs[0]?.id?.slice(0, 8) ?? "n/a"}
            </p>
          ) : null}
          {err ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <Skeleton className="h-[min(480px,70vh)] w-full rounded-md" />
          ) : (
            <div className="min-h-[min(480px,70vh)] overflow-auto rounded-md border">
              <ReactDiffViewer
                oldValue={previous}
                newValue={current}
                splitView
                useDarkTheme={false}
                leftTitle="Previous"
                rightTitle="Current"
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
