# Corrad Design System Package

A drop-in design package that gives your AI frontend generator the Corrad aesthetic as its default. Output is plain HTML + Tailwind CSS classes — no build step, no framework lock-in.

## What's inside

```
corrad-design/
├── system-prompt.md          ← inject into LLM system prompt
├── spec/
│   ├── design-system.md      ← full human-readable spec with rationale
│   └── rules.json            ← machine-readable palette + class rules
├── preview/
│   └── base.css              ← drop into preview iframe <style> tag
└── snippets/                 ← few-shot HTML exemplars for LLM context
    ├── primitives/           ← buttons, inputs, badges, icons
    ├── cards/                ← basic, stat, feature cards
    ├── feedback/             ← toast, confirm dialog, empty state
    ├── navigation/           ← topbar, sidebar, storefront header
    ├── forms/                ← login card
    └── pages/                ← full-page layouts (admin shell, dashboard, storefront)
```

`snippets.md` is a single-file concatenation of all snippets — use this for simple prompt injection instead of per-file retrieval.

## Integration (4 steps)

### 1. Inject the system prompt

Add the contents of `system-prompt.md` to your generator's LLM system prompt, before any user instruction.

```js
const systemPrompt = fs.readFileSync('./corrad-design/system-prompt.md', 'utf8')
// prepend to your existing system prompt
```

### 2. Add few-shot snippets to context

On each generation request, retrieve 2–4 relevant snippets based on the user's prompt and append them to the LLM context as examples.

**Simple approach** — inject the full `snippets.md` into every call (adds ~8k tokens):
```js
const snippets = fs.readFileSync('./corrad-design/snippets.md', 'utf8')
messages.push({ role: 'user', content: `Reference snippets:\n${snippets}` })
```

**Smart retrieval** — embed each file in `snippets/` and retrieve by cosine similarity to the user prompt. The top comment in each snippet file describes its use case.

### 3. Load the preview CSS

In your preview iframe or sandbox, include `preview/base.css` alongside Tailwind:

```html
<!-- In your preview iframe's <head> -->
<script src="https://cdn.tailwindcss.com"></script>
<style>
  /* paste contents of preview/base.css here, or load it as a link */
</style>
```

`base.css` only defines things Tailwind can't express: the `body` base style and the `.page-title` gradient helper class.

### 4. Optional: palette validation

Load `spec/rules.json` to validate or lint generated output. The `forbidden_classes` and `forbidden_colors` arrays list what should never appear in compliant output.

---

## Design origin

Extracted from [corrad-laravel](../client/src/) — a Vue 3 + Tailwind admin/CMS. The violet accent palette is a 1:1 match with Tailwind's built-in `violet-*` scale, so no custom CSS variables are needed in generated output.
