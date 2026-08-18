# Rule: Frontend Page-Routing Integrity (`src/pages`)

## Purpose
Governs the placement of files in the Frontend codebase to ensure zero route pollution and maintain 100% integrity of the file-system routing engine (`vite-plugin-pages` / `~react-pages`).

---

## The Golden Rule: Pure Page-Only `src/pages`
**`Frontend/src/pages/` MUST contain ONLY top-level page route components that map 1:1 to browser URLs.**

Because `vite-plugin-pages` (`~react-pages`) parses every single `.js`, `.jsx`, `.ts`, and `.tsx` file inside `src/pages/` into an accessible route in the router, creating non-page components inside `src/pages/` automatically creates phantom routes (e.g. `/reports/report-catalog-sidebar`, `/reports/report-data-grid`).

---

## Directory Separation Matrix

| File Purpose | Correct Location | FORBIDDEN Location |
|---|---|---|
| **Top-Level Page Route** (e.g., `/reports`, `/hrms/daily-attendance`) | `src/pages/**` | `src/components/**` |
| **Reusable Components & Sub-views** (e.g., grids, cards, sidebars) | `src/components/**` or `src/widgets/**` | ❌ `src/pages/**` |
| **Layout Shells & Wrappers** (e.g., `ReportPageLayout`) | `src/layouts/**` or `src/components/Layouts/**` | ❌ `src/pages/**` |
| **Configs, Constants, Catalogs** (e.g., `reportCatalog.js`) | `src/constants/**` or `src/config/**` | ❌ `src/pages/**` |
| **Data Fetching / Custom Hooks** | `src/hooks/**` or `src/services/**` | ❌ `src/pages/**` |
| **Helper Functions & Utilities** | `src/utils/**` or `src/utilities/**` | ❌ `src/pages/**` |

---

## Violation Checklist Before Creating / Modifying Files
- [ ] Is this file intended to be a direct URL route visited by a user?
  - **YES:** Place in `src/pages/` with standard route naming convention.
  - **NO (it is imported as a child component, layout, or utility):** NEVER put it in `src/pages/`. Place it in `src/components/`, `src/layouts/`, `src/constants/`, or `src/utils/`.
