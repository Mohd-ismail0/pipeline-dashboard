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
import { defaultConfigForNodeType } from "@/lib/defaultNodeConfig";
import type { PipelineNodeType, PipelinePersist } from "@/types/pipeline";

function newId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `n-${Math.random().toString(36).slice(2, 10)}`;
}

type RFNode = Node<{ config: Record<string, unknown> }, PipelineNodeType>;

function PipelineNodeCard(props: NodeProps<RFNode>) {
  const label = props.type?.toUpperCase() ?? "NODE";
  return (
    <div className="bg-card text-card-foreground rounded-md border px-2 py-1.5 text-xs shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-border !bg-muted"
      />
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wide">
        {label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-border !bg-muted"
      />
    </div>
  );
}

const NODE_TYPES: PipelineNodeType[] = [
  "http",
  "extract",
  "transform",
  "diff",
  "storage",
];

function BuilderInner(props: {
  configId: string;
  configLabel: string;
  initialPipeline: PipelinePersist;
  onSave: (p: PipelinePersist) => Promise<void>;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selected, setSelected] = useState<RFNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rfInstance = useRef<ReactFlowInstance<RFNode, Edge> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const nodeTypes = useMemo(
    () => ({
      http: PipelineNodeCard,
      extract: PipelineNodeCard,
      transform: PipelineNodeCard,
      diff: PipelineNodeCard,
      storage: PipelineNodeCard,
    }),
    [],
  );

  useEffect(() => {
    skipNextSave.current = true;
    setNodes(props.initialPipeline.nodes as RFNode[]);
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
        nodes: nodesRef.current as PipelinePersist["nodes"],
        edges: edgesRef.current,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [props]);

  const scheduleSave = useCallback(() => {
    if (skipNextSave.current) return;
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
      const type = e.dataTransfer.getData(
        "application/reactflow",
      ) as PipelineNodeType;
      if (!NODE_TYPES.includes(type)) return;
      const position =
        rfInstance.current?.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        }) ?? { x: 0, y: 0 };
      const id = `${type}-${newId().slice(0, 8)}`;
      const node: RFNode = {
        id,
        type,
        position,
        data: { config: defaultConfigForNodeType(type) },
      };
      setNodes((nds) => [...nds, node]);
      scheduleSave();
    },
    [scheduleSave, setNodes],
  );

  const onDragStart = (event: React.DragEvent, type: PipelineNodeType) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelected(node as RFNode);
      setDrawerOpen(true);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelected(null);
    setDrawerOpen(false);
  }, []);

  const onApplyConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
        ),
      );
      scheduleSave();
    },
    [scheduleSave, setNodes],
  );

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
      if (n.type === "http" && !String(cfg.url ?? "").trim()) {
        errs.push(`HTTP node ${n.id} requires URL.`);
      }
      if (n.type === "extract" && !String(cfg.selector ?? "").trim()) {
        errs.push(`Extract node ${n.id} requires selector.`);
      }
      if (n.type === "storage" && !String(cfg.container ?? "").trim()) {
        errs.push(`Storage node ${n.id} requires container.`);
      }
    }
    return errs;
  }, [edges, nodes]);

  const validatePipeline = useCallback(() => validationErrors.length === 0, [validationErrors]);

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
          {NODE_TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 justify-start font-mono text-[11px]"
              draggable
              onDragStart={(e) => onDragStart(e, t)}
            >
              {t}
            </Button>
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
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background gap={16} size={1} />
            <Controls className="!m-2" />
            <MiniMap zoomable pannable className="!bg-card" />
            <Panel position="top-right" className="text-muted-foreground text-[10px]">
              Drop nodes on canvas
            </Panel>
          </ReactFlow>
        </div>
      </div>
      <NodeConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        node={selected}
        onApply={onApplyConfig}
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
