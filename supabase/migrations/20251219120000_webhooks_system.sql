-- Create webhook_endpoints table
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL DEFAULT replace(cast(gen_random_uuid() as text), '-', ''),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create webhook_logs table with status enum-like check
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB,
    
    -- Status tracking: success, failed, retried (replaced by new attempt), archived (ignored)
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retried', 'archived')),
    
    http_status INT, -- HTTP Response code (e.g., 200, 404, 500)
    response_body TEXT,
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only)
-- We assume check_is_admin() function exists or we use admin_users table

-- Endpoints Policies
CREATE POLICY "Admins can manage webhook endpoints" ON webhook_endpoints
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Logs Policies (Full access for admins: Select to view, Insert for service role/functions, Update for retry/archive)
CREATE POLICY "Admins can view webhook logs" ON webhook_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update webhook logs" ON webhook_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_webhook_endpoints_modtime
    BEFORE UPDATE ON webhook_endpoints
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_webhook_logs_endpoint_id ON webhook_logs(endpoint_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
