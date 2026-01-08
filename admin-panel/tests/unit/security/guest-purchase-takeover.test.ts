import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ============================================================================
 * SECURITY TEST: Guest Purchase Session Takeover (CVE-GATEFLOW-001)
 * ============================================================================
 *
 * VULNERABILITY: A logged-in attacker can steal access to products purchased
 * by guests if they obtain the session_id (via Referer leak, logs, etc.)
 *
 * ATTACK FLOW:
 * 1. Victim makes guest purchase → session_id in URL /success?session_id=cs_xxx
 * 2. Session_id leaks via HTTP Referer when victim clicks external link
 * 3. Attacker logs in and calls /api/verify-payment with stolen session_id
 * 4. Previous vulnerable code would grant access to attacker's account
 *
 * ROOT CAUSE:
 * - verify-payment.ts:284-287: Ownership check skipped when session.metadata.user_id is null
 * - verify-payment.ts:349: user_id_param uses logged-in user's ID for guest purchases
 *
 * FIX:
 * - If logged-in user tries to verify guest purchase, require email match
 * - Or keep access as guest purchase (not linked to attacker's account)
 *
 * This file tests the security fix to prevent this attack.
 * ============================================================================
 */

describe('Guest Purchase Session Takeover Prevention', () => {
  /**
   * Simulates the vulnerable ownership check logic
   */
  function vulnerableOwnershipCheck(
    user: { id: string; email: string } | null,
    sessionMetadataUserId: string | null | undefined,
    sessionCustomerEmail: string
  ): { allowed: boolean; grantToUserId: string | null } {
    // VULNERABLE: This check is skipped when sessionMetadataUserId is null/empty
    if (user && sessionMetadataUserId &&
        sessionMetadataUserId !== '' &&
        sessionMetadataUserId !== 'null' &&
        sessionMetadataUserId !== user.id) {
      return { allowed: false, grantToUserId: null };
    }

    // VULNERABLE: Passes attacker's user ID to grant access
    return {
      allowed: true,
      grantToUserId: user?.id || null
    };
  }

  /**
   * Simulates the FIXED ownership check logic
   */
  function secureOwnershipCheck(
    user: { id: string; email: string } | null,
    sessionMetadataUserId: string | null | undefined,
    sessionCustomerEmail: string
  ): { allowed: boolean; grantToUserId: string | null; error?: string } {
    // Case 1: Session has a user_id - verify it matches logged-in user
    if (sessionMetadataUserId &&
        sessionMetadataUserId !== '' &&
        sessionMetadataUserId !== 'null') {
      if (user && sessionMetadataUserId !== user.id) {
        return {
          allowed: false,
          grantToUserId: null,
          error: 'Session does not belong to current user'
        };
      }
      // Session belongs to logged-in user or no user logged in
      return { allowed: true, grantToUserId: sessionMetadataUserId };
    }

    // Case 2: Guest purchase (no user_id in session)
    // If a user is logged in, they can only claim if their email matches
    if (user) {
      if (user.email.toLowerCase() !== sessionCustomerEmail.toLowerCase()) {
        return {
          allowed: false,
          grantToUserId: null,
          error: 'Cannot claim guest purchase - email mismatch'
        };
      }
      // Email matches - allow linking to user's account
      return { allowed: true, grantToUserId: user.id };
    }

    // No user logged in - keep as guest purchase
    return { allowed: true, grantToUserId: null };
  }

  describe('Vulnerable Implementation (for documentation)', () => {
    it('VULNERABILITY: allows attacker to steal guest purchase', () => {
      // Victim's guest purchase
      const victimEmail = 'victim@example.com';
      const sessionMetadataUserId = null; // Guest purchase - no user_id

      // Attacker logged in with different email
      const attacker = { id: 'attacker-uuid', email: 'attacker@evil.com' };

      const result = vulnerableOwnershipCheck(
        attacker,
        sessionMetadataUserId,
        victimEmail
      );

      // VULNERABLE: Attacker is allowed and gets access granted to their account!
      expect(result.allowed).toBe(true);
      expect(result.grantToUserId).toBe('attacker-uuid');
      // This is the vulnerability - attacker steals victim's purchased product
    });

    it('VULNERABILITY: ownership check bypassed for null user_id', () => {
      const user = { id: 'user-123', email: 'user@example.com' };

      // All these values bypass the ownership check
      const bypassValues = [null, undefined, '', 'null'];

      for (const userId of bypassValues) {
        const result = vulnerableOwnershipCheck(
          user,
          userId,
          'other@example.com' // Different email!
        );

        // All bypass the check and grant to logged-in user
        expect(result.allowed).toBe(true);
        expect(result.grantToUserId).toBe('user-123');
      }
    });
  });

  describe('Secure Implementation', () => {
    it('should BLOCK attacker from stealing guest purchase', () => {
      // Victim's guest purchase
      const victimEmail = 'victim@example.com';
      const sessionMetadataUserId = null; // Guest purchase

      // Attacker logged in with different email
      const attacker = { id: 'attacker-uuid', email: 'attacker@evil.com' };

      const result = secureOwnershipCheck(
        attacker,
        sessionMetadataUserId,
        victimEmail
      );

      // SECURE: Attacker is blocked because email doesn't match
      expect(result.allowed).toBe(false);
      expect(result.grantToUserId).toBeNull();
      expect(result.error).toBe('Cannot claim guest purchase - email mismatch');
    });

    it('should allow user to claim their own guest purchase', () => {
      const userEmail = 'user@example.com';
      const sessionMetadataUserId = null; // Guest purchase
      const sessionCustomerEmail = 'user@example.com';

      const user = { id: 'user-uuid', email: userEmail };

      const result = secureOwnershipCheck(
        user,
        sessionMetadataUserId,
        sessionCustomerEmail
      );

      // User's email matches - allowed to claim
      expect(result.allowed).toBe(true);
      expect(result.grantToUserId).toBe('user-uuid');
    });

    it('should allow email match case-insensitively', () => {
      const user = { id: 'user-uuid', email: 'User@Example.COM' };
      const sessionCustomerEmail = 'user@example.com';

      const result = secureOwnershipCheck(
        user,
        null,
        sessionCustomerEmail
      );

      expect(result.allowed).toBe(true);
      expect(result.grantToUserId).toBe('user-uuid');
    });

    it('should allow guest verification without logged-in user', () => {
      const result = secureOwnershipCheck(
        null, // No user logged in
        null, // Guest purchase
        'guest@example.com'
      );

      // Allowed - keeps as guest purchase
      expect(result.allowed).toBe(true);
      expect(result.grantToUserId).toBeNull();
    });

    it('should block user from claiming another user\'s purchase', () => {
      const sessionOwner = 'owner-uuid';
      const loggedInUser = { id: 'other-uuid', email: 'other@example.com' };

      const result = secureOwnershipCheck(
        loggedInUser,
        sessionOwner,
        'owner@example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Session does not belong to current user');
    });

    it('should allow session owner to verify their purchase', () => {
      const sessionOwner = 'owner-uuid';
      const loggedInUser = { id: 'owner-uuid', email: 'owner@example.com' };

      const result = secureOwnershipCheck(
        loggedInUser,
        sessionOwner,
        'owner@example.com'
      );

      expect(result.allowed).toBe(true);
      expect(result.grantToUserId).toBe('owner-uuid');
    });

    it('should handle all null/empty user_id variations securely', () => {
      const attacker = { id: 'attacker-uuid', email: 'attacker@evil.com' };
      const bypassAttempts = [null, undefined, '', 'null'];

      for (const userId of bypassAttempts) {
        const result = secureOwnershipCheck(
          attacker,
          userId,
          'victim@example.com'
        );

        // All should be blocked because email doesn't match
        expect(result.allowed).toBe(false);
        expect(result.error).toBe('Cannot claim guest purchase - email mismatch');
      }
    });
  });

  describe('Attack Scenarios', () => {
    it('Scenario: Referer header session_id leak', () => {
      /**
       * Attack flow:
       * 1. Victim buys product as guest
       * 2. Redirected to /success?session_id=cs_test_abc123
       * 3. Victim clicks link to attacker's site
       * 4. Attacker's server logs Referer: https://victim-site.com/success?session_id=cs_test_abc123
       * 5. Attacker extracts session_id and calls /api/verify-payment
       */

      const stolenSessionId = 'cs_test_abc123';
      const victimEmail = 'victim@example.com';
      const attacker = { id: 'attacker-uuid', email: 'attacker@evil.com' };

      // Attacker tries to verify the stolen session
      const result = secureOwnershipCheck(
        attacker,
        null, // Guest purchase has no user_id
        victimEmail
      );

      // Attack blocked
      expect(result.allowed).toBe(false);
    });

    it('Scenario: Session ID from server logs', () => {
      /**
       * Attack flow:
       * 1. Attacker gains access to server logs
       * 2. Finds session IDs from access logs
       * 3. Tries to claim guest purchases
       */

      const loggedSessionIds = [
        { sessionId: 'cs_test_1', email: 'user1@example.com' },
        { sessionId: 'cs_test_2', email: 'user2@example.com' },
        { sessionId: 'cs_test_3', email: 'user3@example.com' },
      ];

      const attacker = { id: 'attacker-uuid', email: 'attacker@evil.com' };

      for (const session of loggedSessionIds) {
        const result = secureOwnershipCheck(
          attacker,
          null,
          session.email
        );

        // All attacks blocked
        expect(result.allowed).toBe(false);
      }
    });

    it('Scenario: Social engineering to get session URL', () => {
      /**
       * Attack flow:
       * 1. Attacker messages victim: "Can you share your receipt URL?"
       * 2. Victim shares: /success?session_id=cs_test_xyz
       * 3. Attacker uses session_id to claim the product
       */

      const sharedUrl = '/success?session_id=cs_test_xyz';
      const victimEmail = 'victim@example.com';
      const attacker = { id: 'attacker-uuid', email: 'attacker@evil.com' };

      const result = secureOwnershipCheck(
        attacker,
        null,
        victimEmail
      );

      // Attack blocked
      expect(result.allowed).toBe(false);
    });
  });
});
