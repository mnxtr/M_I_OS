-- Frozen pre-factory baseline. Do not regenerate from future ORM models.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE doc_status AS ENUM ('processing', 'ready', 'failed');

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'compliance_manager', 'production_manager', 'operator');

CREATE TABLE assessment_items (
	id UUID NOT NULL,
	assessment_id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	ref VARCHAR(30) NOT NULL,
	category VARCHAR(80) NOT NULL,
	title TEXT NOT NULL,
	guidance TEXT NOT NULL,
	status VARCHAR(20) NOT NULL,
	manually_set BOOLEAN NOT NULL,
	evidence JSONB NOT NULL,
	ai_notes TEXT NOT NULL,
	cap_text TEXT NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_assessment_items_assessment_id ON assessment_items (assessment_id);

CREATE INDEX ix_assessment_items_tenant_id ON assessment_items (tenant_id);

CREATE TABLE assessments (
	id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	template_code VARCHAR(100) NOT NULL,
	title VARCHAR(300) NOT NULL,
	due_date VARCHAR(20) NOT NULL,
	status VARCHAR(20) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_assessments_tenant_id ON assessments (tenant_id);

CREATE INDEX ix_assessments_tenant_created ON assessments (tenant_id, created_at);

CREATE TABLE checklist_templates (
	id UUID NOT NULL,
	code VARCHAR(100) NOT NULL,
	name VARCHAR(200) NOT NULL,
	version INTEGER NOT NULL,
	description TEXT NOT NULL,
	items JSONB NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_checklist_templates_code ON checklist_templates (code);

CREATE TABLE chunks (
	id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	document_id UUID NOT NULL,
	chunk_index INTEGER NOT NULL,
	page INTEGER NOT NULL,
	content TEXT NOT NULL,
	embedding_dim INTEGER NOT NULL,
	meta JSONB NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_chunks_tenant_id ON chunks (tenant_id);

CREATE INDEX ix_chunks_document_id ON chunks (document_id);

CREATE TABLE documents (
	id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	uploaded_by UUID,
	filename VARCHAR(500) NOT NULL,
	doc_type VARCHAR(50) NOT NULL,
	department VARCHAR(100) NOT NULL,
	language VARCHAR(10) NOT NULL,
	status doc_status NOT NULL,
	page_count INTEGER NOT NULL,
	storage_path VARCHAR(1000) NOT NULL,
	error TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_documents_tenant_created ON documents (tenant_id, created_at);

CREATE INDEX ix_documents_tenant_id ON documents (tenant_id);

CREATE TABLE guest_tokens (
	token VARCHAR(64) NOT NULL,
	tenant_id UUID NOT NULL,
	label VARCHAR(200) NOT NULL,
	scope_all_documents BOOLEAN NOT NULL,
	document_ids JSONB NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	created_by UUID,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (token)
);

CREATE INDEX ix_guest_tokens_tenant_id ON guest_tokens (tenant_id);

CREATE TABLE monthly_usage (
	id SERIAL NOT NULL,
	tenant_id UUID NOT NULL,
	period VARCHAR(7) NOT NULL,
	metric VARCHAR(40) NOT NULL,
	used INTEGER NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_monthly_usage_tenant_id ON monthly_usage (tenant_id);

CREATE UNIQUE INDEX ix_monthly_usage_tenant_metric ON monthly_usage (tenant_id, period, metric);

CREATE TABLE payments (
	id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	provider VARCHAR(20) NOT NULL,
	invoice_no VARCHAR(40) NOT NULL,
	plan VARCHAR(30) NOT NULL,
	months INTEGER NOT NULL,
	amount_bdt FLOAT NOT NULL,
	status VARCHAR(20) NOT NULL,
	bkash_payment_id VARCHAR(100) NOT NULL,
	raw_response JSONB NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	completed_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_payments_invoice_no ON payments (invoice_no);

CREATE INDEX ix_payments_tenant_id ON payments (tenant_id);

CREATE INDEX ix_payments_bkash_payment_id ON payments (bkash_payment_id);

CREATE TABLE table_rows (
	id SERIAL NOT NULL,
	tenant_id UUID NOT NULL,
	table_source_id UUID NOT NULL,
	row_number INTEGER NOT NULL,
	data JSONB NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_table_rows_table_source_id ON table_rows (table_source_id);

CREATE INDEX ix_table_rows_tenant_id ON table_rows (tenant_id);

CREATE INDEX ix_table_rows_source_row ON table_rows (table_source_id, row_number);

CREATE TABLE table_sources (
	id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	document_id UUID,
	name VARCHAR(200) NOT NULL,
	sheet_name VARCHAR(200) NOT NULL,
	columns JSONB NOT NULL,
	row_count INTEGER NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_table_sources_document_id ON table_sources (document_id);

CREATE INDEX ix_table_sources_tenant_id ON table_sources (tenant_id);

CREATE TABLE tenants (
	id UUID NOT NULL,
	name VARCHAR(200) NOT NULL,
	plan VARCHAR(30) NOT NULL,
	connector_secret VARCHAR(64) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_tenants_plan ON tenants (plan);

CREATE TABLE users (
	id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	email VARCHAR(255) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	full_name VARCHAR(200) NOT NULL,
	role user_role NOT NULL,
	is_active BOOLEAN NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(tenant_id) REFERENCES tenants (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE INDEX ix_users_tenant_id ON users (tenant_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON chunks USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE table_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON table_sources USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE table_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON table_rows USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON assessments USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE assessment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON assessment_items USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE guest_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON guest_tokens USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON monthly_usage USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON payments USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector(384);

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX IF NOT EXISTS ix_chunks_tsv ON chunks USING GIN (content_tsv);

CREATE INDEX IF NOT EXISTS ix_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
