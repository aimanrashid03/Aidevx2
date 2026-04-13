/**
 * build-corrad-bundle.mjs
 *
 * Bundles the corrad-design/ source files into a TypeScript constants file
 * that can be imported by Deno edge functions.
 *
 * Usage:
 *   node scripts/build-corrad-bundle.mjs
 *
 * Output:
 *   supabase/functions/_shared/corradDesign.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function read(relPath) {
  return readFileSync(resolve(ROOT, relPath), 'utf8')
}

/** Escape a string for use inside a TypeScript backtick template literal */
function escTs(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

// ── Read source files ──────────────────────────────────────────────────────

const systemPrompt = read('corrad-design/system-prompt.md')
const baseCss = read('corrad-design/preview/base.css')
const rules = JSON.parse(read('corrad-design/spec/rules.json'))

// Curated snippets — compact set for few-shot context
const statCard = read('corrad-design/snippets/cards/stat-card.html')
const confirmDialog = read('corrad-design/snippets/feedback/confirm-dialog.html')
const toastHtml = read('corrad-design/snippets/feedback/toast.html')
const featureCard = read('corrad-design/snippets/cards/feature-card.html')
const dashboardPage = read('corrad-design/snippets/pages/dashboard.html')

// Hand-written analytics chart patterns (not in snippet files)
const chartSnippets = `
<!-- CSS bar chart row — use for horizontal bar charts in analytics pages -->
<!-- The ONLY permitted inline style is style="width: X%" on bar fill elements -->
<div class="space-y-2 py-2">
  <div class="flex items-center gap-3">
    <span class="w-28 shrink-0 truncate text-xs text-slate-600">Category A</span>
    <div class="flex-1 rounded-full bg-slate-100 h-2">
      <div class="h-2 rounded-full bg-violet-500" style="width: 72%"></div>
    </div>
    <span class="w-10 shrink-0 text-right text-xs font-medium text-slate-700">72%</span>
  </div>
  <div class="flex items-center gap-3">
    <span class="w-28 shrink-0 truncate text-xs text-slate-600">Category B</span>
    <div class="flex-1 rounded-full bg-slate-100 h-2">
      <div class="h-2 rounded-full bg-violet-500" style="width: 45%"></div>
    </div>
    <span class="w-10 shrink-0 text-right text-xs font-medium text-slate-700">45%</span>
  </div>
  <div class="flex items-center gap-3">
    <span class="w-28 shrink-0 truncate text-xs text-slate-600">Category C</span>
    <div class="flex-1 rounded-full bg-slate-100 h-2">
      <div class="h-2 rounded-full bg-emerald-500" style="width: 88%"></div>
    </div>
    <span class="w-10 shrink-0 text-right text-xs font-medium text-slate-700">88%</span>
  </div>
</div>

<!-- SVG sparkline — trend line for stat cards or mini charts -->
<svg viewBox="0 0 100 32" class="h-8 w-24" preserveAspectRatio="none">
  <polyline points="0,28 15,22 30,18 45,24 60,10 75,14 90,8 100,4"
    fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="0,28 15,22 30,18 45,24 60,10 75,14 90,8 100,4 100,32 0,32"
    fill="#8b5cf6" fill-opacity="0.08" stroke="none"/>
</svg>

<!-- SVG donut arc — completion ratio or category breakdown -->
<!-- circumference of r=16 circle = 2*pi*16 ~= 100.5 -->
<!-- stroke-dasharray: (pct/100 * 100.5) 100.5 -->
<div class="flex items-center gap-4">
  <div class="relative flex h-20 w-20 shrink-0 items-center justify-center">
    <svg class="h-20 w-20 -rotate-90" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="16" fill="none" stroke="#e2e8f0" stroke-width="5"/>
      <circle cx="22" cy="22" r="16" fill="none" stroke="#8b5cf6" stroke-width="5"
        stroke-dasharray="72.4 100.5" stroke-linecap="round"/>
    </svg>
    <span class="absolute text-sm font-semibold text-slate-900">72%</span>
  </div>
  <div>
    <p class="text-sm font-medium text-slate-900">METRIC LABEL</p>
    <p class="text-xs text-slate-500">METRIC DESCRIPTION</p>
  </div>
</div>
`

// ── Assemble CORRAD_SNIPPETS_COMPACT ──────────────────────────────────────

const snippetsCompact = [
  '<!-- === CORRAD SNIPPETS: CURATED REFERENCE SET === -->',
  '',
  '<!-- STAT CARDS -->',
  statCard.split('\n').filter((_, i) => i > 0).join('\n'), // skip comment header
  '',
  '<!-- CONFIRM DIALOG -->',
  confirmDialog.split('\n').filter((_, i) => i > 0).join('\n'),
  '',
  '<!-- TOAST VARIANTS -->',
  toastHtml.split('\n').filter((_, i) => i > 0).join('\n'),
  '',
  '<!-- FEATURE CARD / HERO BANNER -->',
  featureCard.split('\n').filter((_, i) => i > 0).join('\n'),
  '',
  '<!-- DASHBOARD RECENT TABLE (from dashboard page) -->',
  // Extract just the recent items table from the dashboard page
  dashboardPage.split('\n').filter((_, i) => i > 0).join('\n'),
  '',
  '<!-- ANALYTICS CHART PATTERNS (hand-written) -->',
  chartSnippets,
].join('\n')

// ── CORRAD_SHELL_TEMPLATE ─────────────────────────────────────────────────
//
// Hand-written admin shell. The LLM never sees or generates this.
// Placeholders (wrapped in {{ }}) are replaced server-side by assembleHtml().
//
// Placeholders:
//   {{SYSTEM_NAME}}       — 2-4 word system name
//   {{SHORT_DESCRIPTION}} — one-line subtitle
//   {{NAV_ITEMS_HTML}}    — rendered sidebar nav from model.navGroups
//   {{MODALS_HTML}}       — concatenated modal HTML from model.modals
//   {{PAGES_JS}}          — serialized window.__pages object
//   {{PAGE_TITLES_JS}}    — serialized window.__pageTitles object
//   {{INITIAL_PAGE_KEY}}  — first page key (used to call navigate() on load)

const shellTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{SYSTEM_NAME}}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${baseCss}
  </style>
</head>
<body>
<div class="min-h-screen bg-[#f8f9fb]">

  <!-- TOPBAR -->
  <header class="sticky top-0 z-40 flex h-10 items-center justify-between border-b border-slate-200 bg-white px-5">
    <div class="flex items-center gap-2">
      <div class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-violet-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-[11px] w-[11px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <span class="text-sm font-semibold text-slate-900">{{SYSTEM_NAME}}</span>
    </div>
    <div class="flex items-center self-stretch">
      <div id="topbar-toast-slot" class="flex items-center"></div>
      <span class="h-full w-px bg-slate-200"></span>
      <div id="topbar-page-title" class="hidden items-center px-4 text-sm font-medium text-slate-600 sm:flex"></div>
      <span class="h-full w-px bg-slate-200 hidden sm:block"></span>
      <div class="flex h-full items-center gap-2 px-4">
        <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-[10px] font-semibold text-white">AD</div>
        <div class="leading-tight hidden sm:block">
          <p class="text-sm font-medium text-slate-700">Admin User</p>
          <p class="text-[11px] text-slate-500">Administrator</p>
        </div>
      </div>
    </div>
  </header>

  <!-- SIDEBAR + MAIN -->
  <div class="flex flex-col md:flex-row">

    <aside class="w-full flex-col border-b border-slate-200 bg-slate-50/50 md:flex md:w-64 md:min-h-[calc(100vh-40px)] md:border-b-0 md:border-r">
      <nav class="flex-1 p-3">
        {{NAV_ITEMS_HTML}}
      </nav>
      <div class="border-t border-slate-200 px-3 py-2.5">
        <p class="text-[11px] text-slate-400">{{SYSTEM_NAME}} v1.0</p>
      </div>
    </aside>

    <main id="page-root" class="w-full min-w-0 flex-1 bg-white p-3 md:p-4">
      <!-- page content injected by navigate() -->
    </main>

  </div>
</div>

<!-- MODAL ROOT — modals rendered here, hidden by default -->
<div id="modal-root">{{MODALS_HTML}}</div>

<!-- STATIC JS HELPERS -->
<script>
(function() {
  window.__pages = {{PAGES_JS}};
  window.__pageTitles = {{PAGE_TITLES_JS}};
  window.__currentPage = null;

  window.navigate = function(key) {
    var pages = window.__pages;
    if (!pages || !pages[key]) return;
    var root = document.getElementById('page-root');
    if (root) root.innerHTML = pages[key]();
    window.__currentPage = key;
    // Update topbar page title
    var titleEl = document.getElementById('topbar-page-title');
    if (titleEl && window.__pageTitles && window.__pageTitles[key]) {
      titleEl.textContent = window.__pageTitles[key];
    }
    // Update sidebar active state
    document.querySelectorAll('[data-nav-key]').forEach(function(el) {
      var isActive = el.getAttribute('data-nav-key') === key;
      if (isActive) {
        el.classList.add('border-violet-200', 'bg-violet-50', 'text-violet-700');
        el.classList.remove('border-transparent', 'text-slate-900');
        el.querySelectorAll('svg').forEach(function(icon) {
          icon.classList.add('text-violet-700');
          icon.classList.remove('text-slate-400');
        });
      } else {
        el.classList.remove('border-violet-200', 'bg-violet-50', 'text-violet-700');
        el.classList.add('border-transparent', 'text-slate-900');
        el.querySelectorAll('svg').forEach(function(icon) {
          icon.classList.remove('text-violet-700');
          icon.classList.add('text-slate-400');
        });
      }
    });
  };

  window.openModal = function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.style.display = '';
    }
  };

  window.closeModal = function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  };

  window.showToast = function(message, type) {
    var slot = document.getElementById('topbar-toast-slot');
    if (!slot) return;
    var configs = {
      success: { bg: 'bg-gradient-to-br from-emerald-200 to-emerald-100 text-emerald-950', label: 'Success' },
      error:   { bg: 'bg-gradient-to-br from-rose-200 to-rose-100 text-rose-950',     label: 'Error' },
      info:    { bg: 'bg-gradient-to-br from-blue-200 to-blue-100 text-blue-950',      label: 'Info' }
    };
    var cfg = configs[type] || configs.info;
    var toast = document.createElement('div');
    toast.className = 'flex h-10 min-w-[12rem] items-center overflow-hidden px-2 py-1 shadow-sm ' + cfg.bg;
    toast.innerHTML = '<div class="min-w-0 flex-1 px-1"><p class="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.11em] opacity-70">' + cfg.label + '</p><p class="mt-[2px] truncate text-xs font-semibold leading-tight">' + message + '</p></div>';
    slot.innerHTML = '';
    slot.appendChild(toast);
    setTimeout(function() { if (slot.contains(toast)) slot.innerHTML = ''; }, 3000);
  };

  window.sortTable = function(tableId, colIdx) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var rows = Array.from(tbody.querySelectorAll('tr'));
    var prevCol = table.getAttribute('data-sort-col');
    var prevDir = table.getAttribute('data-sort-dir');
    var asc = (prevCol == colIdx && prevDir === 'asc') ? false : true;
    table.setAttribute('data-sort-col', colIdx);
    table.setAttribute('data-sort-dir', asc ? 'asc' : 'desc');
    rows.sort(function(a, b) {
      var aT = (a.cells[colIdx] || {}).innerText || '';
      var bT = (b.cells[colIdx] || {}).innerText || '';
      return asc ? aT.localeCompare(bT) : bT.localeCompare(aT);
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
  };

  window.switchTab = function(groupId, tabKey) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('[data-tab-panel]').forEach(function(p) {
      p.classList.toggle('hidden', p.getAttribute('data-tab-panel') !== tabKey);
    });
    group.querySelectorAll('[data-tab-btn]').forEach(function(b) {
      var active = b.getAttribute('data-tab-btn') === tabKey;
      if (active) {
        b.classList.add('border-b-2', 'border-violet-600', 'text-violet-700', 'font-medium');
        b.classList.remove('text-slate-500');
      } else {
        b.classList.remove('border-b-2', 'border-violet-600', 'text-violet-700', 'font-medium');
        b.classList.add('text-slate-500');
      }
    });
  };

  window.toggleDropdown = function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
  };

  // Boot — navigate to initial page
  navigate('{{INITIAL_PAGE_KEY}}');
})();
</script>
</body>
</html>`

// ── PROTOTYPE_SYSTEM_PROMPT_EXTENSION ────────────────────────────────────
//
// Uses a hybrid output format: JSON for structure (no page HTML embedded),
// delimited blocks for page HTML. This avoids all JSON string encoding issues
// with HTML content (unescaped quotes, newlines, etc.).

const promptExtension = `
## OUTPUT FORMAT

Return your response in exactly TWO sections, in this order. No other text.

### SECTION 1 — STRUCTURE (JSON, no page HTML)

Emit a single line starting with "STRUCTURE:" followed by a compact JSON object.
Do NOT include html fields for pages here. Modal html IS included here (keep modals small).
Use single quotes for all HTML attributes inside modal html strings.

STRUCTURE:{"systemName":"Short Name","shortDescription":"One-line subtitle","navGroups":[{"label":"MAIN","items":[{"key":"dashboard","title":"Dashboard","icon":"<svg xmlns='http://www.w3.org/2000/svg' class='h-4 w-4 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>"}]}],"pages":[{"key":"dashboard","title":"Dashboard","type":"dashboard"},{"key":"users","title":"Users","type":"list"}],"modals":[{"id":"confirm-delete","html":"<div id='confirm-delete' class='hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm'><div class='w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl'><p class='text-base font-semibold text-slate-900'>Delete item?</p><p class='mt-1 text-sm text-slate-600'>This cannot be undone.</p><div class='mt-4 flex justify-end gap-2'><button onclick='closeModal(\"confirm-delete\")' class='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50'>Cancel</button><button onclick='closeModal(\"confirm-delete\");showToast(\"Deleted\",\"success\")' class='rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700'>Delete</button></div></div></div>"}]}

### SECTION 2 — PAGE HTML BLOCKS

One block per page, using exactly these delimiters (key must match STRUCTURE pages array):

---PAGE:dashboard---
<div class="mx-auto max-w-7xl space-y-5">
  ... dashboard page HTML here ...
</div>
---END_PAGE---

---PAGE:users---
<div class="...">...</div>
---END_PAGE---

Page HTML rules:
- Fragment only — no <html>, <head>, <body>, <script>, <style>, <link> tags
- Do NOT include a page-title h1 (the shell topbar shows the current page title)
- Tailwind utility classes only; only permitted inline style: style="width: X%" on bar chart fills
- Tables must have id="tbl-<pagekey>" and be wrapped in <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
- List pages: 10-15 sample rows with varied status badges
- Wire interactivity via onclick: openModal('id'), closeModal('id'), showToast('msg','success'|'error'|'info'), sortTable('tbl-id',colIdx), switchTab('group-id','tab-key'), toggleDropdown('id'), navigate('page-key')
- Icons: inline SVG only with class="h-4 w-4" — never emoji or remote URL
- You may freely use double or single quotes for HTML attributes here (no JSON escaping needed)

## REQUIRED PAGES (generate 6-8)

1. Dashboard (type:dashboard) — hero banner + 4 stat cards + 1 bar chart + 1 donut + recent activity table
2-3. Entity list pages (type:list) — search bar + filter tabs + sortable table + "+ New" button
1. Detail/edit (type:detail) — breadcrumb + switchTab tabs + form grid + Save button
1. Analytics (type:analytics) — date range selector + 2 bar charts + breakdown table
1. Settings (type:settings) — switchTab layout + grouped form fields
Optional: audit log (type:audit) timeline, empty-state (type:empty)

## SAMPLE DATA

- Use real entity/field names from the source document vocabulary
- Status badges: emerald=Active/Approved, slate=Draft/Pending, rose=Inactive/Rejected
- Realistic IDs: INV-2026-0142, REQ-001, BRS-2026-031
- Dates within last 30 days; plausible numbers for the domain

## LANGUAGE

All UI text (labels, headers, buttons, form fields, sample data) must match the source document language.
Bahasa Malaysia document → Bahasa Malaysia UI. English document → English UI.

## ANALYTICS CHARTS

Use only the patterns from the snippets: CSS bar rows, SVG sparkline, SVG donut arc.
Never embed Chart.js, D3, or any external library.

## FORBIDDEN TAILWIND CLASSES

Never use: red-*, purple-*, indigo-*, pink-*, fuchsia-*, orange-*, yellow-*, lime-*, teal-*, cyan-*, sky-*, amber-*
Never use: shadow-md, shadow-xl, rounded-sm, rounded-2xl, rounded-3xl
`

// ── Write output ───────────────────────────────────────────────────────────

const forbiddenClasses = rules.forbidden_classes
const forbiddenColorPrefixes = rules.palette.forbidden_color_prefixes

const output = `// GENERATED — DO NOT EDIT — regenerate with: npm run bundle:corrad
// Source: corrad-design/ folder
// deno-lint-ignore-file

/**
 * Corrad design system constants bundled for Deno edge functions.
 *
 * Exports:
 *   CORRAD_SYSTEM_PROMPT          — system-prompt.md verbatim
 *   CORRAD_SNIPPETS_COMPACT       — curated few-shot snippets (~4k tokens)
 *   CORRAD_BASE_CSS               — preview/base.css verbatim
 *   CORRAD_FORBIDDEN_CLASSES      — forbidden Tailwind classes array
 *   CORRAD_FORBIDDEN_COLOR_PREFIXES — forbidden color prefix strings array
 *   CORRAD_SHELL_TEMPLATE         — hand-written HTML shell with {{PLACEHOLDERS}}
 *   PROTOTYPE_SYSTEM_PROMPT_EXTENSION — JSON output format + page rules addendum
 */

export const CORRAD_SYSTEM_PROMPT = \`${escTs(systemPrompt)}\`

export const CORRAD_SNIPPETS_COMPACT = \`${escTs(snippetsCompact)}\`

export const CORRAD_BASE_CSS = \`${escTs(baseCss)}\`

export const CORRAD_FORBIDDEN_CLASSES: string[] = ${JSON.stringify(forbiddenClasses, null, 2)}

export const CORRAD_FORBIDDEN_COLOR_PREFIXES: string[] = ${JSON.stringify(forbiddenColorPrefixes, null, 2)}

export const CORRAD_SHELL_TEMPLATE = \`${escTs(shellTemplate)}\`

export const PROTOTYPE_SYSTEM_PROMPT_EXTENSION = \`${escTs(promptExtension)}\`
`

const outPath = resolve(ROOT, 'supabase/functions/_shared/corradDesign.ts')
writeFileSync(outPath, output, 'utf8')
console.log(`✓ Written: supabase/functions/_shared/corradDesign.ts (${Math.round(output.length / 1024)}KB)`)
console.log(`  CORRAD_SYSTEM_PROMPT: ${systemPrompt.length} chars`)
console.log(`  CORRAD_SNIPPETS_COMPACT: ${snippetsCompact.length} chars`)
console.log(`  CORRAD_SHELL_TEMPLATE: ${shellTemplate.length} chars`)
console.log(`  CORRAD_FORBIDDEN_CLASSES: ${forbiddenClasses.length} entries`)
