-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "config_id" TEXT NOT NULL,
    "nodes_edges" JSONB NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "config_id" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blob_path" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LastSnapshot" (
    "config_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "LastSnapshot_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "ordered_node_ids" JSONB NOT NULL,
    "node_results" JSONB NOT NULL,
    "document_id" TEXT,
    "pipeline_snapshot" JSONB,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunEvent" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "node_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeCatalog" (
    "id" TEXT NOT NULL,
    "handler_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "input_schema" JSONB NOT NULL,
    "output_schema" JSONB,
    "runtime" TEXT NOT NULL,
    "azure_target" JSONB,
    "capabilities" JSONB,

    CONSTRAINT "NodeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_config_id_idx" ON "Document"("config_id");

-- CreateIndex
CREATE INDEX "Run_config_id_started_at_idx" ON "Run"("config_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "RunEvent_run_id_idx" ON "RunEvent"("run_id");

-- CreateIndex
CREATE INDEX "NodeCatalog_handler_id_idx" ON "NodeCatalog"("handler_id");

-- CreateIndex
CREATE UNIQUE INDEX "RunEvent_run_id_seq_key" ON "RunEvent"("run_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "NodeCatalog_handler_id_version_key" ON "NodeCatalog"("handler_id", "version");

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunEvent" ADD CONSTRAINT "RunEvent_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
