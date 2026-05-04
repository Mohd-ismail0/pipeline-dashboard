"use client";

import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
  type ValueFormatterParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ScrapingConfig } from "@/types/config";
import { MoreHorizontal, Play, Trash2, Workflow, GitCompare } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

type ActionsParams = ICellRendererParams<ScrapingConfig, unknown> & {
  onRun: (id: string) => void;
  onViewPipeline: (id: string) => void;
  onViewDiff: (id: string) => void;
  onDelete: (id: string) => void;
  busyId: string | null;
};

function StatusCell(props: ICellRendererParams<ScrapingConfig>) {
  const v = props.value as ScrapingConfig["status"];
  const variant =
    v === "Active" ? "default" : v === "Paused" ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="h-6 px-2 text-[11px] font-medium">
      {v}
    </Badge>
  );
}

function ActionsCell(props: ActionsParams) {
  const id = props.data?.id;
  if (!id) return null;
  const busy = props.busyId === id;
  return (
    <div className="flex h-full items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            disabled={busy}
            onClick={() => props.onRun(id)}
          >
            <Play className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Run now</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            onClick={() => props.onViewPipeline(id)}
          >
            <Workflow className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View pipeline</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            onClick={() => props.onViewDiff(id)}
          >
            <GitCompare className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View diff</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => props.onDelete(id)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function DashboardTable(props: {
  configs: ScrapingConfig[];
  loading: boolean;
  onConfigsChange: (rows: ScrapingConfig[]) => void;
  onRefresh: () => Promise<void>;
  onRunNow: (id: string) => Promise<void>;
  onViewPipeline: (id: string) => void;
  onViewDiff: (id: string) => void;
  onAddRow: () => Promise<void>;
}) {
  const [gridError, setGridError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flushPatch = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const res = await fetch(`/api/config/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const data = (await res.json()) as { config: ScrapingConfig };
      props.onConfigsChange(
        props.configs.map((c) => (c.id === id ? data.config : c)),
      );
    },
    [props],
  );

  const schedulePatch = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const prev = timers.current.get(id);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        timers.current.delete(id);
        void flushPatch(id, patch).catch((e: unknown) => {
          setGridError(e instanceof Error ? e.message : "Save failed");
          void props.onRefresh();
        });
      }, 500);
      timers.current.set(id, t);
    },
    [flushPatch, props],
  );

  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  const onRun = useCallback(
    async (id: string) => {
      setBusyId(id);
      setGridError(null);
      try {
        const res = await fetch(`/api/run/${encodeURIComponent(id)}`, {
          method: "POST",
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? res.statusText);
        }
        await props.onRefresh();
      } catch (e: unknown) {
        setGridError(e instanceof Error ? e.message : "Run failed");
      } finally {
        setBusyId(null);
      }
    },
    [props],
  );

  const onDelete = useCallback(
    async (id: string) => {
      setBusyId(id);
      setGridError(null);
      try {
        const res = await fetch(`/api/config/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        await props.onRefresh();
      } catch (e: unknown) {
        setGridError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setBusyId(null);
      }
    },
    [props],
  );

  const columnDefs = useMemo<ColDef<ScrapingConfig>[]>(
    () => [
      { field: "id", hide: true },
      {
        field: "country",
        headerName: "Country",
        editable: true,
        minWidth: 100,
        flex: 0.8,
      },
      {
        field: "target_url",
        headerName: "Target URL",
        editable: true,
        minWidth: 220,
        flex: 2,
      },
      {
        field: "archetype",
        headerName: "Archetype",
        editable: true,
        minWidth: 130,
        flex: 1,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["static", "spa", "shadow_dom"],
        },
      },
      {
        field: "cron",
        headerName: "Cron",
        editable: true,
        minWidth: 140,
        flex: 1,
        valueFormatter: (p: ValueFormatterParams<ScrapingConfig>) =>
          String(p.value ?? ""),
        cellClass: "font-mono text-xs",
      },
      {
        field: "status",
        headerName: "Status",
        editable: true,
        minWidth: 110,
        flex: 0.9,
        cellRenderer: StatusCell,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["Active", "Paused", "Error"],
        },
      },
      {
        colId: "actions",
        headerName: "",
        width: 168,
        pinned: "right",
        sortable: false,
        filter: false,
        editable: false,
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onRun: onRun,
          onViewPipeline: props.onViewPipeline,
          onViewDiff: props.onViewDiff,
          onDelete: onDelete,
          busyId,
        },
      },
    ],
    [busyId, onDelete, onRun, props.onViewDiff, props.onViewPipeline],
  );

  const defaultColDef = useMemo<ColDef<ScrapingConfig>>(
    () => ({
      sortable: true,
      resizable: true,
      suppressHeaderMenuButton: true,
      cellStyle: { lineHeight: "32px" },
    }),
    [],
  );

  if (props.loading && props.configs.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[420px] flex-col gap-2">
      {gridError ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{gridError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <p className="text-muted-foreground text-xs">
          Inline edits auto-save after 500ms. Cron is validated server-side.
        </p>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onClick={() => void props.onAddRow()}
        >
          Add row
        </Button>
      </div>
      <div className="ag-theme-quartz min-h-0 flex-1 rounded-md border">
        <AgGridReact<ScrapingConfig>
          rowData={props.configs}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.id}
          singleClickEdit
          stopEditingWhenCellsLoseFocus
          suppressRowClickSelection
          headerHeight={36}
          rowHeight={36}
          onCellValueChanged={(ev) => {
            if (!ev.data || !ev.colDef.field) return;
            const id = ev.data.id;
            const field = ev.colDef.field as keyof ScrapingConfig;
            if (field === "id") return;
            const nextVal = ev.newValue;
            schedulePatch(id, { [field]: nextVal });
          }}
        />
      </div>
    </div>
  );
}
