/**
 * Token Optimizer Content Script
 * Main logic for UI injection and input monitoring.
 */

// Debounce function to limit calculations
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const UI = {
  dashboard: null,
  stats: { tokens: 0, cost: 0 },
  
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
            <span class="tp-stat-val" id="tp-cost-estimate">$0.00</span>
            <span class="tp-stat-label">Est. Cost</span>
          </div>
        </div>

        <div class="tp-recommendations" id="tp-recs-container">
          <!-- Recommendations injected here -->
        </div>

        <button class="tp-action-btn" id="tp-optimize-btn">Optimize Prompt</button>

        <div class="tp-cost-comparison" id="tp-comparison">
          Type something to see optimization benefits...
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
      document.getElementById('tp-collapse-btn').innerText = this.dashboard.classList.contains('collapsed') ? '✚' : '—';
    };
  },

  update(text) {
    if (!text) {
      this.resetUI();
      return;
    }

    const tokens = window.TokenOptimizer.estimateTokens(text);
    const cost = (tokens / 1000) * 0.0025; // GPT-4o approx pricing

    document.getElementById('tp-token-count').innerText = tokens;
    document.getElementById('tp-cost-estimate').innerText = `$${cost.toFixed(4)}`;

    const recs = window.TokenOptimizer.getRecommendations(text);
    const recsContainer = document.getElementById('tp-recs-container');
    recsContainer.innerHTML = recs.map(r => `<div class="tp-rec-item"><span>💡</span> ${r}</div>`).join('');

    const optimizedText = window.TokenOptimizer.optimize(text);
    const optimizedTokens = window.TokenOptimizer.estimateTokens(optimizedText);
    const savings = tokens - optimizedTokens;
    const savingsPercent = ((savings / tokens) * 100).toFixed(0);

    if (savings > 0) {
      document.getElementById('tp-comparison').innerHTML = 
        `Optimizing can save <span class="tp-savings">${savings} tokens (${savingsPercent}%)</span>`;
    } else {
      document.getElementById('tp-comparison').innerText = "Prompt is already fairly optimal.";
    }
  },

  resetUI() {
    document.getElementById('tp-token-count').innerText = '0';
    document.getElementById('tp-cost-estimate').innerText = '$0.00';
    document.getElementById('tp-recs-container').innerHTML = '';
    document.getElementById('tp-comparison').innerText = "Type something to see optimization benefits...";
  },

  handleOptimize() {
    const input = findInputField();
    if (input) {
      const text = input.value || input.innerText;
      const optimized = window.TokenOptimizer.optimize(text);
      
      if (input.value !== undefined) {
        input.value = optimized;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        input.innerText = optimized;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      this.update(optimized);
    }
  }
};

// Find the input field for various chatbots
function findInputField() {
  const selectors = [
    '#prompt-textarea', // ChatGPT
    '.ProseMirror',     // Claude
    '.ql-editor',       // Gemini
    'textarea'          // Generic fallback
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// Monitor for input changes
const observer = new MutationObserver(debounce(() => {
  const input = findInputField();
  if (input) {
    const text = input.value || input.innerText;
    UI.update(text);
  }
}));

// Initialize
setInterval(() => {
  UI.inject();
  const input = findInputField();
  if (input && !input.dataset.tpObserved) {
    input.dataset.tpObserved = "true";
    input.addEventListener('input', debounce((e) => {
      const text = e.target.value || e.target.innerText;
      UI.update(text);
    }));
  }
}, 2000);
