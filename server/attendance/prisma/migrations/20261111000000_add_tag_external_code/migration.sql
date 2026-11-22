ALTER TABLE "tags" ADD COLUMN "external_code" VARCHAR(100);

CREATE UNIQUE INDEX "tags_external_code_key" ON "tags"("external_code");
