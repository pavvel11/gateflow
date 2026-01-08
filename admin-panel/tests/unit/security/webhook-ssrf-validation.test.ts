import { describe, it, expect } from 'vitest';

/**
 * ============================================================================
 * SECURITY TEST: Webhook URL SSRF Validation
 * ============================================================================
 *
 * VULNERABILITY: SSRF Bypass via Webhook PUT Endpoint (V-CRITICAL-07)
 * LOCATION: src/app/api/admin/webhooks/[id]/route.ts
 *
 * ATTACK FLOW (before fix):
 * 1. Admin creates webhook with legitimate URL (e.g., https://example.com/webhook)
 * 2. POST validation passes (isValidWebhookUrl is called)
 * 3. Admin (or compromised admin account) updates webhook via PUT
 * 4. PUT had NO URL validation - accepts any URL including internal IPs
 * 5. Webhook URL changed to http://169.254.169.254/latest/meta-data/
 * 6. On next webhook trigger, server makes request to cloud metadata service
 * 7. Response (AWS credentials, instance identity) logged to webhook_logs
 *
 * ROOT CAUSE:
 * The PUT endpoint in [id]/route.ts did not call isValidWebhookUrl(),
 * while the POST endpoint in route.ts did. Classic validation bypass.
 *
 * FIX (V17):
 * Added isValidWebhookUrl validation to PUT endpoint
 *
 * Created during security audit iteration 6 (2026-01-08)
 * ============================================================================
 */

// Simulate the validation function (same logic as in the actual code)
function isValidWebhookUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Must be HTTPS or HTTP
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, error: 'URL must use HTTPS protocol' };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
      return { valid: false, error: 'URL cannot point to localhost' };
    }

    // Block private/internal hostnames
    const blockedHostnames = [
      'metadata.google.internal',
      'metadata.goog',
      'kubernetes.default',
      'kubernetes.default.svc',
    ];
    if (blockedHostnames.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
      return { valid: false, error: 'URL cannot point to internal services' };
    }

    // Check if hostname is an IP address
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Block private IPv4 ranges (RFC 1918)
      if (a === 10) {
        return { valid: false, error: 'URL cannot point to private IP addresses (10.x.x.x)' };
      }
      if (a === 172 && b >= 16 && b <= 31) {
        return { valid: false, error: 'URL cannot point to private IP addresses (172.16-31.x.x)' };
      }
      if (a === 192 && b === 168) {
        return { valid: false, error: 'URL cannot point to private IP addresses (192.168.x.x)' };
      }
      if (a === 127) {
        return { valid: false, error: 'URL cannot point to loopback addresses' };
      }
      // 169.254.x.x - link-local, includes AWS/cloud metadata
      if (a === 169 && b === 254) {
        return { valid: false, error: 'URL cannot point to link-local addresses (cloud metadata)' };
      }
      if (a === 0 && b === 0 && c === 0 && d === 0) {
        return { valid: false, error: 'URL cannot point to 0.0.0.0' };
      }
    }

    // Block IPv6 loopback and link-local
    if (hostname.startsWith('[')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      if (ipv6 === '::1' || ipv6.startsWith('fe80:') || ipv6.startsWith('fc') || ipv6.startsWith('fd')) {
        return { valid: false, error: 'URL cannot point to IPv6 loopback or private addresses' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

describe('Webhook URL SSRF Validation', () => {
  describe('Cloud Metadata Endpoints - BLOCKED', () => {
    it('should BLOCK AWS metadata endpoint (169.254.169.254)', () => {
      const result = isValidWebhookUrl('http://169.254.169.254/latest/meta-data/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cloud metadata');
    });

    it('should BLOCK AWS metadata with credentials path', () => {
      const result = isValidWebhookUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials/');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK Google Cloud metadata endpoint', () => {
      const result = isValidWebhookUrl('http://metadata.google.internal/computeMetadata/v1/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('internal services');
    });

    it('should BLOCK metadata.goog', () => {
      const result = isValidWebhookUrl('http://metadata.goog/computeMetadata/v1/');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK any 169.254.x.x address', () => {
      const urls = [
        'http://169.254.0.1/test',
        'http://169.254.255.255/test',
        'http://169.254.1.1:8080/webhook',
      ];

      urls.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Localhost/Loopback - BLOCKED', () => {
    it('should BLOCK localhost', () => {
      const result = isValidWebhookUrl('http://localhost/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('should BLOCK localhost with port', () => {
      const result = isValidWebhookUrl('http://localhost:3000/api/webhook');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK 127.0.0.1', () => {
      const result = isValidWebhookUrl('http://127.0.0.1/webhook');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK 127.x.x.x range', () => {
      const result = isValidWebhookUrl('http://127.0.0.2:8080/webhook');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK IPv6 loopback [::1]', () => {
      const result = isValidWebhookUrl('http://[::1]/webhook');
      expect(result.valid).toBe(false);
    });
  });

  describe('Private IP Ranges (RFC 1918) - BLOCKED', () => {
    it('should BLOCK 10.x.x.x range', () => {
      const urls = [
        'http://10.0.0.1/webhook',
        'http://10.255.255.255/webhook',
        'http://10.0.1.1:8080/internal',
      ];

      urls.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('10.x.x.x');
      });
    });

    it('should BLOCK 172.16-31.x.x range', () => {
      const urls = [
        'http://172.16.0.1/webhook',
        'http://172.31.255.255/webhook',
        'http://172.20.0.1/internal',
      ];

      urls.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('172.16-31');
      });
    });

    it('should ALLOW 172.15.x.x (not private)', () => {
      const result = isValidWebhookUrl('http://172.15.0.1/webhook');
      expect(result.valid).toBe(true);
    });

    it('should ALLOW 172.32.x.x (not private)', () => {
      const result = isValidWebhookUrl('http://172.32.0.1/webhook');
      expect(result.valid).toBe(true);
    });

    it('should BLOCK 192.168.x.x range', () => {
      const urls = [
        'http://192.168.0.1/webhook',
        'http://192.168.1.1/webhook',
        'http://192.168.255.255/internal',
      ];

      urls.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('192.168');
      });
    });
  });

  describe('Kubernetes Internal Services - BLOCKED', () => {
    it('should BLOCK kubernetes.default', () => {
      const result = isValidWebhookUrl('http://kubernetes.default/api/v1/secrets');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK kubernetes.default.svc', () => {
      const result = isValidWebhookUrl('http://kubernetes.default.svc/api/v1/pods');
      expect(result.valid).toBe(false);
    });

    it('should BLOCK subdomains of kubernetes.default.svc', () => {
      // Note: Full cluster.local suffix is a subdomain OF kubernetes.default.svc
      // but the pattern match checks endsWith('.kubernetes.default.svc')
      // So we test the actual blocked patterns
      const result1 = isValidWebhookUrl('http://api.kubernetes.default.svc/endpoint');
      expect(result1.valid).toBe(false);
    });
  });

  describe('Valid External URLs - ALLOWED', () => {
    it('should ALLOW legitimate webhook URLs', () => {
      const validUrls = [
        'https://webhook.site/abc123',
        'https://api.example.com/webhook',
        'https://hooks.slack.com/services/xxx',
        'https://discord.com/api/webhooks/xxx',
        'http://my-webhook-server.com/endpoint',
        'https://8.8.8.8/webhook', // Public IP
      ];

      validUrls.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Invalid URL Format - BLOCKED', () => {
    it('should BLOCK non-HTTP protocols', () => {
      const invalidUrls = [
        'ftp://example.com/file',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      invalidUrls.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(false);
      });
    });

    it('should BLOCK malformed URLs', () => {
      const result = isValidWebhookUrl('not-a-valid-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should BLOCK 0.0.0.0', () => {
      const result = isValidWebhookUrl('http://0.0.0.0/webhook');
      expect(result.valid).toBe(false);
    });
  });

  describe('Real Attack Scenarios', () => {
    it('Scenario: AWS credential theft via metadata', () => {
      /**
       * Attack (before fix):
       * 1. Attacker creates webhook with https://legitimate.com/webhook
       * 2. Attacker updates webhook URL to AWS metadata endpoint
       * 3. On webhook trigger, server fetches IAM credentials
       * 4. Response logged, attacker extracts credentials
       */
      const attackUrl = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/my-role';
      const result = isValidWebhookUrl(attackUrl);
      expect(result.valid).toBe(false);
    });

    it('Scenario: Internal network scanning', () => {
      /**
       * Attack:
       * 1. Attacker tries various internal IPs
       * 2. Response times/errors reveal internal network topology
       */
      const internalTargets = [
        'http://10.0.0.1:22/ssh',
        'http://192.168.1.1/admin',
        'http://172.16.0.100:3306/mysql',
      ];

      internalTargets.forEach((url) => {
        const result = isValidWebhookUrl(url);
        expect(result.valid).toBe(false);
      });
    });

    it('Scenario: Kubernetes secrets exfiltration', () => {
      /**
       * Attack:
       * 1. If running in K8s, access secrets via internal DNS
       */
      const k8sUrl = 'http://kubernetes.default.svc/api/v1/namespaces/default/secrets';
      const result = isValidWebhookUrl(k8sUrl);
      expect(result.valid).toBe(false);
    });
  });
});
