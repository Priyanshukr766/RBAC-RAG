-- 1. Create dedicated application role if it does not exist

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rag_app_user') THEN
        CREATE ROLE rag_app_user WITH LOGIN PASSWORD 'rag_app_pass';
    END IF;
END
$$;

-- 2. Grant table and sequence permissions to rag_app_user
GRANT CONNECT ON DATABASE rbac_rag TO rag_app_user;
GRANT USAGE ON SCHEMA public TO rag_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rag_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rag_app_user;

-- 3. Enable and FORCE Row-Level Security on document_chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;

-- 4. Drop existing policies if re-running migration
DROP POLICY IF EXISTS chunk_rbac_select_policy ON document_chunks;
DROP POLICY IF EXISTS chunk_rbac_insert_policy ON document_chunks;

-- 5. Create SELECT Policy: Only return rows matching session role or 'all_employees' (or if role is 'admin')
CREATE POLICY chunk_rbac_select_policy ON document_chunks
    FOR SELECT
    TO rag_app_user
    USING (
        current_setting('app.current_user_role', true) = ANY(allowed_roles)
        OR 'all_employees' = ANY(allowed_roles)
        OR current_setting('app.current_user_role', true) = 'admin'
    );

-- 6. Create INSERT/DELETE Policy for ingestion (allowed when role is 'admin')
CREATE POLICY chunk_rbac_insert_policy ON document_chunks
    FOR ALL
    TO rag_app_user
    USING (current_setting('app.current_user_role', true) = 'admin')
    WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
