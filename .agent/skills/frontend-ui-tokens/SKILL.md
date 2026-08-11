---
name: frontend-ui-tokens
description: |
  Applies Workhub ERP design tokens from backend/DESIGN.md v2, frontend/src/styles/tokens.css, and uiTokens.js. 
  Enforces theme-aware (light/dark) and responsive layouts on every page. 
  Apply these tokens and rules to all new or modified React components in the frontend codebase (including login, shell, forms, and dashboards). 
  Do not retroactively change third-party vendor components unless explicitly migrating them to use tokens.
  Ensure color contrast meets WCAG 2.1 AA: minimum 4.5:1 for normal text and 3:1 for large text. 
  Include automated contrast checks in CI and add tests that validate token contrast in both .light and .dark modes.
---

# Frontend UI Tokens (Workhub ERP)

## Mandatory rules (enforce by CI/linting)

**1) Theme: Ensure .light and .dark support**
- Enforce: Use `ThemeProvider` from `context/themeProvider.jsx` or add `.dark` selector on `html`
- CI Check: Lint rule flags components without theme context
- Do NOT use pure `#000` / `#FFF` as the only surfaces. Use `bg-canvas`, `bg-surface`, `text-ink`, module accents.
- All colors must use CSS variables (`var(--tracker-ink)`) or Tailwind semantic tokens (`text-ink`, `bg-surface`)

**2) Responsiveness: Follow DESIGN.md breakpoints**
- Enforce: Mobile-first layout with `sm:`, `md:`, `lg:` breakpoint classes per DESIGN.md
- CI Check: Build fails if fixed px widths lack mobile fallbacks
- App shell, content area, headers, tabs, and grids must be responsive per checklists below

**3) Forms: Forbid FloatingCard and require {Module}/form.jsx + FormPageLayout**
- Enforce: Linter flags `FloatingCard` usage in any form; CI must fail until component is migrated to `{Module}/form.jsx` + `FormPageLayout`
- CI Check: Build fails if FloatingCard is detected in form components

## Token sources (priority)

1. **`backend/DESIGN.md` v2** — Workhub ERP system (canonical)
2. **`frontend/src/styles/tokens.css`** — CSS variables + component classes
3. **`frontend/src/constants/uiTokens.js`** — module map, `APP_SHELL`, `STAT_CARD`

## Theme-aware checklist

- [ ] All colors via CSS variables (`var(--tracker-ink)`) or Tailwind semantic tokens (`text-ink`, `bg-surface`)
- [ ] Test both `.light` and `.dark` — For every light-theme hex introduced in tokens.css, add a corresponding CSS variable with the same name inside the `.dark` selector (example: `:root { --tracker-bg: #ffffff; } .dark { --tracker-bg: #111111; }`). If a dark counterpart is not present for a token, fall back to `--tracker-surface` and fail the build with a lint error indicating the missing `.dark` token.
- [ ] Theme toggle: `useTheme()` from `context/themeProvider.jsx` (top bar + login)
- [ ] Cards, inputs, borders use `--tracker-border`, `--tracker-surface` (auto-switch in `.dark`)

## Responsive checklist

- [ ] App shell: `lmx-app-shell` → sidebar collapses `<1024px`, overlay on mobile
- [ ] Content: `lmx-content` — fluid padding `clamp(16px, 3vw, 32px)`, max-width `1440px`
- [ ] Page headers: stack on mobile (`flex-col sm:flex-row`)
- [ ] Tab bars: `overflow-x-auto scrollbar-hide` on narrow screens
- [ ] Grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (use `lg:grid-cols-4` only for dashboard-listing pages) per DESIGN.md card-grid
- [ ] Touch targets: Ensure touch targets have `min-width: 40px` and `min-height: 40px` (e.g., CSS: `min-width:40px; min-height:40px;`) or meet an equivalent 40x40px touch area on buttons/inputs

## Quick classes

| Use | Class |
|-----|--------|
| App shell | `lmx-app-shell` |
| Page content area | `lmx-content` |
| Top bar | `lmx-topbar` |
| Section card (+ left accent) | `lmx-section-card` or `tracker-card` |
| Plain card (no accent) | `tracker-card-plain` |
| Brand CTA | `tracker-btn-brand` (gradient) |
| Module CTA | `tracker-btn-accent` |
| Secondary | `tracker-btn-secondary` |
| Ghost / icon | `tracker-btn-ghost` |
| Input | `lmx-input` |
| Tabs | `lmx-tab-bar` + `lmx-tab` / `lmx-tab-active` |
| Page eyebrow | `lmx-page-eyebrow` |
| Hero gradient | `lmx-gradient-hero` |

## Module accents (one screen = one module)

Set `data-module` to one of the following values on the page root to switch `--module-accent`:
- `data-module="hr"`
- `data-module="project"`
- `data-module="ticket"`
- `data-module="payroll"`

**Fallback behavior:** If `data-module` is missing or not one of the listed values, default to `data-module="project"` and emit a console warning and a build-time lint warning.

| Module | Accent | Use for |
|--------|--------|---------|
| `hr` | `#7C3AED` | Profile, Employees, Attendance, Master HR |
| `project` | `#0EA5E9` | Tasks, Dashboard projects |
| `ticket` | `#E11D48` | Tickets, support |
| `payroll` | `#059669` | Payroll, expenses |

Import `MODULES` from `constants/uiTokens.js`. **Error handling:** If importing `MODULES` fails, fall back to an inline mapping `{ hr: '#7C3AED', project:'#0EA5E9', ticket:'#E11D48', payroll:'#059669' }`, log an error, and create a lint failure for missing constants.

## Form layout (no FloatingCard)

| Piece | Path |
|-------|------|
| List view | `{Module}/index.jsx` |
| Form page | `{Module}/form.jsx` |
| Shell | `components/Forms/FormPageLayout.jsx` |
| 8+ fields | `TabbedFormTabs.jsx` (Profile pattern) |
| Route | `entityFormPath(basePath, id?)` |

## Implementation anti-patterns

- ❌ `bg-black`, `text-black`, `dark:bg-black` for chrome
- ❌ Inline `#111111` / `#f5f1ec` (old Intercom tokens)
- ❌ `FloatingCard` for forms
- ❌ Fixed px widths without mobile fallback
- ❌ Light-only colors with no `.dark` token

## Page-level UX Standards

For page structure, layout patterns (login, dashboard, splash), mobile equivalents, and loading/empty states, reference:

- **UX Standards**: `.agent/skills/knowledge-brain/ux-standards.md`
- **Design Tokens**: `.agent/skills/knowledge-brain/design-tokens.md`

## Related

- Full spec: `backend/DESIGN.md`
- Brain overview: `.agent/skills/knowledge-brain/design-tokens.md`
- UX patterns: `.agent/skills/knowledge-brain/ux-standards.md`
