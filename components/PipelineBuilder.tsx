"use client";

import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NodeConfigDrawer } from "@/components/NodeConfigDrawer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { defaultConfigForHandlerId } from "@/lib/defaultNodeConfig";
import type { PipelinePersist } from "@/types/pipeline";

function newId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `n-${Math.random().toString(36).slice(2, 10)}`;
}

type RFNode = Node<
  {
    config: Record<string, unknown>;
    handlerId?: string;
    handlerVersion?: string;
    label?: string;
  },
  string
>;
const PIPELINE_NODE_TYPE = "pipeline_node";
const NODE_TYPES: Record<string, typeof PipelineNodeCard> = {
  [PIPELINE_NODE_TYPE]: PipelineNodeCard,
};

function PipelineNodeCard(props: NodeProps<RFNode>) {
  const handler = String(
    (typeof props.data?.handlerId === "string" && props.data.handlerId) || "node",
  ).toUpperCase();
  const label =
    typeof props.data?.label === "string" && props.data.label.trim().length > 0
      ? props.data.label
      : handler;
  return (
    <div className="bg-card text-card-foreground rounded-md border px-2 py-1.5 text-xs shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-border !bg-muted"
      />
      <div className="text-foreground max-w-[160px] truncate text-[11px] font-semibold">
        {label}
      </div>
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wide">
        {handler}
      </div>
      <div className="text-muted-foreground mt-0.5 text-[9px]">
        click node to edit
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-border !bg-muted"
      />
    </div>
  );
}

const FALLBACK_HANDLERS = ["http", "extract", "transform", "diff", "storage"] as const;

function BuilderInner(props: {
  configId: string;
  configLabel: string;
  initialPipeline: PipelinePersist;
  onSave: (p: PipelinePersist) => Promise<void>;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selected, setSelected] = useState<RFNode | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [palette, setPalette] = useState<{ id: string; label: string }[]>(() =>
    FALLBACK_HANDLERS.map((id) => ({ id, label: id })),
  );
  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rfInstance = useRef<ReactFlowInstance<RFNode, Edge> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const validationErrorsRef = useRef<string[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    void fetch("/api/node-catalog")
      .then((r) => r.json() as Promise<{ entries: { handlerId: string; displayName: string }[] }>)
      .then((d) => {
        if (Array.isArray(d.entries) && d.entries.length > 0) {
          setPalette(
            d.entries.map((e) => ({ id: e.handlerId, label: e.displayName ?? e.handlerId })),
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    skipNextSave.current = true;
    setNodes(
      props.initialPipeline.nodes.map((n) => {
        const handlerId = (typeof n.data?.handlerId === "string" && n.data.handlerId) || n.type;
        return {
          ...(n as RFNode),
          type: PIPELINE_NODE_TYPE,
          data: {
            ...n.data,
            handlerId,
            label:
              typeof n.data?.label === "string" ? n.data.label : handlerId.replaceAll("_", " "),
          },
        };
      }),
    );
    setEdges(props.initialPipeline.edges);
    const t = requestAnimationFrame(() => {
      skipNextSave.current = false;
    });
    return () => cancelAnimationFrame(t);
  }, [props.configId, props.initialPipeline, setEdges, setNodes]);

  const flushSave = useCallback(async () => {
    setSaveState("saving");
    try {
      await props.onSave({
        nodes: nodesRef.current.map((n) => ({
          ...n,
          type:
            (typeof n.data?.handlerId === "string" && n.data.handlerId) ||
            (n.type as string),
        })) as PipelinePersist["nodes"],
        edges: edgesRef.current,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [props]);

  const scheduleSave = useCallback(() => {
    if (skipNextSave.current) return;
    if (validationErrorsRef.current.length > 0) {
      setSaveState("error");
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void flushSave();
    }, 500);
  }, [flushSave]);

  const wrappedOnNodesChange: OnNodesChange<RFNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
      scheduleSave();
    },
    [onNodesChange, scheduleSave],
  );

  const wrappedOnEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      scheduleSave();
    },
    [onEdgesChange, scheduleSave],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      scheduleSave();
    },
    [scheduleSave, setEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const handlerId = e.dataTransfer.getData("application/reactflow");
      if (!palette.some((p) => p.id === handlerId)) return;
      const position =
        rfInstance.current?.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        }) ?? { x: 0, y: 0 };
      const id = `${handlerId}-${newId().slice(0, 8)}`;
      const node: RFNode = {
        id,
        type: PIPELINE_NODE_TYPE,
        position,
        data: {
          config: defaultConfigForHandlerId(handlerId),
          handlerId,
          handlerVersion: "1.0.0",
          label: handlerId.replaceAll("_", " "),
        },
      };
      setNodes((nds) => [...nds, node]);
      scheduleSave();
    },
    [palette, scheduleSave, setNodes],
  );

  const onDragStart = (event: React.DragEvent, type: string) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedEdgeId(null);
      setSelected(node as RFNode);
      setDrawerOpen(true);
    },
    [],
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelected(null);
    setDrawerOpen(false);
    setSelectedEdgeId(edge.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelected(null);
    setSelectedEdgeId(null);
    setDrawerOpen(false);
  }, []);

  const onApplyConfig = useCallback(
    (
      nodeId: string,
      patch: {
        config: Record<string, unknown>;
        handlerId: string;
        handlerVersion?: string;
        label?: string;
        nodeType: string;
      },
    ) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                type: PIPELINE_NODE_TYPE,
                data: {
                  ...n.data,
                  config: patch.config,
                  handlerId: patch.handlerId,
                  handlerVersion: patch.handlerVersion ?? "1.0.0",
                  label: patch.label ?? n.data?.label ?? patch.handlerId,
                },
              }
            : n,
        ),
      );
      scheduleSave();
    },
    [scheduleSave, setNodes],
  );

  const addNodeFromPalette = useCallback(
    (handlerId: string) => {
      const count = nodesRef.current.length;
      const node: RFNode = {
        id: `${handlerId}-${newId().slice(0, 8)}`,
        type: PIPELINE_NODE_TYPE,
        position: { x: 80 + (count % 3) * 230, y: 60 + Math.floor(count / 3) * 120 },
        data: {
          config: defaultConfigForHandlerId(handlerId),
          handlerId,
          handlerVersion: "1.0.0",
          label: handlerId.replaceAll("_", " "),
        },
      };
      setNodes((nds) => [...nds, node]);
      setSelected(node);
      setDrawerOpen(true);
      scheduleSave();
    },
    [scheduleSave, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selected?.id === nodeId) {
        setSelected(null);
        setDrawerOpen(false);
      }
      scheduleSave();
    },
    [scheduleSave, selected?.id, setEdges, setNodes],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const src = nodesRef.current.find((n) => n.id === nodeId);
      if (!src) return;
      const baseId =
        (typeof src.data?.handlerId === "string" && src.data.handlerId) || "node";
      const next: RFNode = {
        ...src,
        id: `${baseId}-${newId().slice(0, 8)}`,
        position: { x: src.position.x + 48, y: src.position.y + 48 },
        data: {
          ...src.data,
          label: `${src.data?.label ?? src.data?.handlerId ?? "node"} copy`,
        },
      };
      setNodes((nds) => [...nds, next]);
      setSelected(next);
      setDrawerOpen(true);
      scheduleSave();
    },
    [scheduleSave, setNodes],
  );

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    scheduleSave();
  }, [scheduleSave, selectedEdgeId, setEdges]);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (nodes.length === 0) {
      errs.push("Pipeline has no nodes.");
    }
    const inCount = new Map<string, number>();
    for (const n of nodes) inCount.set(n.id, 0);
    for (const e of edges) {
      inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1);
    }
    const roots = nodes.filter((n) => (inCount.get(n.id) ?? 0) === 0);
    if (roots.length === 0 && nodes.length > 0) {
      errs.push("Pipeline has no root node (cycle suspected).");
    }
    for (const n of nodes) {
      const cfg = n.data?.config ?? {};
      const kind = (typeof n.data?.handlerId === "string" && n.data.handlerId) || n.type;
      if ((kind === "http" || kind === "external_api_scrape") && !String(cfg.url ?? "").trim()) {
        errs.push(`${kind} node ${n.id} requires URL.`);
      }
      if (kind === "extract" && !String(cfg.selector ?? "").trim()) {
        errs.push(`Extract node ${n.id} requires selector.`);
      }
      if (kind === "storage" && !String(cfg.container ?? "").trim()) {
        errs.push(`Storage node ${n.id} requires container.`);
      }
    }
    return errs;
  }, [edges, nodes]);

  const validatePipeline = useCallback(() => validationErrors.length === 0, [validationErrors]);
  useEffect(() => {
    validationErrorsRef.current = validationErrors;
  }, [validationErrors]);

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-muted-foreground text-xs">
          Config: <span className="font-mono">{props.configId}</span> ·{" "}
          <span className="font-medium">{props.configLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[11px]">
            {saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save failed"
                  : "Autosave"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              if (!validatePipeline()) return;
              void flushSave();
            }}
          >
            Save now
          </Button>
        </div>
      </div>
      {validationErrors.length > 0 ? (
        <Alert variant="destructive" className="mb-2">
          <AlertTitle>Pipeline validation</AlertTitle>
          <AlertDescription className="space-y-1">
            {validationErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex h-[min(560px,calc(100vh-220px))] min-h-[420px] gap-2">
        <Card className="flex w-40 shrink-0 flex-col gap-1 p-2">
          <p className="text-muted-foreground px-1 text-[10px] font-medium tracking-wide uppercase">
            Nodes
          </p>
          <Separator />
          {palette.map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_auto] gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start font-mono text-[11px]"
                draggable
                onDragStart={(e) => onDragStart(e, t.id)}
                title={t.label}
              >
                {t.id}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => addNodeFromPalette(t.id)}
                title={`Add ${t.label}`}
              >
                +
              </Button>
            </div>
          ))}
        </Card>
        <div className="relative min-h-0 min-w-0 flex-1 rounded-md border bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={(inst) => {
              rfInstance.current = inst;
            }}
            onNodesChange={wrappedOnNodesChange}
            onEdgesChange={wrappedOnEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPES}
            fitView
          >
            <Background gap={16} size={1} />
            <Controls className="!m-2" />
            <MiniMap zoomable pannable className="!bg-card" />
            <Panel position="top-right" className="text-muted-foreground text-[10px]">
              <div className="flex flex-col items-end gap-1">
                <span>Drag or click + to add nodes</span>
                {selectedEdgeId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={deleteSelectedEdge}
                  >
                    Delete selected connection
                  </Button>
                ) : null}
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
      <NodeConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        node={selected}
        availableHandlers={palette}
        onApply={onApplyConfig}
        onDuplicateNode={duplicateNode}
        onDeleteNode={deleteNode}
      />
    </>
  );
}

export function PipelineBuilder(props: {
  configId: string;
  configLabel: string;
  initialPipeline: PipelinePersist;
  onSave: (p: PipelinePersist) => Promise<void>;
}) {
  return (
    <ReactFlowProvider>
      <BuilderInner
        key={props.configId}
        configId={props.configId}
        configLabel={props.configLabel}
        initialPipeline={props.initialPipeline}
        onSave={props.onSave}
      />
    </ReactFlowProvider>
  );
}
