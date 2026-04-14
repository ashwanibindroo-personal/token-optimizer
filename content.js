/**
 * Token Optimizer Content Script
 * Main logic for UI injection and input monitoring.
 */

// Debounce function to limit calculations
function debounce(func, timeout = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// Robust text extraction
function getElementText(el) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
  return el.innerText || el.textContent || '';
}

// Robust text setting
function setElementText(el, text) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    el.value = text;
  } else {
    el.innerText = text;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

const UI = {
  dashboard: null,

  inject() {
    if (document.getElementById('tp-root')) return;

    const root = document.createElement('div');
    root.id = 'tp-root';
    root.innerHTML = `
      <div class="tp-dashboard" id="tp-dashboard">
        <div class="tp-header">
          <div class="tp-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            Token Optimizer
          </div>
          <button class="tp-close" id="tp-collapse-btn">—</button>
        </div>

        <div class="tp-stats">
          <div class="tp-stat-card">
            <span class="tp-stat-val" id="tp-token-count">0</span>
            <span class="tp-stat-label">Tokens</span>
          </div>
          <div class="tp-stat-card">
            <span class="tp-stat-val" id="tp-cost-estimate">$0.0000</span>
            <span class="tp-stat-label">Est. Cost</span>
          </div>
        </div>

        <div class="tp-recommendations" id="tp-recs-container"></div>

        <button class="tp-action-btn" id="tp-optimize-btn">⚡ Optimize Prompt</button>

        <div class="tp-cost-comparison" id="tp-comparison">
          <div class="tp-comp-title">💰 Cost Comparison</div>
          <div class="tp-comp-table" id="tp-comp-table">
            <div class="tp-comp-row">
              <span class="tp-comp-label">Original</span>
              <span id="tp-orig-tokens">0 tokens</span>
              <span id="tp-orig-cost">$0.00000</span>
            </div>
            <div class="tp-comp-row tp-comp-optimized">
              <span class="tp-comp-label">Optimized</span>
              <span id="tp-opt-tokens">0 tokens</span>
              <span id="tp-opt-cost">$0.00000</span>
            </div>
            <div class="tp-comp-row tp-comp-savings" id="tp-savings-row">
              <span class="tp-comp-label">You Save</span>
              <span id="tp-save-tokens">0 tokens</span>
              <span id="tp-save-cost" class="tp-savings">$0.00000</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.dashboard = document.getElementById('tp-dashboard');
    this.setupListeners();
  },

  setupListeners() {
    document.getElementById('tp-optimize-btn').onclick = () => this.handleOptimize();
    document.getElementById('tp-collapse-btn').onclick = () => {
      this.dashboard.classList.toggle('collapsed');
      document.getElementById('tp-collapse-btn').innerText =
        this.dashboard.classList.contains('collapsed') ? '✚' : '—';
    };

    // Drag-to-move via header
    const header = this.dashboard.querySelector('.tp-header');
    let dragging = false, dragOffsetX = 0, dragOffsetY = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'tp-collapse-btn') return;
      // Convert bottom/right to top/left so we can move freely
      const rect = this.dashboard.getBoundingClientRect();
      this.dashboard.style.top = rect.top + 'px';
      this.dashboard.style.left = rect.left + 'px';
      this.dashboard.style.bottom = 'auto';
      this.dashboard.style.right = 'auto';
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      dragging = true;
      this.dashboard.classList.add('tp-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = e.clientX - dragOffsetX;
      const y = e.clientY - dragOffsetY;
      const maxX = window.innerWidth - this.dashboard.offsetWidth;
      const maxY = window.innerHeight - this.dashboard.offsetHeight;
      this.dashboard.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      this.dashboard.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
      this.dashboard.classList.remove('tp-dragging');
    });
  },

  // originalText is passed after optimization to keep the before/after comparison accurate.
  // Without it, update() computes savings vs optimize(already-optimized) which is always $0.
  update(text, originalText = null) {
    if (!text || !text.trim()) {
      this.resetUI();
      return;
    }

    const tokens = window.TokenOptimizer.estimateTokens(text);
    const unitPrice = 2.50 / 1000000; // GPT-4o: $2.50 per 1M input tokens
    const cost = tokens * unitPrice;

    document.getElementById('tp-token-count').innerText = tokens;
    document.getElementById('tp-cost-estimate').innerText = `$${cost.toFixed(6)}`;

    // Recommendations (always based on current text)
    const recs = window.TokenOptimizer.getRecommendations(originalText || text);
    const recsContainer = document.getElementById('tp-recs-container');
    recsContainer.innerHTML = recs.map(r =>
      `<div class="tp-rec-item"><span>💡</span> ${r}</div>`
    ).join('');

    // Comparison baseline: use the pre-optimization original if provided,
    // otherwise compare current text against what optimize() would produce.
    let origTokens, origCost, optTokens, optCost;
    if (originalText !== null) {
      // Post-optimize: originalText = before, text = after
      origTokens = window.TokenOptimizer.estimateTokens(originalText);
      origCost = origTokens * unitPrice;
      optTokens = tokens;
      optCost = cost;
    } else {
      // Live typing: show potential savings if user clicks Optimize
      origTokens = tokens;
      origCost = cost;
      const optimizedText = window.TokenOptimizer.optimize(text);
      optTokens = window.TokenOptimizer.estimateTokens(optimizedText);
      optCost = optTokens * unitPrice;
    }

    const savedTokens = origTokens - optTokens;
    const savedCost = origCost - optCost;
    const savingsPercent = origTokens > 0 ? ((savedTokens / origTokens) * 100).toFixed(0) : 0;

    document.getElementById('tp-orig-tokens').innerText = `${origTokens} tokens`;
    document.getElementById('tp-orig-cost').innerText = `$${origCost.toFixed(6)}`;
    document.getElementById('tp-opt-tokens').innerText = `${optTokens} tokens`;
    document.getElementById('tp-opt-cost').innerText = `$${optCost.toFixed(6)}`;

    const saveTokensEl = document.getElementById('tp-save-tokens');
    const saveCostEl = document.getElementById('tp-save-cost');

    if (savedTokens > 0) {
      saveTokensEl.innerText = `${savedTokens} tokens (${savingsPercent}%)`;
      saveCostEl.innerText = `$${savedCost.toFixed(6)}`;
    } else {
      saveTokensEl.innerText = '0 tokens';
      saveCostEl.innerText = '$0.000000';
    }
    document.getElementById('tp-savings-row').style.display = 'flex';
  },

  resetUI() {
    document.getElementById('tp-token-count').innerText = '0';
    document.getElementById('tp-cost-estimate').innerText = '$0.000000';
    document.getElementById('tp-recs-container').innerHTML = '';
    document.getElementById('tp-orig-tokens').innerText = '0 tokens';
    document.getElementById('tp-orig-cost').innerText = '$0.000000';
    document.getElementById('tp-opt-tokens').innerText = '0 tokens';
    document.getElementById('tp-opt-cost').innerText = '$0.000000';
    document.getElementById('tp-save-tokens').innerText = '0 tokens';
    document.getElementById('tp-save-cost').innerText = '$0.000000';
  },

  handleOptimize() {
    const input = findInputField();
    if (input) {
      const originalText = getElementText(input);
      const optimized = window.TokenOptimizer.optimize(originalText);
      setElementText(input, optimized);
      // Pass originalText so the comparison shows before vs after, not $0
      this.update(optimized, originalText);
    }
  }
};

// Find the input field for various chatbots and apps
function findInputField() {
  const selectors = [
    '#prompt-textarea',               // ChatGPT
    '.ProseMirror',                    // Claude / Confluence
    '.ql-editor',                      // Gemini
    '[data-placeholder]',              // ProseMirror editors (Rovo, Notion)
    'div[contenteditable="true"]',     // Generic rich-text
    'p[contenteditable="true"]',       // Some editors use p
    'span[contenteditable="true"]',    // Some editors use span
    '[role="textbox"]',                // ARIA textbox
    'textarea',                        // Generic textarea
    'input[type="text"]'               // Generic text input
  ];

  for (const selector of selectors) {
    const els = document.querySelectorAll(selector);
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
  }
  return null;
}


// Poll for dynamic content and inject when ready
function checkAndInject() {
  const input = findInputField();
  const root = document.getElementById('tp-root');

  if (input) {
    if (!root) {
      UI.inject();
    } else if (UI.dashboard) {
      UI.dashboard.style.display = '';
    }

    if (!input.dataset.tpObserved) {
      input.dataset.tpObserved = "true";

      // Listen for input events
      input.addEventListener('input', debounce((e) => {
        UI.update(getElementText(e.target));
      }));

      // Also listen for keyup (some editors don't fire input)
      input.addEventListener('keyup', debounce((e) => {
        UI.update(getElementText(e.target));
      }));

      // Initial update
      UI.update(getElementText(input));
    }
  } else if (root && UI.dashboard) {
    UI.dashboard.style.display = 'none';
  }
}

setInterval(checkAndInject, 2000);
