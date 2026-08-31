-- Support paginated company history and company/motoboy relationship queries.
CREATE INDEX "deliveries_company_id_status_created_at_idx"
ON "deliveries"("companyId", "status", "createdAt");

CREATE INDEX "deliveries_company_id_motoboy_id_created_at_idx"
ON "deliveries"("companyId", "motoboyId", "createdAt");
