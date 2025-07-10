-- Add admin functionality
-- Migration: 20250709170000_add_admin_users

BEGIN;

-- Create admin_users table to track who is an admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users table
-- Allow users to check only their own admin status
CREATE POLICY "Allow users to read their own admin status" ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to make first user admin automatically
CREATE OR REPLACE FUNCTION handle_first_user_admin()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  -- Check if there are no existing admin users
  IF NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
    -- Make this user an admin (bypass RLS with SECURITY DEFINER)
    INSERT INTO public.admin_users (user_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically make first user admin
CREATE TRIGGER first_user_admin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_first_user_admin();

COMMIT;
