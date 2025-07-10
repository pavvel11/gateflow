-- Create table for storing secure access tokens
CREATE TABLE IF NOT EXISTS public.access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL REFERENCES public.products(slug) ON DELETE CASCADE,
  token TEXT NOT NULL, -- can store a secure token if needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE -- When the token was used
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS access_tokens_user_id_idx ON public.access_tokens (user_id);
CREATE INDEX IF NOT EXISTS access_tokens_product_slug_idx ON public.access_tokens (product_slug);
CREATE INDEX IF NOT EXISTS access_tokens_expires_at_idx ON public.access_tokens (expires_at);

-- Add RLS policies for the access_tokens table
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

-- Default to no access
CREATE POLICY "No direct table access for access_tokens" ON public.access_tokens
  FOR ALL USING (false);

-- Allow service role to manage tokens
CREATE POLICY "Service role can manage tokens" ON public.access_tokens
  FOR ALL TO service_role USING (true);

-- Allow token validation via RPC only
CREATE OR REPLACE FUNCTION public.validate_access_token(
  p_user_id UUID,
  p_product_slug TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_token_exists BOOLEAN;
BEGIN
  -- Check if a valid token exists
  SELECT EXISTS (
    SELECT 1 
    FROM public.access_tokens 
    WHERE user_id = p_user_id 
    AND product_slug = p_product_slug
    AND expires_at > now()
  ) INTO v_token_exists;
  
  -- If a token exists, mark it as used
  IF v_token_exists THEN
    UPDATE public.access_tokens 
    SET used_at = now()
    WHERE user_id = p_user_id 
    AND product_slug = p_product_slug
    AND expires_at > now()
    AND used_at IS NULL;
  END IF;
  
  RETURN v_token_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the validate function for authenticated users
GRANT EXECUTE ON FUNCTION public.validate_access_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_access_token TO service_role;

-- Create function to securely generate a token for a product
CREATE OR REPLACE FUNCTION public.create_product_access_token(
  p_user_id UUID,
  p_product_slug TEXT,
  p_expires_in_minutes INTEGER DEFAULT 15
) RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Security check - ensure only service_role can create tokens
  IF NOT (current_setting('request.jwt.claim.role', true)::text = 'service_role') THEN
    RAISE EXCEPTION 'Permission denied: Only service role can create access tokens';
  END IF;

  -- Insert the new token
  INSERT INTO public.access_tokens (
    user_id,
    product_slug,
    token,
    expires_at
  ) VALUES (
    p_user_id,
    p_product_slug,
    encode(gen_random_bytes(32), 'hex'), -- Generate secure random token
    now() + (p_expires_in_minutes * interval '1 minute')
  ) RETURNING id INTO v_token_id;
  
  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the create function for service role only
GRANT EXECUTE ON FUNCTION public.create_product_access_token TO service_role;

-- Add audit logging trigger for access tokens
CREATE TRIGGER access_tokens_audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.access_tokens
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

COMMENT ON TABLE public.access_tokens IS 'Secure time-limited tokens for granting product access';
