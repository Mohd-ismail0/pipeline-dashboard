"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardTable } from "@/components/DashboardTable";
import { DiffDrawer } from "@/components/DiffDrawer";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { PipelineBuilder } from "@/components/PipelineBuilder";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PipelineRunLog, ScrapingConfig } from "@/types/config";
import type { PipelinePersist } from "@/types/pipeline";
import { FileStack } from "lucide-react";

export default function DashboardPage() {
  const [configs, setConfigs] = useState<ScrapingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelinePersist>(() => ({
    nodes: [],
    edges: [],
  }));
  const [tab, setTab] = useState<"configs" | "pipeline">("configs");
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffId, setDiffId] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [metrics, setMetrics] = useState<{
    totalCronRuns: number;
    cronSuccess: number;
    cronFailed: number;
    manualRuns: number;
    lastRunAt: string | null;
  }>({
    totalCronRuns: 0,
    cronSuccess: 0,
    cronFailed: 0,
    manualRuns: 0,
    lastRunAt: null,
  });
  const [recentRuns, setRecentRuns] = useState<PipelineRunLog[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunEvents, setSelectedRunEvents] = useState<
    { seq: number; type: string; nodeId: string | null; createdAt: string }[]
  >([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/configs");
      const j = (await res.json()) as { configs: ScrapingConfig[] };
      setConfigs(j.configs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/config/${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const j = (await res.json()) as { pipeline: PipelinePersist };
    setPipeline(j.pipeline ?? { nodes: [], edges: [] });
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadConfigs();
    })();
  }, [loadConfigs]);

  const refreshObservability = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    const [mRes, rRes] = await Promise.all([
      fetch("/api/metrics"),
      fetch("/api/runs?limit=8"),
    ]);
    if (mRes.ok) {
      setMetrics(
        (await mRes.json()) as {
          totalCronRuns: number;
          cronSuccess: number;
          cronFailed: number;
          manualRuns: number;
          lastRunAt: string | null;
        },
      );
    }
    if (rRes.ok) {
      const data = (await rRes.json()) as { runs: PipelineRunLog[] };
      setRecentRuns(data.runs ?? []);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await refreshObservability();
    })();
    const id = setInterval(() => {
      void refreshObservability();
    }, 4000);
    return () => clearInterval(id);
  }, [refreshObservability]);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      if (!selectedId) {
        setPipeline({ nodes: [], edges: [] });
        return;
      }
      await loadDetail(selectedId);
    })();
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }
    void fetch(`/api/runs/${encodeURIComponent(selectedRunId)}`)
      .then((r) => r.json())
      .then((d: { events?: { seq: number; type: string; nodeId: string | null; createdAt: string }[] }) =>
        setSelectedRunEvents(d.events ?? []),
      )
      .catch(() => setSelectedRunEvents([]));
  }, [selectedRunId]);

  const savePipeline = useCallback(
    async (p: PipelinePersist) => {
      if (!selectedId) return;
      try {
        const res = await fetch(`/api/config/${encodeURIComponent(selectedId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipeline: p }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed with status ${res.status}`);
        }
        setSaveError(null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Save failed");
        throw error;
      }
    },
    [selectedId],
  );

  const onAddRow = useCallback(async () => {
    await fetch("/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: "New",
        target_url: "https://example.com",
        archetype: "static",
        cron: "0 * * * *",
        status: "Active",
      }),
    });
    await loadConfigs();
  }, [loadConfigs]);

  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              Scraping Pipeline Builder
            </h1>
            <p className="text-muted-foreground text-xs">
              Configs, pipelines, and mock Azure-backed execution.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!selectedId}
              onClick={() => setDocsOpen(true)}
            >
              <FileStack className="mr-1.5 size-3.5" />
              Documents
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 p-4">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <TabsList className="h-8 w-fit">
            <TabsTrigger value="configs" className="text-xs">
              Configurations
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              disabled={!selectedId}
              className="text-xs"
            >
              Pipeline
            </TabsTrigger>
          </TabsList>
          <Separator />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Card className="py-3">
              <CardHeader className="px-3 pb-1">
                <CardDescription className="text-[10px]">
                  Total cron runs
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pt-0">
                <div className="text-lg font-semibold">{metrics.totalCronRuns}</div>
              </CardContent>
            </Card>
            <Card className="py-3">
              <CardHeader className="px-3 pb-1">
                <CardDescription className="text-[10px]">Cron success</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pt-0">
                <div className="text-lg font-semibold">{metrics.cronSuccess}</div>
              </CardContent>
            </Card>
            <Card className="py-3">
              <CardHeader className="px-3 pb-1">
                <CardDescription className="text-[10px]">Cron failed</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pt-0">
                <div className="text-lg font-semibold">{metrics.cronFailed}</div>
              </CardContent>
            </Card>
            <Card className="py-3">
              <CardHeader className="px-3 pb-1">
                <CardDescription className="text-[10px]">Manual runs</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pt-0">
                <div className="text-lg font-semibold">{metrics.manualRuns}</div>
              </CardContent>
            </Card>
          </div>
          {saveError ? (
            <Card className="border-destructive/40 py-2">
              <CardContent className="px-3 py-1 text-xs text-red-600 dark:text-red-400">
                {saveError}
              </CardContent>
            </Card>
          ) : null}
          <TabsContent value="configs" className="mt-0 min-h-0 flex-1">
            <Card className="flex h-full min-h-[480px] flex-col py-0">
              <CardHeader className="shrink-0 border-b py-3">
                <CardTitle className="text-sm">Entry points</CardTitle>
                <CardDescription className="text-xs">
                  AG Grid · inline edit · debounced PATCH
                </CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <DashboardTable
                  configs={configs}
                  loading={loading}
                  onConfigsChange={setConfigs}
                  onRefresh={loadConfigs}
                  onRowSelected={setSelectedId}
                  onViewPipeline={(id) => {
                    setSelectedId(id);
                    setTab("pipeline");
                  }}
                  onViewDiff={(id) => {
                    setDiffId(id);
                    setDiffOpen(true);
                  }}
                  onAddRow={onAddRow}
                  onRunFinished={() => {
                    void refreshObservability();
                  }}
                />
                <Card className="mt-2 py-0">
                  <CardHeader className="border-b py-2">
                    <CardTitle className="text-xs">Recent runs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 p-2">
                    {recentRuns.length === 0 ? (
                      <p className="text-muted-foreground text-xs">No execution logs yet.</p>
                    ) : (
                      recentRuns.map((run) => (
                        <div
                          key={run.id}
                          className="flex cursor-pointer items-center justify-between rounded border px-2 py-1"
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-[10px]">{run.configId}</div>
                            <div className="text-muted-foreground text-[10px]">
                              {new Date(run.startedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="h-5 text-[10px]">
                              {run.triggerType}
                            </Badge>
                            <Badge
                              variant={run.ok ? "default" : "destructive"}
                              className="h-5 text-[10px]"
                            >
                              {run.ok ? "ok" : "failed"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                    {selectedRunId ? (
                      <div className="mt-2 rounded border p-2">
                        <div className="mb-1 text-[11px] font-semibold">Run timeline</div>
                        <div className="max-h-32 space-y-1 overflow-auto">
                          {selectedRunEvents.length === 0 ? (
                            <p className="text-muted-foreground text-[11px]">No events.</p>
                          ) : (
                            selectedRunEvents.map((e) => (
                              <div key={`${e.seq}-${e.createdAt}`} className="text-[11px]">
                                <span className="font-mono">#{e.seq}</span> {e.type}
                                {e.nodeId ? ` · ${e.nodeId}` : ""} ·{" "}
                                {new Date(e.createdAt).toLocaleTimeString()}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="pipeline" className="mt-0 min-h-0 flex-1">
            <Card className="flex h-full min-h-[520px] flex-col py-0">
              <CardHeader className="shrink-0 border-b py-3">
                <CardTitle className="text-sm">Workflow</CardTitle>
                <CardDescription className="text-xs">
                  React Flow · drag palette onto canvas · click node to configure
                </CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-3">
                {selectedId ? (
                  <PipelineBuilder
                    configId={selectedId}
                    configLabel={
                      configs.find((c) => c.id === selectedId)?.target_url ?? selectedId
                    }
                    initialPipeline={pipeline}
                    onSave={savePipeline}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Select a configuration and open the Pipeline tab.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <DiffDrawer
        configId={diffId}
        open={diffOpen}
        onOpenChange={(o) => {
          setDiffOpen(o);
          if (!o) setDiffId(null);
        }}
      />
      <DocumentsPanel
        configId={selectedId}
        open={docsOpen}
        onOpenChange={setDocsOpen}
      />
    </div>
  );
}
