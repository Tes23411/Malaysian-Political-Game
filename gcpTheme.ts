// ─── Shared Game Control Panel Theme ─────────────────────────────────────────
// Import this string into any panel and inject via <style>{GCP_THEME}</style>

export const GCP_FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Share+Tech+Mono&display=swap');
`;

export const GCP_VARS = `
  --brass: #c9a84c;
  --brass-dim: #8a6f2e;
  --amber: #e8b84b;
  --ink: #1a1208;
  --parchment: #2a1f0e;
  --panel-bg: #0f0b05;
  --panel-bg2: #1a1208;
  --border: rgba(201,168,76,0.22);
  --border-bright: rgba(201,168,76,0.55);
  --border-hover: rgba(201,168,76,0.8);
  --text-dim: rgba(201,168,76,0.42);
  --text-mid: rgba(201,168,76,0.68);
  --text-hi: #c9a84c;
  --text-amber: #e8b84b;
  --urgent: #e05c3a;
  --green: #63a064;
  --green-dim: rgba(99,160,100,0.65);
  --blue: #6a8ee0;
  --blue-dim: rgba(106,142,224,0.65);
  --red: #c0392b;
`;

export const GCP_BASE = `
  ${GCP_FONT_IMPORT}

  .gcp-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(8,5,2,0.88);
    backdrop-filter: blur(2px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: 'Crimson Text', serif;
  }

  .gcp-panel {
    ${GCP_VARS}
    background: linear-gradient(160deg, var(--panel-bg2) 0%, var(--panel-bg) 100%);
    border: 1px solid var(--border-bright);
    color: var(--text-hi);
    position: relative;
    overflow: hidden;
  }
  .gcp-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg, transparent, transparent 119px,
      rgba(201,168,76,0.025) 120px
    );
    pointer-events: none;
    z-index: 0;
  }
  .gcp-panel > * { position: relative; z-index: 1; }

  /* ── Typography ── */
  .gcp-title {
    font-family: 'Cinzel', serif;
    font-weight: 600;
    color: var(--brass);
    letter-spacing: 0.05em;
  }
  .gcp-subtitle {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
  }
  .gcp-mono {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
  }

  /* ── Buttons ── */
  .gcp-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-mid);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .gcp-btn:hover {
    background: rgba(201,168,76,0.08);
    color: var(--brass);
    border-color: var(--border-bright);
  }
  .gcp-btn.active {
    background: rgba(201,168,76,0.15);
    color: var(--amber);
    border-color: var(--brass);
  }
  .gcp-btn.primary {
    border-color: var(--border-bright);
    color: var(--amber);
  }
  .gcp-btn.primary:hover {
    background: rgba(201,168,76,0.14);
  }
  .gcp-btn.danger {
    border-color: rgba(224,92,58,0.45);
    color: rgba(224,92,58,0.8);
  }
  .gcp-btn.danger:hover {
    background: rgba(224,92,58,0.1);
    color: var(--urgent);
    border-color: var(--urgent);
  }
  .gcp-btn.success {
    border-color: rgba(99,160,100,0.45);
    color: rgba(99,160,100,0.8);
  }
  .gcp-btn.success:hover {
    background: rgba(99,160,100,0.1);
    color: var(--green);
    border-color: var(--green);
  }
  .gcp-btn.info {
    border-color: rgba(106,142,224,0.45);
    color: rgba(106,142,224,0.8);
  }
  .gcp-btn.info:hover {
    background: rgba(106,142,224,0.08);
    color: var(--blue);
    border-color: var(--blue);
  }
  .gcp-close-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 1rem;
    color: var(--text-dim);
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0 0.4rem;
    transition: all 0.15s;
    line-height: 1;
  }
  .gcp-close-btn:hover {
    color: var(--urgent);
    border-color: rgba(224,92,58,0.4);
  }

  /* ── Dividers ── */
  .gcp-hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0.75rem 0;
  }
  .gcp-vr {
    width: 1px;
    background: var(--border);
    align-self: stretch;
    flex-shrink: 0;
  }

  /* ── Section header ── */
  .gcp-section-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.22em;
    color: var(--text-dim);
    text-transform: uppercase;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.65rem;
  }

  /* ── Stat block ── */
  .gcp-stat {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    background: rgba(201,168,76,0.03);
  }
  .gcp-stat-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.16em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 0.2rem;
  }
  .gcp-stat-value {
    font-family: 'Cinzel', serif;
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--brass);
  }
  .gcp-stat-value.sm { font-size: 0.8rem; }
  .gcp-stat-value.amber { color: var(--amber); }
  .gcp-stat-value.green { color: var(--green); }
  .gcp-stat-value.blue  { color: var(--blue);  }
  .gcp-stat-value.red   { color: var(--red);   }
  .gcp-stat-value.urgent{ color: var(--urgent);}

  /* ── Badge/pill ── */
  .gcp-badge {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.45rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--border-bright);
    color: var(--text-mid);
    background: rgba(201,168,76,0.07);
  }
  .gcp-badge.green { border-color: rgba(99,160,100,0.45); color: rgba(99,160,100,0.85); background: rgba(99,160,100,0.07); }
  .gcp-badge.blue  { border-color: rgba(106,142,224,0.45); color: rgba(106,142,224,0.85); background: rgba(106,142,224,0.07); }
  .gcp-badge.red   { border-color: rgba(192,57,43,0.45); color: rgba(224,92,58,0.85); background: rgba(192,57,43,0.07); }
  .gcp-badge.amber { border-color: rgba(232,184,75,0.5); color: var(--amber); background: rgba(232,184,75,0.07); }

  /* ── Scrollbar ── */
  .gcp-scroll::-webkit-scrollbar { width: 4px; }
  .gcp-scroll::-webkit-scrollbar-track { background: transparent; }
  .gcp-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .gcp-scroll::-webkit-scrollbar-thumb:hover { background: var(--border-bright); }

  /* ── Tab buttons ── */
  .gcp-tab {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0.5rem 0.75rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    position: relative;
  }
  .gcp-tab:hover { color: var(--text-mid); }
  .gcp-tab.active {
    color: var(--amber);
    border-bottom-color: var(--brass);
  }

  /* ── Progress bar ── */
  .gcp-bar-track {
    height: 6px;
    background: rgba(201,168,76,0.1);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .gcp-bar-fill {
    height: 100%;
    transition: width 0.5s ease;
  }

  /* ── Fade in ── */
  @keyframes gcp-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .gcp-fade-in { animation: gcp-fade-in 0.2s ease-out; }

  /* ── Flicker ── */
  @keyframes gcp-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  .gcp-flicker { animation: gcp-flicker 1.6s ease-in-out infinite; }
`;