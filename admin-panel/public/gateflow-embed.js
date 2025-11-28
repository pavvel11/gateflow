/**
 * GateFlow Embed Widget
 *
 * Embedable widget for claiming free products from external landing pages
 *
 * Usage:
 * <div data-gateflow-product="your-product-slug"></div>
 * <script src="https://yourdomain.com/gateflow-embed.js"></script>
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE_URL = document.currentScript?.getAttribute('data-api-url') || window.location.origin;
  const TURNSTILE_SITE_KEY = document.currentScript?.getAttribute('data-turnstile-key') || '0x4AAAAAABnF2GkUeHiuSDaB';

  // State management
  const widgetState = new Map();

  /**
   * Initialize all widgets on the page
   */
  function init() {
    const widgets = document.querySelectorAll('[data-gateflow-product]');
    widgets.forEach(widget => {
      const productSlug = widget.getAttribute('data-gateflow-product');
      if (productSlug) {
        renderWidget(widget, productSlug);
      }
    });
  }

  /**
   * Render a single widget
   */
  function renderWidget(container, productSlug) {
    const widgetId = `gateflow-widget-${Math.random().toString(36).substr(2, 9)}`;

    widgetState.set(widgetId, {
      productSlug,
      email: '',
      loading: false,
      turnstileToken: null,
      message: null,
    });

    container.innerHTML = `
      <div id="${widgetId}" class="gateflow-widget">
        <style>
          .gateflow-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 500px;
            margin: 0 auto;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          }

          .gateflow-widget h3 {
            color: white;
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            font-weight: 600;
          }

          .gateflow-widget p {
            color: rgba(255, 255, 255, 0.9);
            margin: 0 0 1.5rem 0;
            font-size: 0.95rem;
          }

          .gateflow-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .gateflow-input {
            padding: 0.75rem 1rem;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            transition: all 0.3s ease;
          }

          .gateflow-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
          }

          .gateflow-input:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.15);
          }

          .gateflow-button {
            padding: 0.75rem 2rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            background: white;
            color: #667eea;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }

          .gateflow-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
          }

          .gateflow-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .gateflow-spinner {
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-top-color: #667eea;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            animation: gateflow-spin 0.8s linear infinite;
          }

          @keyframes gateflow-spin {
            to { transform: rotate(360deg); }
          }

          .gateflow-message {
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            margin-top: 1rem;
          }

          .gateflow-message-success {
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.5);
            color: white;
          }

          .gateflow-message-error {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.5);
            color: white;
          }

          .gateflow-terms {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.85rem;
            margin-top: 1rem;
            text-align: center;
          }

          .gateflow-terms a {
            color: white;
            text-decoration: underline;
          }

          .gateflow-turnstile {
            margin-top: 1rem;
            display: flex;
            justify-content: center;
          }
        </style>

        <h3>🎁 Get Free Access</h3>
        <p>Enter your email to receive instant access to this free product</p>

        <form class="gateflow-form" onsubmit="return GateFlowEmbed.handleSubmit(event, '${widgetId}')">
          <input
            type="email"
            class="gateflow-input"
            placeholder="Enter your email"
            required
            onchange="GateFlowEmbed.updateEmail('${widgetId}', this.value)"
          />

          <button type="submit" class="gateflow-button" id="${widgetId}-button">
            <span id="${widgetId}-button-text">Send Magic Link</span>
          </button>

          <div class="gateflow-turnstile" id="${widgetId}-turnstile"></div>

          <div class="gateflow-terms">
            By submitting, you agree to receive emails from us.
          </div>
        </form>

        <div id="${widgetId}-message"></div>
      </div>
    `;

    // Load Turnstile
    loadTurnstile(widgetId);
  }

  /**
   * Load Cloudflare Turnstile
   */
  function loadTurnstile(widgetId) {
    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => renderTurnstile(widgetId);
      document.head.appendChild(script);
    } else {
      renderTurnstile(widgetId);
    }
  }

  /**
   * Render Turnstile widget
   */
  function renderTurnstile(widgetId) {
    const container = document.getElementById(`${widgetId}-turnstile`);
    if (container && window.turnstile) {
      window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token) => {
          const state = widgetState.get(widgetId);
          state.turnstileToken = token;
          widgetState.set(widgetId, state);
        },
        'error-callback': () => {
          const state = widgetState.get(widgetId);
          state.turnstileToken = null;
          widgetState.set(widgetId, state);
        },
      });
    }
  }

  /**
   * Update email in state
   */
  function updateEmail(widgetId, email) {
    const state = widgetState.get(widgetId);
    state.email = email;
    widgetState.set(widgetId, state);
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(event, widgetId) {
    event.preventDefault();

    const state = widgetState.get(widgetId);
    const { productSlug, email, turnstileToken } = state;

    // Validate
    if (!email) {
      showMessage(widgetId, 'Please enter your email', 'error');
      return false;
    }

    if (!turnstileToken) {
      showMessage(widgetId, 'Please complete the security verification', 'error');
      return false;
    }

    // Set loading state
    setLoading(widgetId, true);
    clearMessage(widgetId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/public/products/claim-free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          productSlug,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage(widgetId, data.message || 'Check your email for the magic link!', 'success');
        // Clear form
        event.target.reset();
      } else {
        showMessage(widgetId, data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (error) {
      console.error('GateFlow Embed Error:', error);
      showMessage(widgetId, 'Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(widgetId, false);
      // Reset Turnstile
      if (window.turnstile) {
        window.turnstile.reset();
      }
      state.turnstileToken = null;
      widgetState.set(widgetId, state);
    }

    return false;
  }

  /**
   * Set loading state
   */
  function setLoading(widgetId, loading) {
    const button = document.getElementById(`${widgetId}-button`);
    const buttonText = document.getElementById(`${widgetId}-button-text`);

    if (loading) {
      button.disabled = true;
      buttonText.innerHTML = '<div class="gateflow-spinner"></div> Sending...';
    } else {
      button.disabled = false;
      buttonText.textContent = 'Send Magic Link';
    }
  }

  /**
   * Show message
   */
  function showMessage(widgetId, message, type) {
    const messageEl = document.getElementById(`${widgetId}-message`);
    messageEl.className = `gateflow-message gateflow-message-${type}`;
    messageEl.textContent = message;
  }

  /**
   * Clear message
   */
  function clearMessage(widgetId) {
    const messageEl = document.getElementById(`${widgetId}-message`);
    messageEl.className = '';
    messageEl.textContent = '';
  }

  // Export public API
  window.GateFlowEmbed = {
    init,
    handleSubmit,
    updateEmail,
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
