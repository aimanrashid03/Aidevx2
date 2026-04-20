// GENERATED — DO NOT EDIT — regenerate with: npm run bundle:corrad
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
 *   CORRAD_ICON_MAP               — icon name → SVG lookup for server-side resolution
 *   CORRAD_SHELL_TEMPLATE         — hand-written HTML shell with {{PLACEHOLDERS}}
 *   PROTOTYPE_SYSTEM_PROMPT_EXTENSION — JSON output format + page rules addendum
 */

export const CORRAD_SYSTEM_PROMPT = `# Corrad Design System — LLM System Prompt

You generate UI mockups using the Corrad design system. Output plain HTML with Tailwind CSS utility classes only. Never use custom CSS, inline \`style=""\` attributes, CSS variables, Bootstrap, Material UI, or any other framework.

---

## Output format

- Self-contained HTML fragments only (no \`<html>\`, \`<head>\`, or \`<body>\` tags unless generating a full page shell)
- All interactivity implied through visual state classes only — no JavaScript
- Use ALL-CAPS placeholders for dynamic content: \`USER NAME\`, \`DASHBOARD TITLE\`, \`12,450\`
- Lucide icons referenced as \`<svg>\` inline or as \`<i data-lucide="icon-name" class="h-4 w-4"></i>\`

---

## Color palette

**Accent (violet):**
- Tints: \`bg-violet-50\`, \`bg-violet-100\`, \`bg-violet-200\`
- Main: \`bg-violet-500\`, \`text-violet-500\`
- Primary: \`bg-violet-600\`, \`text-violet-600\` ← default accent action color
- Dark: \`bg-violet-700\`, \`text-violet-700\`
- Ring/focus: \`ring-violet-400\`, \`focus:ring-violet-400\`
- Active nav: \`border border-violet-200 bg-violet-50 text-violet-700\`

**Neutral (slate):**
- Page/app shell bg: \`bg-[#f8f9fb]\`
- Card/panel bg: \`bg-white\`
- Public page bg: \`bg-slate-100\`
- Borders: \`border-slate-200\` (use everywhere by default), \`border-slate-300\` (secondary buttons only)
- Text headings: \`text-slate-900\`
- Text body: \`text-slate-600\`
- Text meta/captions: \`text-slate-500\`
- Text muted/icons: \`text-slate-400\`
- Dividers: \`bg-slate-200\`

**Status:**
- Success: \`bg-emerald-500\`, tint \`bg-emerald-100\`, text \`text-emerald-800\`
- Error/destructive: \`bg-rose-600\`, tint \`bg-rose-100\`, text \`text-rose-700\` — **never** use \`red-*\`
- Info: \`bg-blue-500\`, tint \`bg-blue-100\`, text \`text-blue-800\`
- Warning indicator: \`bg-rose-500\` (small dot only)

**Forbidden colors:** \`red-*\`, \`purple-*\`, \`indigo-*\`, \`pink-*\`, \`fuchsia-*\`, \`orange-*\`, \`yellow-*\`

---

## Border radius

| Context | Class |
|---|---|
| Nav items, pills, compact elements | \`rounded-md\` |
| Buttons, cards, dialogs, inputs (default) | \`rounded-lg\` |
| Feature/hero cards | \`rounded-xl\` |
| Avatars, icon badges, status dots | \`rounded-full\` |

Never use: \`rounded-sm\`, \`rounded-2xl\`, \`rounded-3xl\`

---

## Shadows

| Context | Class |
|---|---|
| Cards, inputs | \`shadow-sm\` |
| Dropdowns, popovers, tooltips | \`shadow-lg\` |
| Modals, dialogs | \`shadow-2xl\` |

Never use \`shadow-md\`.

---

## Spacing

Keep spacing tight:
- Default gap: \`gap-2\` or \`gap-2.5\`
- Nav item padding: \`px-3 py-1.5\`
- Card body padding: \`p-4\` (compact) or \`p-6\` (spacious)
- Page main area: \`p-3 md:p-4\`
- Button padding: \`px-4 py-2\`
- Form input padding: \`px-3 py-[9px]\`

---

## Typography

| Role | Classes |
|---|---|
| Page title (gradient) | \`.page-title\` (use this class — defined in base.css) |
| Section heading | \`text-2xl font-semibold text-slate-900\` |
| Card heading | \`text-base font-semibold text-slate-900\` |
| Body text | \`text-sm text-slate-600\` |
| Meta / caption | \`text-xs text-slate-500\` |
| Section eyebrow label | \`text-[11px] font-semibold uppercase tracking-wider text-slate-400\` |
| Toast/badge label | \`text-[10px] font-semibold uppercase tracking-[0.11em]\` |
| Input label | \`text-[13px] font-medium\` |

Default font is Tailwind's sans (system UI stack). Never specify a custom font-family.

---

## Buttons

**Primary dark** (default action):
\`\`\`
bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors
\`\`\`

**Primary accent gradient** (hero/CTA):
\`\`\`
bg-gradient-to-br from-violet-600 to-violet-500 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all hover:from-violet-700 hover:to-violet-600
\`\`\`

**Secondary** (outline):
\`\`\`
border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors
\`\`\`

**Destructive**:
\`\`\`
bg-rose-600 text-white hover:bg-rose-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors
\`\`\`

**Ghost/inline**:
\`\`\`
text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-1.5 text-sm transition-colors
\`\`\`

---

## Hover patterns

- Nav/menu items: \`hover:bg-violet-50\` (in sidebar) or \`hover:bg-slate-100\` (in storefront nav)
- Table/list rows: \`hover:bg-slate-50\`
- Topbar icon buttons: \`hover:bg-violet-600 hover:text-white\` (fills entire button area)
- Cards as clickable: \`hover:bg-slate-50 transition-colors\`
- Active/selected nav item: \`border border-violet-200 bg-violet-50 text-violet-700 font-medium\`

---

## Cards

Default card:
\`\`\`
rounded-lg border border-slate-200 bg-white shadow-sm
\`\`\`

Feature card (hero/prominent):
\`\`\`
rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden
\`\`\`

Banner/hero section:
\`\`\`
rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm
\`\`\`

---

## Icons

Use Lucide icons via the named placeholder syntax — **NEVER write inline SVG**:

\`\`\`html
<i data-icon="name" class="h-4 w-4"></i>
\`\`\`

Standard sizes:
- Default: \`h-4 w-4\`
- Compact (inside badges, small controls): \`h-3.5 w-3.5\`
- Hero/emphasis: \`h-5 w-5\`

Allowed icon names: \`home\`, \`users\`, \`user\`, \`file-text\`, \`settings\`, \`bar-chart\`, \`bar-chart-2\`, \`search\`, \`plus\`, \`edit\`, \`trash\`, \`eye\`, \`check\`, \`x\`, \`bell\`, \`calendar\`, \`shield\`, \`download\`, \`upload\`, \`filter\`, \`chevron-right\`, \`chevron-down\`, \`arrow-up\`, \`arrow-down\`, \`clock\`, \`mail\`, \`database\`, \`layout-dashboard\`, \`list\`, \`package\`, \`activity\`, \`alert-circle\`, \`log-out\`

Icon color inherits text color. In muted contexts: \`text-slate-400\`. In active nav: \`text-violet-700\`.

---

## Admin layout patterns

**Topbar:** sticky, 40px tall (\`h-10\`), white bg, \`border-b border-slate-200\`, divided by \`<span class="h-full w-px bg-slate-200">\` separators. Icon buttons fill with \`hover:bg-violet-600 hover:text-white\`.

**Sidebar:** \`bg-slate-50/50 border-r border-slate-200\`, width \`w-64\` (expanded) / \`w-14\` (collapsed). Section labels use eyebrow style. Active item: \`border border-violet-200 bg-violet-50 text-violet-700\`. Nested children indented with \`ml-5 border-l-2 border-slate-200 pl-4\`.

**Main content area:** \`bg-white p-3 md:p-4 flex-1 min-w-0\`

---

## Modals and overlays

Backdrop: \`fixed inset-0 bg-slate-900/50 backdrop-blur-sm\`
Dialog: \`w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl\`

---

## Toasts

Appear inline in the topbar. Gradient backgrounds by variant:
- Success: \`bg-gradient-to-br from-emerald-200 to-emerald-100 text-emerald-950\`
- Error: \`bg-gradient-to-br from-rose-200 to-rose-100 text-rose-950\`
- Info: \`bg-gradient-to-br from-blue-200 to-blue-100 text-blue-950\`

---

## Forbidden

Never use:
- Any \`style=""\` attribute
- Hex color values in classes (e.g., \`bg-[#abc123]\`) — exception: \`bg-[#f8f9fb]\` for app shell bg
- \`shadow-md\`
- \`rounded-sm\`, \`rounded-2xl\`, \`rounded-3xl\`
- \`red-*\` colors (use \`rose-*\`)
- \`purple-*\`, \`indigo-*\`, \`pink-*\`, \`fuchsia-*\` colors
- Emoji as icons
- Any non-Tailwind utility class other than \`.page-title\`
`

export const CORRAD_SNIPPETS_COMPACT = `<!-- === CORRAD SNIPPETS: CURATED REFERENCE SET === -->

<!-- STAT CARDS -->

<!-- Basic stat card — number + label + icon -->
<article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <p class="text-xs font-medium text-slate-500">METRIC LABEL</p>
    <!-- replace icon to match metric -->
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
  </div>
  <p class="mt-2 text-2xl font-semibold text-slate-900">1,234</p>
</article>

<!-- Stat card grid — 3 columns, standard dashboard layout -->
<div class="grid gap-3 sm:grid-cols-3">
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-slate-500">Total Users</p>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    </div>
    <p class="mt-2 text-2xl font-semibold text-slate-900">2,847</p>
  </article>
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-slate-500">Total Posts</p>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
    </div>
    <p class="mt-2 text-2xl font-semibold text-slate-900">148</p>
  </article>
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-slate-500">Media Files</p>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
    </div>
    <p class="mt-2 text-2xl font-semibold text-slate-900">63</p>
  </article>
</div>

<!-- Stat card with trend indicator -->
<article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <p class="text-xs font-medium text-slate-500">Monthly Revenue</p>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  </div>
  <p class="mt-2 text-2xl font-semibold text-slate-900">$12,450</p>
  <p class="mt-1 flex items-center gap-1 text-xs text-emerald-600">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    +12% from last month
  </p>
</article>


<!-- CONFIRM DIALOG -->
<!-- Source: client/src/components/AppConfirmDialog.vue -->

<!-- Destructive confirm dialog (delete, remove, revoke) -->
<div class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
  <div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
    <div class="flex items-start gap-2.5">
      <!-- Icon badge — rose for destructive -->
      <div class="mt-0.5 rounded-full p-1.5 bg-rose-100 text-rose-600">
        <!-- alert-triangle icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-slate-900">Delete ITEM NAME?</h3>
        <p class="mt-1 text-sm text-slate-600">This action cannot be undone. ITEM NAME will be permanently removed.</p>
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50">
        Cancel
      </button>
      <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700">
        Delete
      </button>
    </div>
  </div>
</div>

<!-- Neutral confirm dialog (confirm, proceed, submit) -->
<div class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
  <div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
    <div class="flex items-start gap-2.5">
      <!-- Icon badge — slate for neutral -->
      <div class="mt-0.5 rounded-full p-1.5 bg-slate-100 text-slate-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-slate-900">CONFIRM TITLE</h3>
        <p class="mt-1 text-sm text-slate-600">CONFIRMATION MESSAGE explaining what will happen if the user proceeds.</p>
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50">
        Cancel
      </button>
      <button class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800">
        Confirm
      </button>
    </div>
  </div>
</div>


<!-- TOAST VARIANTS -->
<!-- Source: client/src/components/AppToastRegion.vue -->

<!-- Success toast -->
<div class="relative flex h-10 min-w-[14rem] max-w-[22rem] items-center overflow-hidden px-2 py-1 shadow-sm bg-gradient-to-br from-emerald-200 to-emerald-100 text-emerald-950">
  <div class="flex items-center gap-2">
    <div class="rounded-full p-0.5 bg-emerald-200 text-emerald-800 ring-1 ring-emerald-400/70">
      <!-- check-circle-2 icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.11em] opacity-70">Success</p>
      <p class="mt-[2px] truncate text-xs font-semibold leading-tight">
        TOAST TITLE<span class="font-normal opacity-90"> - Optional detail message.</span>
      </p>
    </div>
  </div>
</div>

<!-- Error toast -->
<div class="relative flex h-10 min-w-[14rem] max-w-[22rem] items-center overflow-hidden px-2 py-1 shadow-sm bg-gradient-to-br from-rose-200 to-rose-100 text-rose-950">
  <div class="flex items-center gap-2">
    <div class="rounded-full p-0.5 bg-rose-200 text-rose-800 ring-1 ring-rose-400/70">
      <!-- x-circle icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.11em] opacity-70">Error</p>
      <p class="mt-[2px] truncate text-xs font-semibold leading-tight">
        ERROR TITLE<span class="font-normal opacity-90"> - Something went wrong.</span>
      </p>
    </div>
  </div>
</div>

<!-- Info toast -->
<div class="relative flex h-10 min-w-[14rem] max-w-[22rem] items-center overflow-hidden px-2 py-1 shadow-sm bg-gradient-to-br from-blue-200 to-blue-100 text-blue-950">
  <div class="flex items-center gap-2">
    <div class="rounded-full p-0.5 bg-blue-200 text-blue-800 ring-1 ring-blue-400/70">
      <!-- info icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.11em] opacity-70">Info</p>
      <p class="mt-[2px] truncate text-xs font-semibold leading-tight">
        INFO TITLE<span class="font-normal opacity-90"> - Informational detail.</span>
      </p>
    </div>
  </div>
</div>


<!-- FEATURE CARD / HERO BANNER -->
<!-- Use rounded-xl (not rounded-lg) — signals a prominent/featured piece of content -->

<!-- Article / feature card with image -->
<article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
  <img src="https://placehold.co/600x200" alt="FEATURED IMAGE ALT" class="h-56 w-full object-cover" />
  <div class="space-y-5 p-6">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900">ARTICLE TITLE</h1>
    <p class="text-sm text-slate-600 leading-relaxed">ARTICLE BODY or excerpt. This is where the main content or summary appears below the title.</p>
  </div>
</article>

<!-- Feature card without image — text-only -->
<article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-6">
  <h2 class="text-2xl font-bold tracking-tight text-slate-900">SECTION TITLE</h2>
  <p class="mt-3 text-sm text-slate-600 leading-relaxed">DESCRIPTION of this feature or content section.</p>
  <a href="#" class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors">
    Read more
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </a>
</article>

<!-- Blog post preview card — compact, list view -->
<article class="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <img src="https://placehold.co/80x80" alt="POST THUMBNAIL" class="h-20 w-20 shrink-0 rounded-lg object-cover" />
  <div class="min-w-0 flex-1">
    <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CATEGORY</p>
    <h3 class="mt-0.5 text-base font-semibold text-slate-900 truncate">POST TITLE</h3>
    <p class="mt-1 text-sm text-slate-500 line-clamp-2">SHORT EXCERPT from the post content.</p>
    <p class="mt-2 text-xs text-slate-400">JANUARY 15, 2025</p>
  </div>
</article>

<!-- Dashboard hero banner — rounded-2xl, gradient bg (the one exception to rounded-xl max) -->
<div class="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm">
  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">SECTION EYEBROW</p>
  <h1 class="mt-2 text-2xl font-semibold text-slate-900">PAGE TITLE</h1>
  <p class="mt-1 text-sm text-slate-500">SUBTITLE or description of what this section contains.</p>
  <button class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
    PRIMARY ACTION
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </button>
</div>


<!-- DASHBOARD RECENT TABLE (from dashboard page) -->
<!-- Source: client/src/views/MainDashboardView.vue -->
<!-- Drop this inside <main> of admin-shell.html -->

<div class="mx-auto max-w-7xl space-y-5">

  <!-- Hero banner -->
  <div class="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">SECTION EYEBROW</p>
    <h1 class="mt-2 text-2xl font-semibold text-slate-900">DASHBOARD TITLE</h1>
    <p class="mt-1 text-sm text-slate-500">SUBTITLE or description of what this workspace is for.</p>
    <button class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
      PRIMARY ACTION
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </button>
  </div>

  <!-- Stat cards — 3 column grid -->
  <div class="grid gap-3 sm:grid-cols-3">
    <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-slate-500">METRIC A</p>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <p class="mt-2 text-2xl font-semibold text-slate-900">148</p>
    </article>
    <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-slate-500">METRIC B</p>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      </div>
      <p class="mt-2 text-2xl font-semibold text-slate-900">32</p>
    </article>
    <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-slate-500">METRIC C</p>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </div>
      <p class="mt-2 text-2xl font-semibold text-slate-900">63</p>
    </article>
  </div>

  <!-- Quick-action cards — 3 column grid -->
  <div class="grid gap-3 md:grid-cols-3">
    <button class="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        ACTION A
      </div>
      <p class="mt-1 text-xs text-slate-500">DESCRIPTION of what this action does.</p>
    </button>
    <button class="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        ACTION B
      </div>
      <p class="mt-1 text-xs text-slate-500">DESCRIPTION of what this action does.</p>
    </button>
    <button class="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        ACTION C
      </div>
      <p class="mt-1 text-xs text-slate-500">DESCRIPTION of what this action does.</p>
    </button>
  </div>

  <!-- Recent items table -->
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div class="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-900">Recent ITEMS</h3>
      <button class="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-1.5 text-xs transition-colors">View all</button>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-200 bg-slate-50">
          <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">NAME</th>
          <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">STATUS</th>
          <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">DATE</th>
          <th class="px-4 py-2.5"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-3 font-medium text-slate-900">ITEM NAME</td>
          <td class="px-4 py-3"><span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Active</span></td>
          <td class="px-4 py-3 text-slate-500">Jan 15, 2025</td>
          <td class="px-4 py-3 text-right"><button class="text-xs text-slate-400 hover:text-slate-700">Edit</button></td>
        </tr>
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-3 font-medium text-slate-900">ITEM NAME</td>
          <td class="px-4 py-3"><span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Draft</span></td>
          <td class="px-4 py-3 text-slate-500">Jan 14, 2025</td>
          <td class="px-4 py-3 text-right"><button class="text-xs text-slate-400 hover:text-slate-700">Edit</button></td>
        </tr>
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-3 font-medium text-slate-900">ITEM NAME</td>
          <td class="px-4 py-3"><span class="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">Inactive</span></td>
          <td class="px-4 py-3 text-slate-500">Jan 12, 2025</td>
          <td class="px-4 py-3 text-right"><button class="text-xs text-slate-400 hover:text-slate-700">Edit</button></td>
        </tr>
      </tbody>
    </table>
  </div>

</div>


<!-- ANALYTICS CHART PATTERNS (hand-written) -->

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

export const CORRAD_BASE_CSS = `/*
 * Corrad Design System — Preview Base CSS
 *
 * Drop this into the preview iframe's <style> tag alongside Tailwind CDN.
 * This only defines what Tailwind's utility classes can't express.
 * Works with both Tailwind CDN and JIT builds.
 */

body {
  background: #f8f9fb;
  color: rgb(15 23 42); /* slate-900 */
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/*
 * .page-title
 * Gradient-clipped text for page/section headings.
 * Usage: <h1 class="page-title">Dashboard</h1>
 */
.page-title {
  background-image: linear-gradient(to right, #7c3aed, #8b5cf6, #6d28d9);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}
`

export const CORRAD_FORBIDDEN_CLASSES: string[] = [
  "shadow-md",
  "shadow-xl",
  "rounded-sm",
  "rounded-2xl",
  "rounded-3xl"
]

export const CORRAD_FORBIDDEN_COLOR_PREFIXES: string[] = [
  "red-",
  "purple-",
  "indigo-",
  "pink-",
  "fuchsia-",
  "orange-",
  "yellow-",
  "lime-",
  "teal-",
  "cyan-",
  "sky-",
  "amber-"
]

export const CORRAD_ICON_MAP: Record<string, string> = {
  "home": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>",
  "users": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/></svg>",
  "user": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/></svg>",
  "file-text": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/><polyline points=\"10 9 9 9 8 9\"/></svg>",
  "settings": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z\"/></svg>",
  "bar-chart": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"10\"/><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"4\"/><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"16\"/></svg>",
  "bar-chart-2": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"10\"/><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"/><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"14\"/></svg>",
  "search": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"8\"/><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"/></svg>",
  "plus": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/></svg>",
  "edit": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>",
  "trash": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\"/></svg>",
  "eye": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>",
  "check": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"20 6 9 17 4 12\"/></svg>",
  "x": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg>",
  "bell": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"/></svg>",
  "calendar": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/></svg>",
  "shield": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></svg>",
  "download": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>",
  "upload": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"17 8 12 3 7 8\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"15\"/></svg>",
  "filter": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\"/></svg>",
  "chevron-right": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"9 18 15 12 9 6\"/></svg>",
  "chevron-down": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"/></svg>",
  "arrow-up": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"5\"/><polyline points=\"5 12 12 5 19 12\"/></svg>",
  "arrow-down": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><polyline points=\"19 12 12 19 5 12\"/></svg>",
  "clock": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/></svg>",
  "mail": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z\"/><polyline points=\"22,6 12,13 2,6\"/></svg>",
  "database": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M21 12c0 1.66-4 3-9 3s-9-1.34-9-3\"/><path d=\"M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5\"/></svg>",
  "layout-dashboard": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"9\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\"/></svg>",
  "list": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"8\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"8\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"8\" y1=\"18\" x2=\"21\" y2=\"18\"/><line x1=\"3\" y1=\"6\" x2=\"3.01\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"3.01\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"3.01\" y2=\"18\"/></svg>",
  "package": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"16.5\" y1=\"9.4\" x2=\"7.5\" y2=\"4.21\"/><path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"/><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"/><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"/></svg>",
  "activity": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/></svg>",
  "alert-circle": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/></svg>",
  "log-out": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"{{CLASS}}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" y1=\"12\" x2=\"9\" y2=\"12\"/></svg>"
}

export const CORRAD_SHELL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{SYSTEM_NAME}}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
/*
 * Corrad Design System — Preview Base CSS
 *
 * Drop this into the preview iframe's <style> tag alongside Tailwind CDN.
 * This only defines what Tailwind's utility classes can't express.
 * Works with both Tailwind CDN and JIT builds.
 */

body {
  background: #f8f9fb;
  color: rgb(15 23 42); /* slate-900 */
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/*
 * .page-title
 * Gradient-clipped text for page/section headings.
 * Usage: <h1 class="page-title">Dashboard</h1>
 */
.page-title {
  background-image: linear-gradient(to right, #7c3aed, #8b5cf6, #6d28d9);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

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

export const PROTOTYPE_SYSTEM_PROMPT_EXTENSION = `
## OUTPUT FORMAT

Return your response in exactly TWO sections, in this order. No other text.

### SECTION 1 — STRUCTURE (JSON, no page HTML)

Emit a single line starting with "STRUCTURE:" followed by a compact JSON object.
Do NOT include html fields for pages here. Modal html IS included here (keep modals small, max 2 modals, each under 15 lines of HTML).
For nav item icons, use the icon name string (e.g. "home", "users") — NOT inline SVG.
Use single quotes for all HTML attributes inside modal html strings.

STRUCTURE:{"systemName":"Short Name","shortDescription":"One-line subtitle","navGroups":[{"label":"MAIN","items":[{"key":"dashboard","title":"Dashboard","icon":"layout-dashboard"},{"key":"users","title":"Users","icon":"users"}]}],"pages":[{"key":"dashboard","title":"Dashboard","type":"dashboard"},{"key":"users","title":"Users","type":"list"}],"modals":[{"id":"confirm-delete","html":"<div id='confirm-delete' class='hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm'><div class='w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl'><p class='text-base font-semibold text-slate-900'>Delete item?</p><p class='mt-1 text-sm text-slate-600'>This cannot be undone.</p><div class='mt-4 flex justify-end gap-2'><button onclick='closeModal("confirm-delete")' class='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50'>Cancel</button><button onclick='closeModal("confirm-delete");showToast("Deleted","success")' class='rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700'>Delete</button></div></div></div>"}]}

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
- List pages: 5-8 sample rows with varied status badges
- Wire interactivity via onclick: openModal('id'), closeModal('id'), showToast('msg','success'|'error'|'info'), sortTable('tbl-id',colIdx), switchTab('group-id','tab-key'), toggleDropdown('id'), navigate('page-key')
- Icons: use <i data-icon="name" class="h-4 w-4"></i> — NEVER write inline SVG for icons. Allowed names: home, users, user, file-text, settings, bar-chart, bar-chart-2, search, plus, edit, trash, eye, check, x, bell, calendar, shield, download, upload, filter, chevron-right, chevron-down, arrow-up, arrow-down, clock, mail, database, layout-dashboard, list, package, activity, alert-circle, log-out
- You may freely use double or single quotes for HTML attributes here (no JSON escaping needed)

## REQUIRED PAGES (generate 5-7)

1. Dashboard (type:dashboard) — hero banner + 3-4 stat cards + 1 chart (bar or donut, not both) + recent activity table (5 rows max)
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
