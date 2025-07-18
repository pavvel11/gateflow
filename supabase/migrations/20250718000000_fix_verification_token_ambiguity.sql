-- Fix ambiguous column reference in claim_guest_purchases_verified function
-- The issue is that both parameter and column have the same name "verification_token"

CREATE OR REPLACE FUNCTION claim_guest_purchases_verified(
  user_email TEXT,
  user_id_param UUID,
  verification_token TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  claimed_count INTEGER := 0;
  guest_purchase_record RECORD;
BEGIN
  -- Enhanced security: only claim verified guest purchases
  FOR guest_purchase_record IN
    SELECT gp.*, gpv.email_verified
    FROM guest_purchases gp
    LEFT JOIN guest_purchase_verifications gpv ON gp.id = gpv.guest_purchase_id
    WHERE gp.customer_email = user_email
      AND gp.claimed_by_user_id IS NULL
      AND (gpv.email_verified = TRUE OR verification_token IS NOT NULL)
  LOOP
    -- If verification token provided, verify it
    IF verification_token IS NOT NULL THEN
      UPDATE guest_purchase_verifications 
      SET email_verified = TRUE, verified_at = NOW()
      WHERE guest_purchase_id = guest_purchase_record.id 
        AND guest_purchase_verifications.verification_token = claim_guest_purchases_verified.verification_token
        AND verification_expires_at > NOW();
    END IF;

    -- Only proceed if email is verified
    IF guest_purchase_record.email_verified OR verification_token IS NOT NULL THEN
      -- Update guest purchase
      UPDATE guest_purchases 
      SET claimed_by_user_id = user_id_param, claimed_at = NOW()
      WHERE id = guest_purchase_record.id;

      -- Grant product access
      INSERT INTO user_product_access (user_id, product_id, granted_at)
      VALUES (user_id_param, guest_purchase_record.product_id, NOW())
      ON CONFLICT (user_id, product_id) DO NOTHING;

      claimed_count := claimed_count + 1;
    END IF;
  END LOOP;

  RETURN claimed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
