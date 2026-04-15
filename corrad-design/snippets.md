# Corrad Design System — Snippet Library

Use this file for simple single-file prompt injection. Each section contains a named snippet with usage guidance followed by the HTML markup.

For embedding-based retrieval, index each file in `snippets/` individually — the top comment in each file serves as the retrieval document.

---

## SNIPPET: buttons

**Use when:** rendering any interactive action
**Avoid when:** links that navigate (use `<a>` instead)

```html
<!-- Primary Dark — default action button -->
<button class="bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
  Save Changes
</button>

<!-- Primary Accent Gradient — hero CTA, use sparingly -->
<button class="bg-gradient-to-br from-violet-600 to-violet-500 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all hover:from-violet-700 hover:to-violet-600 flex items-center gap-2">
  Get Started
</button>

<!-- Secondary / Outline -->
<button class="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
  Cancel
</button>

<!-- Destructive -->
<button class="bg-rose-600 text-white hover:bg-rose-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
  Delete
</button>

<!-- Ghost / Inline -->
<button class="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-1.5 text-sm transition-colors">
  View all
</button>

<!-- Icon button — topbar style -->
<button class="group relative flex h-10 items-center px-4 text-slate-500 transition-colors hover:bg-violet-600 hover:text-white">
  <!-- icon h-4 w-4 -->
</button>

<!-- Disabled state -->
<button disabled class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm opacity-60 cursor-not-allowed">
  Processing...
</button>
```

---

## SNIPPET: inputs

**Use when:** any form field
**Note:** uses Stripe-inspired hex values — faithful to source

```html
<!-- Text input with label -->
<div class="space-y-1.5">
  <label class="text-[13px] font-medium text-[#1a1f36]">LABEL</label>
  <input type="text" placeholder="PLACEHOLDER"
    class="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow placeholder:text-[#a3acb9] focus:border-[#5469d4] focus:outline-none focus:ring-2 focus:ring-[#5469d4]/20" />
</div>

<!-- Textarea -->
<div class="space-y-1.5">
  <label class="text-[13px] font-medium text-[#1a1f36]">LABEL</label>
  <textarea rows="4" class="w-full resize-none rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow placeholder:text-[#a3acb9] focus:border-[#5469d4] focus:outline-none focus:ring-2 focus:ring-[#5469d4]/20"></textarea>
</div>

<!-- Select -->
<div class="space-y-1.5">
  <label class="text-[13px] font-medium text-[#1a1f36]">LABEL</label>
  <select class="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow focus:border-[#5469d4] focus:outline-none focus:ring-2 focus:ring-[#5469d4]/20">
    <option>OPTION</option>
  </select>
</div>

<!-- Error state -->
<div class="flex items-center gap-2 rounded-md border border-[#f8d7da] bg-[#fdf2f2] px-3.5 py-2.5 text-[13px] text-[#cd3d64]">
  ERROR MESSAGE
</div>
```

---

## SNIPPET: badges

**Use when:** status indicators, counts, tags

```html
<!-- Status pill badges -->
<span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Active</span>
<span class="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">Inactive</span>
<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Pending</span>
<span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Draft</span>
<span class="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">Featured</span>

<!-- With dot -->
<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
  Online
</span>

<!-- Notification count -->
<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">3</span>

<!-- Notification dot on icon -->
<span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
```

---

## SNIPPET: basic-card

**Use when:** any contained content block

```html
<!-- Default card -->
<div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
  <h3 class="text-base font-semibold text-slate-900">CARD TITLE</h3>
  <p class="mt-1 text-sm text-slate-600">CARD DESCRIPTION</p>
</div>

<!-- Clickable card -->
<button class="w-full text-left rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
  <div class="flex items-center gap-2 text-sm font-semibold text-slate-800">CARD LABEL</div>
  <p class="mt-1 text-xs text-slate-500">SHORT DESCRIPTION</p>
</button>

<!-- Card with header + footer -->
<div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
  <div class="border-b border-slate-200 px-4 py-3">
    <h3 class="text-sm font-semibold text-slate-900">TITLE</h3>
  </div>
  <div class="p-4"><p class="text-sm text-slate-600">CONTENT</p></div>
  <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
    <button class="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm">Cancel</button>
    <button class="bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm">Save</button>
  </div>
</div>
```

---

## SNIPPET: stat-card

**Use when:** dashboard KPI metrics, counters

```html
<!-- Single stat card -->
<article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <p class="text-xs font-medium text-slate-500">METRIC LABEL</p>
    <!-- icon h-4 w-4 text-slate-400 -->
  </div>
  <p class="mt-2 text-2xl font-semibold text-slate-900">1,234</p>
</article>

<!-- 3-column stat grid -->
<div class="grid gap-3 sm:grid-cols-3">
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-slate-500">METRIC A</p>
    </div>
    <p class="mt-2 text-2xl font-semibold text-slate-900">148</p>
  </article>
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-slate-500">METRIC B</p>
    </div>
    <p class="mt-2 text-2xl font-semibold text-slate-900">32</p>
  </article>
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-slate-500">METRIC C</p>
    </div>
    <p class="mt-2 text-2xl font-semibold text-slate-900">63</p>
  </article>
</div>
```

---

## SNIPPET: feature-card

**Use when:** storefront article cards, hero items, prominent content

```html
<!-- Article card with image -->
<article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
  <img src="IMAGE_URL" alt="ALT" class="h-56 w-full object-cover" />
  <div class="space-y-5 p-6">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900">TITLE</h1>
    <p class="text-sm text-slate-600 leading-relaxed">BODY</p>
  </div>
</article>

<!-- Dashboard hero banner (rounded-2xl exception) -->
<div class="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm">
  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">EYEBROW</p>
  <h1 class="mt-2 text-2xl font-semibold text-slate-900">TITLE</h1>
  <p class="mt-1 text-sm text-slate-500">SUBTITLE</p>
  <button class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
    ACTION
  </button>
</div>
```

---

## SNIPPET: toast

**Use when:** transient success/error/info feedback

```html
<!-- Success toast -->
<div class="relative flex h-10 min-w-[14rem] max-w-[22rem] items-center overflow-hidden px-2 py-1 shadow-sm bg-gradient-to-br from-emerald-200 to-emerald-100 text-emerald-950">
  <div class="flex items-center gap-2">
    <div class="rounded-full p-0.5 bg-emerald-200 text-emerald-800 ring-1 ring-emerald-400/70">
      <!-- check-circle-2 icon h-3.5 w-3.5 -->
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.11em] opacity-70">Success</p>
      <p class="mt-[2px] truncate text-xs font-semibold leading-tight">TITLE<span class="font-normal opacity-90"> - Detail message</span></p>
    </div>
  </div>
</div>

<!-- Error toast -->
<div class="relative flex h-10 min-w-[14rem] items-center overflow-hidden px-2 py-1 bg-gradient-to-br from-rose-200 to-rose-100 text-rose-950">
  <!-- same structure, icon: x-circle -->
</div>

<!-- Info toast -->
<div class="relative flex h-10 min-w-[14rem] items-center overflow-hidden px-2 py-1 bg-gradient-to-br from-blue-200 to-blue-100 text-blue-950">
  <!-- same structure, icon: info -->
</div>
```

---

## SNIPPET: confirm-dialog

**Use when:** confirming destructive or irreversible actions

```html
<!-- Destructive dialog -->
<div class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
  <div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
    <div class="flex items-start gap-2.5">
      <div class="mt-0.5 rounded-full p-1.5 bg-rose-100 text-rose-600">
        <!-- alert-triangle icon h-4 w-4 -->
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-slate-900">CONFIRM TITLE</h3>
        <p class="mt-1 text-sm text-slate-600">CONFIRM MESSAGE</p>
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50">Cancel</button>
      <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700">Delete</button>
    </div>
  </div>
</div>
```

---

## SNIPPET: empty-state

**Use when:** no data in a list, table, or section

```html
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
    <!-- icon h-5 w-5 text-slate-400 -->
  </div>
  <p class="text-sm font-semibold text-slate-900">No ITEMS yet</p>
  <p class="mt-1 text-sm text-slate-500">Get started by creating your first ITEM.</p>
  <button class="mt-4 flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium shadow-sm">
    Create ITEM
  </button>
</div>
```

---

## SNIPPET: topbar

**Use when:** admin app shell sticky header

```html
<header class="sticky top-0 z-40 flex h-10 items-center justify-between border-b border-slate-200 bg-white px-5">
  <!-- Left: brand icon -->
  <div class="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-violet-500">
    <!-- icon h-[11px] w-[11px] text-white -->
  </div>
  <!-- Right: site title | user | settings | notifications | logout -->
  <!-- Dividers: <span class="h-full w-px bg-slate-200"> -->
  <!-- Buttons: flex h-full items-center px-4 hover:bg-violet-600 hover:text-white -->
  <div class="flex items-center self-stretch">
    <span class="px-4 text-sm font-light text-slate-900">APP NAME</span>
    <span class="h-full w-px bg-slate-200"></span>
    <!-- user avatar + name -->
    <div class="group relative flex h-full items-center gap-2 px-4 hover:bg-violet-600">
      <div class="flex h-6 w-6 rounded-full bg-gradient-to-br from-violet-600 to-violet-500 items-center justify-center text-[10px] font-semibold text-white">AB</div>
      <div class="leading-tight">
        <p class="text-sm font-medium text-slate-700 group-hover:text-white">USER NAME</p>
        <p class="text-[11px] text-slate-500 group-hover:text-white/80">ROLE</p>
      </div>
    </div>
    <span class="h-full w-px bg-slate-200"></span>
    <!-- icon buttons follow same pattern -->
  </div>
</header>
```

---

## SNIPPET: sidebar

**Use when:** admin left navigation

```html
<!-- Expanded: w-64 | Collapsed: w-14 -->
<aside class="relative flex w-64 flex-col border-r border-slate-200 bg-slate-50/50 md:min-h-[calc(100vh-40px)]">
  <nav class="flex-1 p-3">
    <!-- Section label -->
    <p class="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">SECTION</p>

    <!-- Active item -->
    <a href="#" class="flex items-center gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
      <!-- icon h-4 w-4 text-violet-700 -->
      ACTIVE ITEM
    </a>

    <!-- Inactive item -->
    <a href="#" class="flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-violet-50">
      <!-- icon h-4 w-4 text-slate-400 -->
      ITEM
    </a>

    <!-- Nested children -->
    <div class="ml-5 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-4">
      <a href="#" class="block rounded-md border border-transparent px-3 py-1 text-sm text-slate-600 hover:bg-violet-50">Child item</a>
    </div>
  </nav>
</aside>
```

---

## SNIPPET: storefront-header

**Use when:** public website header with frosted glass + dropdown nav

```html
<header class="border-b border-slate-200 bg-white/90 backdrop-blur">
  <div class="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <!-- logo img or icon -->
      </div>
      <div>
        <p class="text-lg font-semibold text-slate-900">SITE NAME</p>
        <p class="text-sm text-slate-500">TAGLINE</p>
      </div>
    </div>
  </div>
  <div class="border-t border-slate-100 bg-white">
    <nav class="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-1 px-4 py-2">
      <a href="#" class="block rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">NAV ITEM</a>
      <!-- Dropdown item -->
      <div class="group relative">
        <a href="#" class="block rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">DROPDOWN</a>
        <div class="invisible absolute left-0 top-full z-20 min-w-[200px] rounded-lg border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
          <a href="#" class="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Child</a>
        </div>
      </div>
    </nav>
  </div>
</header>
```

---

## SNIPPET: login-card

**Use when:** auth pages — sign in, sign up, password reset
**Note:** uses Stripe-inspired `#5469d4` blue, NOT violet — intentional

```html
<div class="flex min-h-screen flex-col items-center justify-center bg-[#f6f9fc] px-4">
  <div class="w-full max-w-[400px]">
    <!-- Logo -->
    <div class="mb-7 flex justify-center">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
        <!-- shield icon h-4 w-4 text-white -->
      </div>
    </div>
    <!-- Card -->
    <div class="rounded-lg border border-[#e3e8ee] bg-white px-10 pb-10 pt-8 shadow-[0_2px_4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.06)]">
      <h1 class="mb-1 text-center text-xl font-semibold tracking-tight text-[#1a1f36]">Sign in to your account</h1>
      <p class="mb-8 text-center text-[13px] text-[#697386]">APP NAME</p>
      <form class="space-y-5">
        <div class="space-y-1.5">
          <label class="text-[13px] font-medium text-[#1a1f36]">Email</label>
          <input type="email" class="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:border-[#5469d4] focus:outline-none focus:ring-2 focus:ring-[#5469d4]/20" />
        </div>
        <div class="space-y-1.5">
          <label class="text-[13px] font-medium text-[#1a1f36]">Password</label>
          <input type="password" class="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:border-[#5469d4] focus:outline-none focus:ring-2 focus:ring-[#5469d4]/20" />
        </div>
        <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-md bg-[#5469d4] px-4 py-[9px] text-sm font-medium text-white hover:bg-[#4558b8]">
          Continue
        </button>
      </form>
    </div>
  </div>
</div>
```

---

## SNIPPET: admin-shell

**Use when:** full admin page layout

See `snippets/pages/admin-shell.html` for the complete standalone HTML file. Key structure:
- `<div class="min-h-screen bg-[#f8f9fb]">`
- Sticky topbar `h-10`
- `<div class="flex flex-col md:flex-row">`
- Sidebar `w-64 md:min-h-[calc(100vh-40px)]`
- Main `<main class="w-full min-w-0 flex-1 bg-white p-3 md:p-4">`

---

## SNIPPET: dashboard

**Use when:** admin dashboard page content (place inside `<main>` of admin-shell)

Key components: hero banner (`rounded-2xl bg-gradient-to-r from-slate-50 to-white`) → 3-col stat cards → 3-col quick-action cards → recent items table. See `snippets/pages/dashboard.html` for full markup.

---

## SNIPPET: storefront-page

**Use when:** full public-facing page with header, content, footer

See `snippets/pages/storefront-page.html` for complete standalone HTML file. Page bg: `bg-slate-100`. Article card: `rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden`. Footer: `border-t border-slate-200 bg-white`.
