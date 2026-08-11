# UI Design Tokens (Workhub ERP)

| Layer | Path |
|-------|------|
| Canonical spec | `backend/DESIGN.md` v2.0 (Workhub-ERP-design-system) |
| CSS + Tailwind | `frontend/src/styles/tokens.css` |
| JS module map | `frontend/src/constants/uiTokens.js` |
| Agent skill | `.agent/skills/frontend-ui-tokens/SKILL.md` |

## Mandatory (every page)

Every page must be **theme-aware** (light + dark via `ThemeProvider`) and **responsive** (breakpoints in `DESIGN.md` → `layout.breakpoints`).

## Core palette (light)

| Token | Hex | Use |
|-------|-----|-----|
| canvas | `#F7F8FC` | Page background |
| surface | `#FFFFFF` | Cards |
| border | `#E2E5F0` | Hairlines |
| ink | `#1A1D2E` | Headlines |
| brand gradient | `#6C3DE8` → `#C026D3` | Heroes, primary CTA |

## Module accents

| Module | Accent | Light tint |
|--------|--------|------------|
| HR | `#7C3AED` | `#EDE9FE` |
| Project | `#0EA5E9` | `#E0F2FE` |
| Ticket | `#E11D48` | `#FFE4EC` |
| Payroll | `#059669` | `#D1FAE5` |

Set `data-module="hr|project|ticket|payroll"` on page wrapper.

## Dark mode

Defined in `tokens.css` under `.dark`. Never add light-only hex without a dark counterpart.

## Responsive shell

- Sidebar: 240px desktop, icon rail 56px, drawer `<1024px`
- Top bar: 60px
- Content: max 1440px, padding 24–32px desktop / 16px mobile

## Brain note

UI-only changes rarely need `DATA_FLOW.md` updates. Shared patterns → `knowledge_brain/Common/MODULE_BRAIN.md`.
