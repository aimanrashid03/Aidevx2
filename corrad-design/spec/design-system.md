# Corrad Design System — Full Specification

This document is the canonical reference for the Corrad aesthetic. It explains the **what** and **why** behind every rule, with before/after examples and source pointers into the original codebase.

---

## Origin

Extracted from `corrad-laravel` — a Vue 3 + Tailwind CSS admin/CMS application. The design is entirely hand-built: no external UI component library (no PrimeVue, Element Plus, shadcn-vue, or Vuetify). Everything is Tailwind utilities + 3 custom components. This makes it extremely portable.

---

## 1. Color System

### Accent — Violet

The violet accent is a 1:1 match with Tailwind's built-in `violet-*` palette. This means no custom CSS variables are needed in generated HTML.

| Token | Tailwind class | Hex | Use |
|---|---|---|---|
| Accent tint light | `violet-50` | `#f5f3ff` | Active nav background, hover tints |
| Accent tint | `violet-100` | `#ede9fe` | Badge backgrounds, focus rings |
| Accent soft | `violet-200` | `#ddd6fe` | Active nav borders, dividers |
| Accent mid | `violet-500` | `#8b5cf6` | Color swatch indicators |
| Accent primary | `violet-600` | `#7c3aed` | Topbar hover fills, gradient start |
| Accent dark | `violet-700` | `#6d28d9` | Active text, gradient end |
| Ring | `violet-400` | `#a78bfa` | Focus ring highlight |

**Source:** `client/src/style.css:5-13` (the `:root` block = violet defaults)

### Neutral — Slate

Slate forms the entire neutral backbone. Never use gray-*, zinc-*, or neutral-* — Tailwind's different gray families are not interchangeable.

| Use | Class |
|---|---|
| App/admin shell bg | `bg-[#f8f9fb]` — custom hex, slightly cooler than slate-50 |
| Public/storefront bg | `bg-slate-100` |
| Card/panel/modal bg | `bg-white` |
| Borders (default) | `border-slate-200` |
| Secondary button border | `border-slate-300` |
| Heading text | `text-slate-900` |
| Body text | `text-slate-600` |
| Meta/caption text | `text-slate-500` |
| Muted/icon text | `text-slate-400` |
| Divider lines | `bg-slate-200` (vertical: `w-px h-full bg-slate-200`) |
| Backdrop overlay | `bg-slate-900/50` |

**Note on `#f8f9fb`:** The admin shell uses this custom hex (not `bg-slate-50`) because it reads slightly cooler and more neutral on screen. It's the only non-Tailwind color token permitted.

**Source:** `client/src/layouts/AdminLayout.vue:195` (`bg-[#f8f9fb]`), `client/src/layouts/StorefrontLayout.vue:43`

### Status Colors

| State | Background | Tint | Text | Notes |
|---|---|---|---|---|
| Success | `bg-emerald-500` | `bg-emerald-100` | `text-emerald-800` | Toast, badges |
| Error / Destructive | `bg-rose-600` | `bg-rose-100` | `text-rose-700` | Buttons, alerts — **never `red-*`** |
| Info | `bg-blue-500` | `bg-blue-100` | `text-blue-800` | Toast, info badges only |
| Warning indicator | `bg-rose-500` | — | — | Notification dots only |

**Why rose not red?** Tailwind's `rose-*` is softer and aligns with the overall cool-toned palette. `red-*` is too aggressive.

---

## 2. Typography

### Font Family
System UI stack (Tailwind default sans). Never specify `font-serif` or `font-mono` in UI elements.

### Scale

| Role | Classes | Example |
|---|---|---|
| Page/section title (gradient) | `.page-title` | `<h1 class="page-title">Dashboard</h1>` |
| Section heading | `text-2xl font-semibold text-slate-900` | Page h1 inside admin main |
| Card heading | `text-base font-semibold text-slate-900` | Card title |
| Dialog title | `text-base font-semibold text-slate-900` | Confirm dialog h3 |
| Body | `text-sm text-slate-600` | Paragraph content |
| Input label | `text-[13px] font-medium text-[#1a1f36]` | Form field label |
| Section eyebrow | `text-[11px] font-semibold uppercase tracking-wider text-slate-400` | Sidebar section group header |
| Toast label | `text-[10px] font-semibold uppercase tracking-[0.11em]` | "SUCCESS" above toast message |
| Caption/meta | `text-xs text-slate-500` | Timestamps, stat card labels |
| Footer text | `text-[11px] text-slate-400` | Sidebar footer, page footer |

### `.page-title`
The only custom class. Applies a violet gradient clip:
```css
background-image: linear-gradient(to right, #7c3aed, #8b5cf6, #6d28d9);
background-clip: text;
color: transparent;
font-size: 1.45rem;
font-weight: 700;
letter-spacing: -0.015em;
```
**Source:** `client/src/style.css:71-79`

---

## 3. Spacing

Corrad uses consistently **tight spacing**. Prefer smaller gap/padding values.

| Context | Value |
|---|---|
| Default flex gap | `gap-2` or `gap-2.5` |
| Nav item padding | `px-3 py-1.5` (normal) / `px-3 py-1` (compact) |
| Card padding | `p-4` (stat cards) / `p-6` (article/feature cards) |
| Dialog padding | `p-4` |
| Page main area | `p-3 md:p-4` |
| Button padding | `px-4 py-2` |
| Form input padding | `px-3 py-[9px]` |
| Topbar height | `h-10` (40px, sticky) |

---

## 4. Border Radius

Corrad uses a deliberate 4-step radius scale. Nothing smaller than `rounded-md`, nothing larger than `rounded-xl` except circles.

| Context | Class | Why |
|---|---|---|
| Nav items, pills, dropdown items | `rounded-md` | Tight chrome, not pill-like |
| Buttons, cards, dialogs, inputs, dropdowns | `rounded-lg` | Default — feels modern without being exaggerated |
| Feature/hero cards, article cards | `rounded-xl` | Adds visual weight to important content areas |
| Dashboard banner | `rounded-2xl` | One exception — deliberate large radius for the hero area |
| Avatars, icon badges, status dots, color swatches | `rounded-full` | Circular elements only |

**Forbidden:** `rounded-sm` (too sharp), `rounded-2xl`/`rounded-3xl` (too bubbly, except the one dashboard banner exception).

**Source:** `client/src/components/AppConfirmDialog.vue:14` (`rounded-lg`), `client/src/layouts/StorefrontLayout.vue:111` (`rounded-xl`)

---

## 5. Shadows

3-step scale. `shadow-md` is deliberately skipped to maintain visual crispness.

| Context | Class |
|---|---|
| Cards, panels, inputs | `shadow-sm` |
| Dropdowns, popovers, tooltip | `shadow-lg` |
| Modals, dialogs | `shadow-2xl` |

---

## 6. Buttons

### Primary Dark (default)
```html
<button class="bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
  Save Changes
</button>
```

### Primary Accent Gradient (hero/CTA)
Used sparingly for the most important action on a page.
```html
<button class="bg-gradient-to-br from-violet-600 to-violet-500 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all hover:from-violet-700 hover:to-violet-600">
  Get Started
</button>
```

### Secondary (outline)
```html
<button class="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
  Cancel
</button>
```

### Destructive
```html
<button class="bg-rose-600 text-white hover:bg-rose-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
  Delete
</button>
```

### Ghost / Inline
```html
<button class="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-1.5 text-sm transition-colors">
  View all
</button>
```

**Source:** `client/src/components/AppConfirmDialog.vue:31-43`

---

## 7. Hover Patterns

These are consistent throughout the UI:

| Element | Hover class |
|---|---|
| Sidebar nav items | `hover:bg-violet-50` |
| Storefront nav items | `hover:bg-slate-100 hover:text-slate-900` |
| Table/list rows | `hover:bg-slate-50` |
| Topbar icon buttons | `hover:bg-violet-600 hover:text-white` (full-area fill) |
| Clickable cards | `hover:bg-slate-50 transition-colors` |

**Source:** `client/src/layouts/AdminLayout.vue:364` (sidebar hover), `client/src/layouts/AdminLayout.vue:221` (topbar hover fill)

---

## 8. Cards

### Basic Card
```html
<div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
  <!-- content -->
</div>
```

### Stat Card
```html
<article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <p class="text-xs font-medium text-slate-500">METRIC LABEL</p>
    <!-- Lucide icon: h-4 w-4 text-slate-400 -->
  </div>
  <p class="mt-2 text-2xl font-semibold text-slate-900">1,234</p>
</article>
```

### Feature Card (storefront/article)
```html
<article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
  <img src="..." alt="..." class="h-56 w-full object-cover" />
  <div class="space-y-5 p-6">
    <h1 class="text-3xl font-bold tracking-tight">TITLE</h1>
    <p class="text-sm text-slate-600">BODY</p>
  </div>
</article>
```

**Source:** `client/src/views/MainDashboardView.vue:40-61`, `client/src/layouts/StorefrontLayout.vue:111-122`

---

## 9. Navigation

### Admin Topbar
- Sticky, `h-10` (40px), white background, `border-b border-slate-200`
- Icon buttons separated by `<span class="h-full w-px bg-slate-200">` vertical dividers
- Each button: `flex h-full items-center px-4` — takes full topbar height
- Hover: `hover:bg-violet-600 hover:text-white` — full-area accent fill
- Tooltips: `absolute -bottom-8` positioned, `rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity`

**Source:** `client/src/layouts/AdminLayout.vue:196-322`

### Admin Sidebar
- `bg-slate-50/50 border-r border-slate-200`
- Width transitions: `w-64` expanded, `w-14` collapsed (icon-only mode)
- Section group labels: `text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3`
- Nav items: `rounded-lg`, `gap-2.5 px-3 py-1.5 text-sm`
- Active item: `border border-violet-200 bg-violet-50 text-violet-700 font-medium`
- Inactive item: `border border-transparent text-slate-900`
- Nested children: `ml-5 mt-1 border-l-2 border-slate-200 pl-4 space-y-0.5`
- Collapse toggle: floating circle button, `bg-violet-600 text-white`, `-right-3.5 top-10`

**Source:** `client/src/layouts/AdminLayout.vue:325-473`

### Storefront Header
- `border-b border-slate-200 bg-white/90 backdrop-blur` (frosted glass)
- `max-w-4xl mx-auto` content constraint
- Logo: `h-10 w-10 rounded-lg border border-slate-200 bg-white`
- Nav links: `rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900`
- Dropdown: `rounded-lg border border-slate-200 bg-white p-1 shadow-lg` — reveals on `group-hover`

**Source:** `client/src/layouts/StorefrontLayout.vue:44-106`

---

## 10. Modals and Dialogs

```
Backdrop: fixed inset-0 bg-slate-900/50 backdrop-blur-sm
Dialog: w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl
Icon badge: rounded-full p-1.5
  - Neutral: bg-slate-100 text-slate-600
  - Destructive: bg-rose-100 text-rose-600
Title: text-base font-semibold text-slate-900
Body: text-sm text-slate-600 mt-1
Actions: flex justify-end gap-2 mt-4
```

**Source:** `client/src/components/AppConfirmDialog.vue:9-46`

---

## 11. Toasts

Appear inline in the topbar (not as fixed overlay). Slide in from the right.

Gradient backgrounds by variant:
- Success: `bg-gradient-to-br from-emerald-200 to-emerald-100 text-emerald-950`
- Error: `bg-gradient-to-br from-rose-200 to-rose-100 text-rose-950`
- Info: `bg-gradient-to-br from-blue-200 to-blue-100 text-blue-950`

Icon badge: `rounded-full p-0.5 ring-1 ring-emerald-400/70` (adjust per variant)

Label: `text-[10px] font-semibold uppercase tracking-[0.11em] opacity-70`
Message: `text-xs font-semibold` + optional detail `font-normal opacity-90`

**Source:** `client/src/components/AppToastRegion.vue:9-25`

---

## 12. Forms and Inputs

Inputs use a Stripe-inspired style distinct from the admin chrome:

```
rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36]
shadow-[0_1px_2px_rgba(0,0,0,0.04)]
placeholder:text-[#a3acb9]
focus:border-[#5469d4] focus:outline-none focus:ring-2 focus:ring-[#5469d4]/20
transition-shadow
```

Labels: `text-[13px] font-medium text-[#1a1f36]`

The login card uses different brand colors (`#5469d4` Stripe-blue) from the admin accent (violet) — this is intentional. The auth page is deliberately more neutral/trustworthy.

**Source:** `client/src/views/LoginView.vue:62-67`

---

## 13. The Login Card

The login page uses a distinct Stripe-inspired design system, separate from the admin shell:

- Page bg: `bg-[#f6f9fc]`
- Card: `rounded-lg border border-[#e3e8ee] bg-white px-10 pb-10 pt-8 shadow-[0_2px_4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.06)]`
- Max width: `max-w-[400px]`
- Heading: `text-xl font-semibold tracking-tight text-[#1a1f36]`
- Subheading: `text-[13px] text-[#697386]`
- Submit button: `bg-[#5469d4] hover:bg-[#4558b8]` (Stripe-blue, NOT violet)
- Error state: `border-[#f8d7da] bg-[#fdf2f2] text-[#cd3d64]`

The logo fallback uses `from-violet-600 to-indigo-600` — a gradient bridging the two brand colors.

**Source:** `client/src/views/LoginView.vue:41-110`

---

## Quick Reference — "When in doubt"

| You want... | Use this |
|---|---|
| A default card | `rounded-lg border border-slate-200 bg-white shadow-sm p-4` |
| A primary button | `bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm` |
| An accent CTA | `bg-gradient-to-br from-violet-600 to-violet-500 text-white rounded-lg px-4 py-2 text-sm font-medium` |
| Active nav state | `border border-violet-200 bg-violet-50 text-violet-700 font-medium` |
| A section label | `text-[11px] font-semibold uppercase tracking-wider text-slate-400` |
| A gradient title | `<h1 class="page-title">Title</h1>` |
| App shell bg | `bg-[#f8f9fb]` |
| A modal | `fixed inset-0 bg-slate-900/50 backdrop-blur-sm` + `max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl` |
