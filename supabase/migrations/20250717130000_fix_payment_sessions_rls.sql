-- Fix payment_sessions RLS policy for guest checkout
-- Migration: 20250717130000_fix_payment_sessions_rls

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role full access payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Users can view own payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Service role and authenticated users can manage payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to create payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Payment sessions access policy" ON payment_sessions;

-- Create simple policies that work for both logged in and guest users
CREATE POLICY "Users can view their own payment sessions" ON payment_sessions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can create payment sessions" ON payment_sessions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Service role can manage all payment sessions" ON payment_sessions
    FOR ALL USING (auth.role() = 'service_role');

COMMIT;
