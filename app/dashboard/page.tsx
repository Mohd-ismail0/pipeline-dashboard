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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScrapingConfig } from "@/types/config";
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

  const savePipeline = useCallback(
    async (p: PipelinePersist) => {
      if (!selectedId) return;
      await fetch(`/api/config/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline: p }),
      });
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
                />
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
