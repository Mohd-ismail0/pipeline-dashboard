"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

type DocItem = {
  id: string;
  name: string;
  createdAt: string;
  downloadUrl: string;
};

export function DocumentsPanel(props: {
  configId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open || !props.configId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/documents/${encodeURIComponent(props.configId!)}`,
        );
        const j = (await res.json()) as {
          documents?: DocItem[];
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        if (!cancelled) setItems(j.documents ?? []);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
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
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Documents</DrawerTitle>
          <DrawerDescription>
            Mock blob storage for this configuration.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4">
          {err ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No documents yet. Run a pipeline with a storage node.
            </p>
          ) : (
            <ScrollArea className="h-[min(420px,60vh)] pr-3">
              <ul className="flex flex-col gap-1">
                {items.map((d) => (
                  <li key={d.id}>
                    <div className="hover:bg-muted/60 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs">{d.name}</div>
                        <div className="text-muted-foreground text-[10px]">
                          {new Date(d.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <a
                        href={d.downloadUrl}
                        download
                        className={cn(
                          buttonVariants({ variant: "outline", size: "icon-sm" }),
                          "inline-flex h-8 w-8 shrink-0",
                        )}
                        title="Download"
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button type="button" variant="secondary" size="sm" className="h-8">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
