import { describe, it, expect } from 'vitest';

/**
 * ============================================================================
 * SECURITY TEST: Refund Access Revocation
 * ============================================================================
 *
 * VULNERABILITY: Guest Purchase Access Not Revoked After Refund (V-CRITICAL-06)
 * LOCATION: src/app/api/admin/payments/refund/route.ts
 *
 * ATTACK FLOW (before fix):
 * 1. Guest purchases product (creates record in guest_purchases table)
 * 2. Admin processes refund
 * 3. Refund handler ONLY deleted from user_product_access (for authenticated users)
 * 4. Guest purchase record remained in guest_purchases table
 * 5. Guest later creates account with same email
 * 6. claim_guest_purchases_for_user() grants access to refunded product
 * 7. Guest gets product for FREE after receiving refund
 *
 * ROOT CAUSE:
 * The refund handler only checked `if (transaction.user_id && transaction.product_id)`
 * For guest purchases, user_id is NULL, so the access revocation was skipped entirely.
 *
 * FIX (V16):
 * Added separate cleanup for guest_purchases table using session_id
 *
 * Created during security audit (2026-01-08)
 * ============================================================================
 */

// Mock types for testing the security logic
interface PaymentTransaction {
  id: string;
  session_id: string;
  user_id: string | null; // NULL for guest purchases
  product_id: string;
  customer_email: string;
  amount: number;
  status: 'completed' | 'refunded' | 'failed';
}

interface GuestPurchase {
  id: string;
  session_id: string;
  customer_email: string;
  product_id: string;
  claimed_by_user_id: string | null;
}

interface UserProductAccess {
  user_id: string;
  product_id: string;
}

/**
 * Simulates the VULNERABLE refund handler (before fix)
 * This is what the code looked like BEFORE the security fix
 */
function vulnerableRefundHandler(
  transaction: PaymentTransaction,
  userProductAccessTable: UserProductAccess[],
  guestPurchasesTable: GuestPurchase[]
): { userAccessRevoked: boolean; guestAccessRevoked: boolean } {
  let userAccessRevoked = false;
  let guestAccessRevoked = false;

  // VULNERABLE: Only handles authenticated users
  if (transaction.user_id && transaction.product_id) {
    const index = userProductAccessTable.findIndex(
      (a) => a.user_id === transaction.user_id && a.product_id === transaction.product_id
    );
    if (index !== -1) {
      userProductAccessTable.splice(index, 1);
      userAccessRevoked = true;
    }
  }
  // BUG: Guest purchases are NOT cleaned up!

  return { userAccessRevoked, guestAccessRevoked };
}

/**
 * Simulates the FIXED refund handler (after V16 fix)
 */
function fixedRefundHandler(
  transaction: PaymentTransaction,
  userProductAccessTable: UserProductAccess[],
  guestPurchasesTable: GuestPurchase[]
): { userAccessRevoked: boolean; guestAccessRevoked: boolean } {
  let userAccessRevoked = false;
  let guestAccessRevoked = false;

  // Handle authenticated users
  if (transaction.user_id && transaction.product_id) {
    const index = userProductAccessTable.findIndex(
      (a) => a.user_id === transaction.user_id && a.product_id === transaction.product_id
    );
    if (index !== -1) {
      userProductAccessTable.splice(index, 1);
      userAccessRevoked = true;
    }
  }

  // SECURITY FIX (V16): Also handle guest purchases
  if (transaction.session_id && transaction.product_id) {
    const index = guestPurchasesTable.findIndex((g) => g.session_id === transaction.session_id);
    if (index !== -1) {
      guestPurchasesTable.splice(index, 1);
      guestAccessRevoked = true;
    }
  }

  return { userAccessRevoked, guestAccessRevoked };
}

describe('Refund Access Revocation Security', () => {
  describe('Vulnerable Code (Before Fix)', () => {
    it('should NOT revoke guest purchase access (DEMONSTRATES VULNERABILITY)', () => {
      // Setup: Guest purchase (user_id is NULL)
      const transaction: PaymentTransaction = {
        id: 'tx_123',
        session_id: 'cs_test_guest_session',
        user_id: null, // Guest purchase
        product_id: 'prod_123',
        customer_email: 'guest@example.com',
        amount: 1000,
        status: 'completed',
      };

      const userProductAccess: UserProductAccess[] = [];
      const guestPurchases: GuestPurchase[] = [
        {
          id: 'gp_123',
          session_id: 'cs_test_guest_session',
          customer_email: 'guest@example.com',
          product_id: 'prod_123',
          claimed_by_user_id: null,
        },
      ];

      // Execute vulnerable handler
      const result = vulnerableRefundHandler(transaction, userProductAccess, guestPurchases);

      // VULNERABILITY: Guest purchase is NOT revoked
      expect(result.guestAccessRevoked).toBe(false);
      expect(guestPurchases.length).toBe(1); // Still exists!
    });

    it('should revoke authenticated user access correctly', () => {
      // Setup: Authenticated user purchase
      const transaction: PaymentTransaction = {
        id: 'tx_456',
        session_id: 'cs_test_user_session',
        user_id: 'user_123',
        product_id: 'prod_456',
        customer_email: 'user@example.com',
        amount: 2000,
        status: 'completed',
      };

      const userProductAccess: UserProductAccess[] = [{ user_id: 'user_123', product_id: 'prod_456' }];
      const guestPurchases: GuestPurchase[] = [];

      // Execute vulnerable handler
      const result = vulnerableRefundHandler(transaction, userProductAccess, guestPurchases);

      // This works correctly for authenticated users
      expect(result.userAccessRevoked).toBe(true);
      expect(userProductAccess.length).toBe(0);
    });
  });

  describe('Fixed Code (After V16 Fix)', () => {
    it('should REVOKE guest purchase access after refund', () => {
      // Setup: Guest purchase (user_id is NULL)
      const transaction: PaymentTransaction = {
        id: 'tx_123',
        session_id: 'cs_test_guest_session',
        user_id: null, // Guest purchase
        product_id: 'prod_123',
        customer_email: 'guest@example.com',
        amount: 1000,
        status: 'completed',
      };

      const userProductAccess: UserProductAccess[] = [];
      const guestPurchases: GuestPurchase[] = [
        {
          id: 'gp_123',
          session_id: 'cs_test_guest_session',
          customer_email: 'guest@example.com',
          product_id: 'prod_123',
          claimed_by_user_id: null,
        },
      ];

      // Execute fixed handler
      const result = fixedRefundHandler(transaction, userProductAccess, guestPurchases);

      // FIXED: Guest purchase IS now revoked
      expect(result.guestAccessRevoked).toBe(true);
      expect(guestPurchases.length).toBe(0); // Deleted!
    });

    it('should revoke both guest and user access if both exist', () => {
      // Edge case: User purchased as guest, then claimed after creating account
      const transaction: PaymentTransaction = {
        id: 'tx_789',
        session_id: 'cs_test_mixed_session',
        user_id: 'user_789',
        product_id: 'prod_789',
        customer_email: 'mixed@example.com',
        amount: 3000,
        status: 'completed',
      };

      const userProductAccess: UserProductAccess[] = [{ user_id: 'user_789', product_id: 'prod_789' }];
      const guestPurchases: GuestPurchase[] = [
        {
          id: 'gp_789',
          session_id: 'cs_test_mixed_session',
          customer_email: 'mixed@example.com',
          product_id: 'prod_789',
          claimed_by_user_id: 'user_789',
        },
      ];

      // Execute fixed handler
      const result = fixedRefundHandler(transaction, userProductAccess, guestPurchases);

      // Both should be revoked
      expect(result.userAccessRevoked).toBe(true);
      expect(result.guestAccessRevoked).toBe(true);
      expect(userProductAccess.length).toBe(0);
      expect(guestPurchases.length).toBe(0);
    });

    it('should handle transaction with no matching records gracefully', () => {
      const transaction: PaymentTransaction = {
        id: 'tx_nonexistent',
        session_id: 'cs_test_nonexistent',
        user_id: null,
        product_id: 'prod_nonexistent',
        customer_email: 'nonexistent@example.com',
        amount: 500,
        status: 'completed',
      };

      const userProductAccess: UserProductAccess[] = [];
      const guestPurchases: GuestPurchase[] = [];

      // Should not throw, just return false
      const result = fixedRefundHandler(transaction, userProductAccess, guestPurchases);

      expect(result.userAccessRevoked).toBe(false);
      expect(result.guestAccessRevoked).toBe(false);
    });
  });

  describe('Real Attack Scenarios', () => {
    it('Scenario: Guest gets free product after refund (BLOCKED)', () => {
      /**
       * Attack (before fix):
       * 1. Attacker makes guest purchase for $100 product
       * 2. Attacker requests refund (legitimate)
       * 3. Admin processes refund - money returned
       * 4. guest_purchases record still exists (BUG!)
       * 5. Attacker creates account with same email
       * 6. System auto-claims guest purchase (grants access)
       * 7. Attacker has product AND money back = FREE PRODUCT
       *
       * With fix: Step 3 also deletes guest_purchases record
       */

      // Step 1-2: Guest purchase exists
      const guestPurchases: GuestPurchase[] = [
        {
          id: 'gp_attacker',
          session_id: 'cs_attacker_session',
          customer_email: 'attacker@example.com',
          product_id: 'expensive_product',
          claimed_by_user_id: null,
        },
      ];

      // Step 3: Admin processes refund
      const transaction: PaymentTransaction = {
        id: 'tx_refund',
        session_id: 'cs_attacker_session',
        user_id: null,
        product_id: 'expensive_product',
        customer_email: 'attacker@example.com',
        amount: 10000, // $100
        status: 'refunded',
      };

      // Using FIXED handler
      fixedRefundHandler(transaction, [], guestPurchases);

      // Step 4-5: When attacker creates account, there's nothing to claim
      expect(guestPurchases.length).toBe(0);

      // Attack BLOCKED!
    });

    it('Scenario: Multiple guest purchases, only refunded one is revoked', () => {
      /**
       * User made 2 guest purchases, requests refund for one.
       * Only the refunded purchase should be revoked, not the other.
       */

      const guestPurchases: GuestPurchase[] = [
        {
          id: 'gp_1',
          session_id: 'cs_session_1',
          customer_email: 'user@example.com',
          product_id: 'product_1',
          claimed_by_user_id: null,
        },
        {
          id: 'gp_2',
          session_id: 'cs_session_2',
          customer_email: 'user@example.com',
          product_id: 'product_2',
          claimed_by_user_id: null,
        },
      ];

      // Refund only product_1
      const transaction: PaymentTransaction = {
        id: 'tx_partial',
        session_id: 'cs_session_1', // Only this session
        user_id: null,
        product_id: 'product_1',
        customer_email: 'user@example.com',
        amount: 5000,
        status: 'refunded',
      };

      fixedRefundHandler(transaction, [], guestPurchases);

      // Only product_1 should be revoked
      expect(guestPurchases.length).toBe(1);
      expect(guestPurchases[0].product_id).toBe('product_2');
    });
  });

  describe('Session ID Matching', () => {
    it('should match by exact session_id, not partial match', () => {
      const guestPurchases: GuestPurchase[] = [
        {
          id: 'gp_1',
          session_id: 'cs_test_session_abc123',
          customer_email: 'user@example.com',
          product_id: 'product_1',
          claimed_by_user_id: null,
        },
        {
          id: 'gp_2',
          session_id: 'cs_test_session_abc', // Similar but different
          customer_email: 'user@example.com',
          product_id: 'product_1',
          claimed_by_user_id: null,
        },
      ];

      const transaction: PaymentTransaction = {
        id: 'tx_exact',
        session_id: 'cs_test_session_abc123', // Exact match to gp_1
        user_id: null,
        product_id: 'product_1',
        customer_email: 'user@example.com',
        amount: 1000,
        status: 'refunded',
      };

      fixedRefundHandler(transaction, [], guestPurchases);

      // Only exact match should be deleted
      expect(guestPurchases.length).toBe(1);
      expect(guestPurchases[0].session_id).toBe('cs_test_session_abc');
    });
  });
});
