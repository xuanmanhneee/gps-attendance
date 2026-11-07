DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    CREATE TABLE "audit_logs" (
        "id" BIGSERIAL NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id" VARCHAR(255) NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "actor_id" INTEGER,
        "reason" VARCHAR(500),
        "old_value" JSONB,
        "new_value" JSONB,
        "metadata" JSONB,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx"
    ON "audit_logs"("entity_type", "entity_id", "created_at");

    CREATE INDEX "audit_logs_actor_id_created_at_idx"
    ON "audit_logs"("actor_id", "created_at");
  END IF;
END $$;
