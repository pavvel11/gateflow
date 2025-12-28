-- GUS API Integration Migration
-- Adds metadata column to guest_purchases table for storing company data from GUS

-- Add metadata column to guest_purchases if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'guest_purchases'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.guest_purchases
      ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb NOT NULL;

    COMMENT ON COLUMN public.guest_purchases.metadata IS
      'Additional purchase metadata (e.g., NIP, company details from GUS, invoice information)';

    -- Create GIN index for efficient JSONB queries
    CREATE INDEX IF NOT EXISTS idx_guest_purchases_metadata
      ON public.guest_purchases USING GIN (metadata);
  END IF;
END $$;
