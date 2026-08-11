---
Purpose: Define the official design system, typography, components layout, and color accents for the multi-platform UI.
Audience: Frontend Engineers, Mobile Developers, and UI/UX Designers.
Status: IMPLEMENTED
Related Documents:
  - [System Architecture Guide](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SYSTEM_ARCHITECTURE_GUIDE.md)
  - [Collections Reference](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/COLLECTIONS_REFERENCE.md)
Owner: Lead UI/UX Designer
Last Review: 2026-06-27
Architecture Version: 2.2.0
---

# CRITICAL MANDATE: Any UI design MUST NOT be planned, proposed, or implemented without first reading and validating this DESIGN.md file. This is a mandatory pre-step for all UI-related tasks.

# ─── GLOBAL PALETTE ──────────────────────────────────────────────────────────

colors:
  # Brand / Global Chrome
  brand-gradient-from:      "#6C3DE8"   # deep violet  — profile headers, sidebar accent
  brand-gradient-to:        "#C026D3"   # vivid fuchsia — gradient tail
  brand-gradient-mid:       "#8B5CF6"   # mid violet
  brand-solid:              "#6C3DE8"   # flat fallback for gradient-free contexts
  brand-teal:               "#0EA5E9"   # sky teal — profile completion ring, links
  brand-teal-light:         "#E0F2FE"   # teal tint surface

  # Canvas & Surfaces
  canvas:                   "#F7F8FC"   # cool off-white — default page background
  surface-0:                "#FFFFFF"   # card face
  surface-1:                "#F0F2FA"   # inner-card alt row / sidebar bg
  surface-2:                "#E8EAF6"   # hovered row / input background
  surface-chip:             "#EEF0FB"   # chip / badge background (neutral)

  # Ink (text)
  ink:                      "#1A1D2E"   # near-black — all headlines
  ink-muted:                "#4B5068"   # secondary labels, meta
  ink-subtle:               "#8890A8"   # placeholder, caption
  ink-tertiary:             "#B4BACC"   # disabled, divider labels
  on-brand:                 "#FFFFFF"   # text on gradient/brand surfaces
  on-accent:                "#FFFFFF"   # text on coloured accent surfaces

  # Borders & Dividers
  border:                   "#E2E5F0"   # default card / input border
  border-soft:              "#ECEEF7"   # row dividers inside cards
  border-focus:             "#8B5CF6"   # input focus ring

  # ── MODULE ACCENTS ────────────────────────────────────────────────────────
  # HR Tracker  →  Violet family (matches brand)
  hr-accent:                "#7C3AED"
  hr-accent-light:          "#EDE9FE"
  hr-accent-mid:            "#A78BFA"
  hr-icon-bg:               "#EDE9FE"

  # Project Management  →  Sky Blue / Cyan
  project-accent:           "#0EA5E9"
  project-accent-light:     "#E0F2FE"
  project-accent-mid:       "#38BDF8"
  project-icon-bg:          "#E0F2FE"

  # Ticket System  →  Rose / Pink
  ticket-accent:            "#E11D48"
  ticket-accent-light:      "#FFE4EC"
  ticket-accent-mid:        "#FB7185"
  ticket-icon-bg:           "#FFE4EC"

  # Payroll  →  Emerald Green
  payroll-accent:           "#059669"
  payroll-accent-light:     "#D1FAE5"
  payroll-accent-mid:       "#34D399"
  payroll-icon-bg:          "#D1FAE5"

  # Asset Management  →  Amber / Orange
  asset-accent:             "#D97706"   # Amber 600 — distinct from all other modules
  asset-accent-light:       "#FEF3C7"   # Amber 100
  asset-accent-mid:         "#F59E0B"   # Amber 500
  asset-icon-bg:            "#FEF3C7"

  # ── SEMANTIC ──────────────────────────────────────────────────────────────
  semantic-success:         "#10B981"
  semantic-success-light:   "#D1FAE5"
  semantic-warning:         "#F59E0B"
  semantic-warning-light:   "#FEF3C7"
  semantic-error:           "#EF4444"
  semantic-error-light:     "#FEE2E2"
  semantic-info:            "#3B82F6"
  semantic-info-light:      "#DBEAFE"

  # ── PRIORITY CHIPS (Tickets) ──────────────────────────────────────────────
  priority-critical-bg:     "#FEE2E2"
  priority-critical-text:   "#B91C1C"
  priority-high-bg:         "#FFEDD5"
  priority-high-text:       "#C2410C"
  priority-medium-bg:       "#FEF9C3"
  priority-medium-text:     "#A16207"
  priority-low-bg:          "#F0FDF4"
  priority-low-text:        "#166534"

  # ── STATUS CHIPS (Universal) ──────────────────────────────────────────────
  status-active-bg:         "#D1FAE5"
  status-active-text:       "#065F46"
  status-pending-bg:        "#FEF3C7"
  status-pending-text:      "#92400E"
  status-closed-bg:         "#F1F5F9"
  status-closed-text:       "#475569"
  status-inprogress-bg:     "#DBEAFE"
  status-inprogress-text:   "#1E40AF"

  # ── CHART / ANALYTICS PALETTE ─────────────────────────────────────────────
  chart-violet:             "#7C3AED"
  chart-blue:               "#0EA5E9"
  chart-green:              "#10B981"
  chart-amber:              "#F59E0B"
  chart-rose:               "#E11D48"
  chart-cyan:               "#06B6D4"
  chart-indigo:             "#4F46E5"
  chart-lime:               "#84CC16"


# ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

typography:
  # Display — used in page heroes and empty states
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -1.2px
  display-md:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.8px

  # Headings
  heading-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.4px
  heading-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: -0.3px
  heading-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.2px
  heading-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: 0

  # Body
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.60
    letterSpacing: 0
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.60
    letterSpacing: 0
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0

  # Utility
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: 0.4px       # small-caps feel for field labels
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  eyebrow:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.30
    letterSpacing: 1.0px       # module eyebrow: "HR TRACKER", "PAYROLL"
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0


# ─── RADIUS ──────────────────────────────────────────────────────────────────
# CONCISE: prefer rounded-lg (12px) for cards, rounded-md (8px) for buttons/inputs.
# Avoid rounded-2xl (16px+) and rounded-3xl on standard components.

rounded:
  xs:   4px
  sm:   6px
  md:   8px      # buttons, inputs, badges, tabs
  lg:   12px     # cards, panels, dropdowns (DEFAULT for containers)
  xl:   16px     # hero headers, modal — large containers only
  xxl:  20px     # reserved for hero/page-level wrapping (rare)
  card: 12px     # ← changed from 14px — concise card radius
  pill: 9999px


# ─── SPACING ─────────────────────────────────────────────────────────────────
# CONCISE DENSITY: prefer compact spacing (xs–md) for all UI.
# Reserve lg+ only for page-level padding and hero sections.
# Goal: clear visual separation without wasteful whitespace.

spacing:
  xxs:     2px      # micro gaps (inline icon spacing)
  xs:      4px      # tight inner gaps
  sm:      8px      # default inner padding, element gaps
  md:      12px     # card padding, section gaps
  lg:      16px     # page-level content padding
  xl:      24px     # hero/header internal padding (max for components)
  xxl:     32px     # page outer padding on large screens only
  section: 48px     # between major page sections (rare)

  # ── CONCISE SPACING GUIDELINES ────────────────────────────────────────────
  # These are the ENFORCED defaults for all new UI components:
  density: "compact"
  rules:
    page-padding:        "p-4 (16px) on mobile, p-5 (20px) on lg+"
    page-gap:            "gap-3 (12px) between top-level sections"
    card-padding:        "p-4 (16px) — never p-6 or p-8"
    card-gap:            "gap-3 (12px) between cards"
    table-cell-px:       "px-2 to px-4 — never px-6+"
    table-cell-py:       "py-2 to py-3 — never py-4+"
    button-padding:      "px-4 py-2 (default), px-6 py-2.5 (primary CTA)"
    input-padding:       "px-3 py-2 to px-4 py-2.5 — never py-3.5+"
    badge-padding:       "px-3 py-1 to px-3.5 py-1.5"
    tab-bar-padding:     "p-1 (4px) with gap-1.5 between tabs"
    tab-button-padding:  "px-4 py-2"
    hero-header-padding: "p-5 (20px) default, p-6 (24px) on lg+ — never p-8+"
    save-bar-gap:        "pt-3, gap-3"
    role-pill-padding:   "px-4 py-2 with gap-2"
    toggle-size:         "40×22px (not 52×28)"
    icon-sizes:          "w-4 h-4 (inline), w-5 h-5 (input prefix), w-6 h-6 (hero)"
    empty-state-py:      "py-10 to py-12 — never py-16+"
    empty-state-icon:    "w-12 h-12 — never w-16+"


# ─── ELEVATION ───────────────────────────────────────────────────────────────

elevation:
  flat:    "none"
  card:    "0 1px 3px rgba(108,61,232,0.06), 0 1px 2px rgba(0,0,0,0.04)"
  raised:  "0 4px 12px rgba(108,61,232,0.10), 0 2px 4px rgba(0,0,0,0.04)"
  overlay: "0 16px 40px rgba(108,61,232,0.16), 0 4px 12px rgba(0,0,0,0.08)"


# ─── ICON SYSTEM ─────────────────────────────────────────────────────────────

icons:
  library: "Lucide React"          # primary icon set (outline, 1.5px stroke)
  size-sm:  16px
  size-md:  20px
  size-lg:  24px
  size-xl:  32px
  # Coloured icon containers — always pair with module accent
  icon-container:
    borderRadius: "{rounded.md}"   # 8px — standard icon tile
    padding: 10px
  icon-container-lg:
    borderRadius: "{rounded.lg}"   # 12px — hero / empty-state icon tile
    padding: 14px

  # Module icon colours (icon colour + container background):
  modules:
    hr:       { icon: "{colors.hr-accent}",      bg: "{colors.hr-icon-bg}"      }
    project:  { icon: "{colors.project-accent}",  bg: "{colors.project-icon-bg}" }
    ticket:   { icon: "{colors.ticket-accent}",   bg: "{colors.ticket-icon-bg}"  }
    payroll:  { icon: "{colors.payroll-accent}",  bg: "{colors.payroll-icon-bg}" }

  # Sidebar nav icons: use module colour at 100%, muted at 40% when inactive
  sidebar-icon-active:   "module accent at full opacity"
  sidebar-icon-inactive: "{colors.ink-subtle}"


# ─── COMPONENTS ──────────────────────────────────────────────────────────────

components:

  # ── Buttons ────────────────────────────────────────────────────────────────
  button-primary:
    background:   "linear-gradient(135deg, {colors.brand-gradient-from}, {colors.brand-gradient-to})"
    textColor:    "{colors.on-brand}"
    typography:   "{typography.button}"
    rounded:      "{rounded.md}"
    padding:      "8px 16px"       # ← concise: was 10px 20px
    shadow:       "0 2px 8px rgba(108,61,232,0.30)"
    # Hover: lift shadow + 10% brightness
    # Active: scale 0.98

  button-primary-module:
    # Inherits button-primary shape; background swaps to module accent
    # HR → #7C3AED, Project → #0EA5E9, Ticket → #E11D48, Payroll → #059669
    rounded:      "{rounded.md}"
    padding:      "8px 16px"       # ← concise: was 10px 20px
    shadow:       "0 2px 8px rgba(0,0,0,0.15)"

  button-secondary:
    background:   "{colors.surface-0}"
    textColor:    "{colors.ink}"
    border:       "1px solid {colors.border}"
    typography:   "{typography.button}"
    rounded:      "{rounded.md}"
    padding:      "8px 16px"       # ← concise: was 10px 20px

  button-ghost:
    background:   "transparent"
    textColor:    "{colors.ink-muted}"
    typography:   "{typography.button}"
    rounded:      "{rounded.md}"
    padding:      "8px 16px"       # ← concise: was 10px 20px
    # Hover: background {colors.surface-1}

  button-danger:
    background:   "{colors.semantic-error}"
    textColor:    "#FFFFFF"
    typography:   "{typography.button}"
    rounded:      "{rounded.md}"
    padding:      "8px 16px"       # ← concise: was 10px 20px

  button-icon:
    background:   "{colors.surface-1}"
    border:       "1px solid {colors.border}"
    rounded:      "{rounded.md}"
    size:          "36px"
    # contains single icon at size-md

  # ── Profile Header ─────────────────────────────────────────────────────────
  profile-header:
    background:   "linear-gradient(135deg, {colors.brand-gradient-from} 0%, {colors.brand-gradient-mid} 50%, {colors.brand-gradient-to} 100%)"
    textColor:    "{colors.on-brand}"
    minHeight:    "180px"
    avatarSize:   "88px"
    avatarBorder: "3px solid rgba(255,255,255,0.9)"
    badgeVerified:
      background: "#10B981"
      icon:       "CheckCircle"
      size:       "22px"
    tags:
      # "Department", "LMX002", "Developer" pill chips on gradient
      background: "rgba(255,255,255,0.18)"
      border:     "1px solid rgba(255,255,255,0.30)"
      textColor:  "#FFFFFF"
      rounded:    "{rounded.pill}"
      padding:    "4px 12px"
    edit-button:
      background: "rgba(255,255,255,0.95)"
      textColor:  "{colors.brand-solid}"
      rounded:    "{rounded.md}"
      padding:    "8px 18px"

  # ── Tabs ───────────────────────────────────────────────────────────────────
  tab-bar:
    background:   "{colors.surface-0}"
    border:       "1px solid {colors.border}"
    rounded:      "{rounded.lg}"    # ← concise: was rounded.card (14px)
    padding:      "4px"             # p-1 (4px) container
    gap:          "6px"             # gap-1.5 between tabs
    # Tab items sit inside this container
  tab-item-default:
    background:   "transparent"
    textColor:    "{colors.ink-muted}"
    typography:   "{typography.button}"
    rounded:      "{rounded.md}"    # 8px
    padding:      "8px 16px"        # ← concise: was 8px 18px
    icon:         "at ink-subtle, w-4 h-4"
  tab-item-active:
    # HR screen → violet; Project → blue; Ticket → rose; Payroll → green
    background:   "module-accent-light"
    textColor:    "module-accent"
    typography:   "{typography.heading-sm}"
    rounded:      "{rounded.md}"
    padding:      "8px 16px"        # ← concise: was 8px 18px
    iconColor:    "module-accent"
    indicator:    "2px bottom bar in module-accent"
  # Specific module tab mappings:
  tab-active-hr:      { background: "{colors.hr-accent-light}",      textColor: "{colors.hr-accent}" }
  tab-active-project: { background: "{colors.project-accent-light}",  textColor: "{colors.project-accent}" }
  tab-active-ticket:  { background: "{colors.ticket-accent-light}",   textColor: "{colors.ticket-accent}" }
  tab-active-payroll: { background: "{colors.payroll-accent-light}",  textColor: "{colors.payroll-accent}" }

  # ── Section Cards ──────────────────────────────────────────────────────────
  section-card:
    background:   "{colors.surface-0}"
    border:       "1px solid {colors.border}"
    rounded:      "{rounded.card}"  # 12px
    padding:      "16px"            # ← concise: was 24px (use p-4)
    shadow:       "{elevation.card}"
    # Left accent bar — 4px wide, full card height, in module accent colour
    accentBar:    "4px solid module-accent"

  section-card-header:
    # Icon tile + heading inline
    iconContainer: "icon-container in module-accent colours"
    titleTypo:    "{typography.heading-md}"
    titleColor:   "{colors.ink}"
    padding:      "0 0 12px 0"     # ← concise: was 16px bottom
    borderBottom: "1px solid {colors.border-soft}"

  # ── Data Rows ──────────────────────────────────────────────────────────────
  data-row:
    background:   "transparent"
    padding:      "8px 0"           # ← concise: was 12px 0
    borderBottom: "1px solid {colors.border-soft}"
    label:
      typography: "{typography.label}"
      textColor:  "{colors.ink-subtle}"
      letterSpacing: 0.4px
    value:
      typography: "{typography.body}"
      textColor:  "{colors.ink}"
    # Alternating rows: even rows get {colors.surface-1} background at 60% opacity
  data-row-empty:
    value:
      textColor:  "{colors.ink-tertiary}"
      content:    "—"

  # ── Stat / KPI Cards ───────────────────────────────────────────────────────
  stat-card:
    background:   "{colors.surface-0}"
    border:       "1px solid {colors.border}"
    rounded:      "{rounded.card}"
    padding:      "16px 20px"       # ← concise: was 20px 24px
    shadow:       "{elevation.card}"
    iconContainer: "icon-container-lg in module accent"
    valueTypo:    "{typography.heading-xl}"
    valueColor:   "{colors.ink}"
    labelTypo:    "{typography.body-sm}"
    labelColor:   "{colors.ink-muted}"
    trendUp:      { icon: "TrendingUp", color: "{colors.semantic-success}" }
    trendDown:    { icon: "TrendingDown", color: "{colors.semantic-error}" }

  # ── Progress / Completion ──────────────────────────────────────────────────
  progress-ring:
    trackColor:   "{colors.border}"
    fillColor:    "{colors.brand-teal}"
    size:         "72px"
    strokeWidth:  "5px"
    labelTypo:    "{typography.heading-md}"
    labelColor:   "{colors.brand-teal}"

  progress-bar:
    trackBackground: "{colors.border}"
    fillBackground:  "module-accent"   # swaps per module
    height:          "6px"
    rounded:         "{rounded.pill}"

  # ── Badges & Chips ─────────────────────────────────────────────────────────
  chip-status:
    rounded:    "{rounded.pill}"
    padding:    "3px 10px"
    typography: "{typography.caption}"
    fontWeight: 600
    # Use status-* colour pairs above

  chip-priority:
    rounded:    "{rounded.sm}"
    padding:    "3px 8px"
    typography: "{typography.caption}"
    fontWeight: 600
    dotLeader:  "6px circle in text colour"

  chip-module:
    # "HR", "Project", "Payroll", "Ticket" taxonomy chips
    rounded:    "{rounded.pill}"
    padding:    "4px 12px"
    typography: "{typography.caption}"
    fontWeight: 600
    background: "module-accent-light"
    textColor:  "module-accent"

  chip-neutral:
    background: "{colors.surface-chip}"
    textColor:  "{colors.ink-muted}"
    rounded:    "{rounded.pill}"
    padding:    "3px 10px"
    typography: "{typography.caption}"

  # ── Avatar ─────────────────────────────────────────────────────────────────
  avatar-xl:
    size:     "88px"
    rounded:  "{rounded.pill}"   # full circle
    border:   "3px solid rgba(255,255,255,0.9)"
  avatar-md:
    size:     "40px"
    rounded:  "{rounded.pill}"
    border:   "2px solid {colors.surface-0}"
  avatar-sm:
    size:     "28px"
    rounded:  "{rounded.pill}"
  avatar-stack:
    overlap: "-8px"              # stacked avatars in team views

  # ── Sidebar Navigation ─────────────────────────────────────────────────────
  sidebar:
    width:          "240px"
    background:     "{colors.surface-0}"
    border:         "1px solid {colors.border}"
    paddingV:       "16px"
    logo-area:
      padding:      "16px 20px 24px"
    nav-section-label:
      typography:   "{typography.eyebrow}"
      color:        "{colors.ink-tertiary}"
      padding:      "8px 20px 4px"
    nav-item-default:
      padding:      "9px 20px"
      rounded:      "{rounded.md}"
      iconColor:    "{colors.ink-subtle}"
      textColor:    "{colors.ink-muted}"
      typography:   "{typography.body}"
    nav-item-active:
      background:   "module-accent-light"
      iconColor:    "module-accent"
      textColor:    "module-accent"
      fontWeight:   600
      leftBar:      "3px solid module-accent"

  # ── Inputs & Forms ─────────────────────────────────────────────────────────
  text-input:
    background:   "{colors.surface-0}"
    border:       "1px solid {colors.border}"
    textColor:    "{colors.ink}"
    placeholder:  "{colors.ink-subtle}"
    typography:   "{typography.body}"
    rounded:      "{rounded.md}"
    padding:      "8px 12px"        # ← concise: was 10px 14px
  text-input-focused:
    border:       "1.5px solid {colors.border-focus}"
    shadow:       "0 0 0 3px rgba(139,92,246,0.15)"
  text-input-error:
    border:       "1.5px solid {colors.semantic-error}"
    shadow:       "0 0 0 3px rgba(239,68,68,0.12)"

  select-input:
    # same as text-input + chevron icon at {colors.ink-muted}
    chevronIcon:  "ChevronDown at 16px"

  form-label:
    typography:   "{typography.label}"
    color:        "{colors.ink-muted}"
    marginBottom: "6px"

  # ── Tables ─────────────────────────────────────────────────────────────────
  table:
    background:      "{colors.surface-0}"
    border:          "1px solid {colors.border}"
    rounded:         "{rounded.card}"
    shadow:          "{elevation.card}"
  table-header:
    background:      "{colors.surface-1}"
    textColor:       "{colors.ink-muted}"
    typography:      "{typography.label}"
    padding:         "10px 14px"     # ← concise: was 12px 16px
    borderBottom:    "1px solid {colors.border}"
  table-row:
    textColor:       "{colors.ink}"
    typography:      "{typography.body}"
    padding:         "10px 14px"     # ← concise: was 14px 16px
    borderBottom:    "1px solid {colors.border-soft}"
    hoverBackground: "{colors.surface-1}"
  table-row-selected:
    background:      "{colors.hr-accent-light}"    # module-tinted selected row
    borderLeft:      "3px solid module-accent"

  # ── Empty States ───────────────────────────────────────────────────────────
  empty-state:
    iconContainer:  "icon-container-lg in module-accent colours"
    titleTypo:      "{typography.heading-md}"
    bodyTypo:       "{typography.body}"
    bodyColor:      "{colors.ink-muted}"
    ctaButton:      "button-primary-module"

  # ── Modals & Drawers ───────────────────────────────────────────────────────
  modal:
    background:     "{colors.surface-0}"
    rounded:        "{rounded.xl}"
    shadow:         "{elevation.overlay}"
    padding:        "24px"           # ← concise: was 32px
    header:
      titleTypo:    "{typography.heading-lg}"
      titleColor:   "{colors.ink}"
      closeIcon:    "X at {colors.ink-muted}"
      borderBottom: "1px solid {colors.border}"
      padding:      "0 0 16px 0"     # ← concise: was 20px
    footer:
      borderTop:    "1px solid {colors.border}"
      padding:      "16px 0 0 0"     # ← concise: was 20px
      buttonGap:    "8px"            # ← concise: was 12px

  drawer:
    width:          "480px"
    background:     "{colors.surface-0}"
    shadow:         "{elevation.overlay}"
    header:
      background:   "linear-gradient(135deg, {colors.brand-gradient-from}, {colors.brand-gradient-to})"
      textColor:    "{colors.on-brand}"
      padding:      "24px"
      minHeight:    "80px"

  # ── Toast / Notifications ──────────────────────────────────────────────────
  toast-success:
    background:   "{colors.semantic-success-light}"
    border:       "1px solid {colors.semantic-success}"
    iconColor:    "{colors.semantic-success}"
    textColor:    "{colors.ink}"
    icon:         "CheckCircle2"
    rounded:      "{rounded.md}"
    padding:      "12px 16px"
  toast-error:
    background:   "{colors.semantic-error-light}"
    border:       "1px solid {colors.semantic-error}"
    iconColor:    "{colors.semantic-error}"
    icon:         "XCircle"
  toast-warning:
    background:   "{colors.semantic-warning-light}"
    border:       "1px solid {colors.semantic-warning}"
    iconColor:    "{colors.semantic-warning}"
    icon:         "AlertTriangle"
  toast-info:
    background:   "{colors.semantic-info-light}"
    border:       "1px solid {colors.semantic-info}"
    iconColor:    "{colors.semantic-info}"
    icon:         "Info"

  # ── Calendar / Timeline ────────────────────────────────────────────────────
  calendar-event:
    rounded:      "{rounded.sm}"
    padding:      "4px 8px"
    typography:   "{typography.body-sm}"
    # Event colour = module accent; text = on-accent white

  timeline-item:
    dotSize:      "10px"
    dotColor:     "module-accent"
    lineColor:    "{colors.border}"
    connectorWidth: "2px"

  # ── Kanban Boards (Project) ────────────────────────────────────────────────
  kanban-column:
    background:   "{colors.surface-1}"
    border:       "1px solid {colors.border}"
    rounded:      "{rounded.card}"
    padding:      "12px"
    headerColor:  "column-status colour"

  kanban-card:
    background:   "{colors.surface-0}"
    border:       "1px solid {colors.border}"
    rounded:      "{rounded.md}"
    padding:      "14px"
    shadow:       "{elevation.card}"
    # Dragging state: shadow = {elevation.raised}, border = {colors.border-focus}

  # ── Top App Bar ────────────────────────────────────────────────────────────
  top-bar:
    background:   "{colors.surface-0}"
    border:       "0 0 1px 0 solid {colors.border}"
    height:       "60px"
    padding:      "0 24px"
    shadow:       "0 1px 4px rgba(108,61,232,0.06)"
    searchInput:  "text-input variant with magnifier icon; max-width 400px"
    actions:      "NotificationBell, UserAvatar at right"



# ─── MODULE SPECS ────────────────────────────────────────────────────────────
# Each module defines its canonical accent, icon, eyebrow, and surface tint.
# An AI agent building any screen must reference the correct module block.

modules:

  hr-tracker:
    eyebrow:        "HR TRACKER"
    accent:         "{colors.hr-accent}"          # #7C3AED
    accent-light:   "{colors.hr-accent-light}"    # #EDE9FE
    icon:           "Users"
    icon-color:     "{colors.hr-accent}"
    icon-bg:        "{colors.hr-icon-bg}"
    tab-active:     "tab-active-hr"
    nav-active:     "background {colors.hr-accent-light}, text {colors.hr-accent}"
    header-gradient: "brand-gradient (violet→fuchsia)"
    screens:
      - Profile (tabs: Personal, Professional, Financial, Documents)
      - Employee Directory (table with avatar, name, department, status chips)
      - Attendance & Leave (calendar + timeline)
      - Org Chart (tree diagram, module-tinted nodes)
      - Appraisal (rating cards with progress bars in hr-accent)

  project-management:
    eyebrow:        "PROJECTS"
    accent:         "{colors.project-accent}"     # #0EA5E9
    accent-light:   "{colors.project-accent-light}"
    icon:           "FolderKanban"
    icon-color:     "{colors.project-accent}"
    icon-bg:        "{colors.project-icon-bg}"
    tab-active:     "tab-active-project"
    nav-active:     "background {colors.project-accent-light}, text {colors.project-accent}"
    header-gradient: "linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%)"
    screens:
      - Dashboard (stat cards in project-accent, burndown chart using chart-blue)
      - Kanban Board (columns: Backlog, In Progress, Review, Done)
      - Gantt/Timeline (bars in project-accent, milestones as diamonds)
      - Task Detail Drawer (header in project gradient, fields below)
      - Team Workload (stacked bar chart, project-accent family)

  ticket-system:
    eyebrow:        "SUPPORT TICKETS"
    accent:         "{colors.ticket-accent}"      # #E11D48
    accent-light:   "{colors.ticket-accent-light}"
    icon:           "TicketCheck"
    icon-color:     "{colors.ticket-accent}"
    icon-bg:        "{colors.ticket-icon-bg}"
    tab-active:     "tab-active-ticket"
    nav-active:     "background {colors.ticket-accent-light}, text {colors.ticket-accent}"
    header-gradient: "linear-gradient(135deg, #9F1239 0%, #E11D48 100%)"
    screens:
      - Inbox / Queue (table with priority chips, status chips, SLA timer)
      - Ticket Detail (header in ticket gradient; conversation thread below)
      - Create Ticket Modal (category, priority, assignment, attachments)
      - Reports (ticket volume chart using chart-rose, resolution time)
      - SLA Dashboard (gauge charts — red/amber/green based on breach status)
    priority-chips:
      critical: "priority-critical-* tokens"
      high:     "priority-high-* tokens"
      medium:   "priority-medium-* tokens"
      low:      "priority-low-* tokens"

  payroll:
    eyebrow:        "PAYROLL"
    accent:         "{colors.payroll-accent}"     # #059669
    accent-light:   "{colors.payroll-accent-light}"
    icon:           "BadgeDollarSign"
    icon-color:     "{colors.payroll-accent}"
    icon-bg:        "{colors.payroll-icon-bg}"
    tab-active:     "tab-active-payroll"
    nav-active:     "background {colors.payroll-accent-light}, text {colors.payroll-accent}"
    header-gradient: "linear-gradient(135deg, #064E3B 0%, #059669 100%)"
    screens:
      - Payslip View (header in payroll gradient, salary breakdown table)
      - Payroll Run (step indicator in payroll-accent, confirmation modal)
      - Salary Structure (data rows with left-accent bar in payroll)
      - Tax & Deductions (doughnut chart in chart-green/chart-amber)
      - Payroll History (table, download icon in payroll-accent)

  asset-management:
    eyebrow:        "ASSETS"
    accent:         "{colors.asset-accent}"       # #D97706  Amber 600
    accent-light:   "{colors.asset-accent-light}" # #FEF3C7  Amber 100
    icon:           "Package"
    icon-color:     "{colors.asset-accent}"
    icon-bg:        "{colors.asset-icon-bg}"
    tab-active:
      background:   "{colors.asset-accent-light}"
      textColor:    "{colors.asset-accent}"
    nav-active:     "background {colors.asset-accent-light}, text {colors.asset-accent}"
    header-gradient: "linear-gradient(135deg, #92400E 0%, #D97706 100%)"
    screens:
      - Asset Register (table: assetId, name, category, status chip, condition chip, location)
      - Asset Detail (section-card with purchase info, warranty, current holder)
      - Asset Categories (simple table: name, code, warrantyMonths, isActive toggle)
      - Add Asset Form (modal/drawer with purchase + condition fields)
      - My Assets (employee self-view — Phase 2)


# ─── LAYOUT ──────────────────────────────────────────────────────────────────

layout:
  app-shell:
    sidebar:       "240px fixed left"
    top-bar:       "60px fixed top"
    content-area:
      marginLeft:  "240px"
      paddingTop:  "60px"
      padding:     "16px 20px"      # ← concise: was 24px 32px
      background:  "{colors.canvas}"
      maxWidth:    "1440px"

  page-header:
    # Inside content area — eyebrow + title + breadcrumb + CTA row
    eyebrow:
      typography:  "{typography.eyebrow}"
      color:       "module-accent"
      marginBottom: "4px"
    title:
      typography:  "{typography.heading-xl}"
      color:       "{colors.ink}"
    actions:       "right-aligned button row"
    marginBottom:  "24px"

  card-grid:
    gap:         "12px"             # ← concise: was 20px
    "4-up":      "repeat(4, 1fr)"  # stat cards
    "3-up":      "repeat(3, 1fr)"  # feature cards
    "2-up":      "repeat(2, 1fr)"  # section cards (Basic Info + Family side by side)
    "1-up":      "repeat(1, 1fr)"  # full-width tables

  breakpoints:
    desktop-xl:  "1440px"
    desktop:     "1280px"
    tablet:      "1024px — sidebar collapses to icon rail (56px)"
    mobile:      "768px — sidebar becomes bottom sheet; grid → 1-up"


# ─── DO'S AND DON'TS ─────────────────────────────────────────────────────────

rules:

  do:
    - "ALWAYS read and validate against this DESIGN.md file before planning, proposing, or implementing any UI changes."
    - "ALWAYS use CONCISE DENSITY spacing — see spacing.rules. p-4 cards, gap-3 sections, py-2 table cells. This is non-negotiable."
    - "Prefer compact controls: px-4 py-2 buttons, px-3.5 py-1.5 badges, p-1 tab containers."
    - "Use rounded-lg (12px) for cards, rounded-md (8px) for buttons/inputs, rounded-xl (16px) only for hero headers."
    - "Use the module accent colour as the left-border bar on every section-card."
    - "Always tint active tab backgrounds with module-accent-light, not pure white."
    - "Use colourful icon containers (icon-bg per module) on every section header and nav item."
    - "Apply the brand gradient to profile headers, drawer headers, and module page-hero banners."
    - "Use chart-* palette colours for all analytics — never raw module accents on charts (too saturated)."
    - "Match status chip colours to the semantic palette — never reuse module accents as status signals."
    - "Keep {colors.canvas} #F7F8FC as the content-area background — it provides breathing room between cards."
    - "Use Inter weight 600 for card titles, 500 for buttons, 400 for body."
    - "Priority chips in Ticket module must always show a coloured dot leader."
    - "Profile completion rings always use {colors.brand-teal} fill on {colors.border} track."

  dont:
    - "NEVER plan or propose any UI design or layout without first reading and validating it against this DESIGN.md file."
    - "NEVER use p-6, p-8, p-10 on cards or panels — maximum card padding is p-4 (16px). This is ENFORCED."
    - "NEVER use gap-5, gap-6+ between sections — use gap-3 (12px) as default section gap."
    - "NEVER use py-4+, px-6+ on table cells — maximum is py-3, px-4."
    - "NEVER use px-10, py-3.5+ on buttons — maximum CTA button is px-6 py-2.5."
    - "NEVER use rounded-2xl (16px) or rounded-3xl (24px) on cards/panels — rounded-xl (12px) is the max for cards."
    - "NEVER use w-16+ h-16+ for empty state icons — maximum is w-12 h-12."
    - "NEVER use py-16+ for empty state vertical padding — maximum is py-12."
    - "Don't use plain black (#000) or pure white (#FFF) as the only UI surfaces."
    - "Don't use module accent colours as full card backgrounds — only as left bars, icon containers, and chip fills."
    - "Don't mix module accents within a single screen — one screen = one module accent."
    - "Don't use the brand gradient as a repeated body background — it's reserved for hero/header areas."
    - "Don't use the report/chart palette as primary UI colours."
    - "Don't remove the left-accent bar from section-cards — it carries the module signal."
    - "Don't pill-round primary action buttons — use rounded.md (8px) only."
    - "Don't omit the eyebrow label above page titles — it orients the user in the module."
    - "Don't use uppercase tracking on body copy — eyebrow only."
    - "Don't use drop shadows heavier than elevation.raised in normal flow — overlay only for modals."


# ─── AI AGENT USAGE GUIDE ────────────────────────────────────────────────────

agent-instructions:
  description: >
    This DESIGN.md is intended to be consumed by an AI coding agent (e.g.
    Claude Code, Cursor, GitHub Copilot Workspace) generating Flutter or
    React screens for the Workhub ERP application. Follow these rules exactly.

    CRITICAL MANDATE: No UI design or interface implementation should be planned
    or proposed before reading and validating this DESIGN.md file first.

  step-by-step:
    0: "MANDATORY PRE-STEP — DESIGN VALIDATION: You MUST read and validate this entire DESIGN.md file first. Any UI design must not be planned or proposed before validating against this design system."
    1: "CRITICAL — CONCISE DENSITY: Read spacing.rules FIRST. All components MUST use compact spacing (p-4 cards, gap-3 sections, py-2 tables, px-4 py-2 buttons). Oversized spacing (p-6+, gap-5+, py-4+ cells) is a BLOCKER defect."
    2: "Identify the module: HR Tracker | Project Management | Ticket System | Payroll."
    3: "Read the module block under `modules:` and note: accent, accent-light, icon, icon-bg, header-gradient."
    4: "Wrap the screen in the app-shell layout (sidebar + top-bar + content-area at p-4 lg:p-5)."
    5: "Render a page-header with: eyebrow in module-accent, title in ink, right-aligned CTA."
    6: "If the screen has a profile/hero area, apply the header-gradient as the banner background (p-5 lg:p-6 max)."
    7: "Build section-cards with: white bg, 1px border, card shadow, 4px left-accent bar, padding p-4, rounded-xl."
    8: "Every section-card header: icon-container (icon-bg + icon-color from module) + heading-md title."
    9: "Tabs: tab-bar container (p-1, gap-1.5) + tab-item-active (px-4 py-2) in module's tab-active token."
    10: "Status chips: always use chip-status with semantic colour pairs — not module accents."
    11: "Charts: always use chart-* palette tokens, never raw module accents."
    12: "All icon sizes: sm (16px) for inline, md (20px) for nav, lg (24px) for card headers, xl (32px) for stat cards."
    13: "Empty states: icon w-12 h-12 + heading-md + body (ink-muted) + button-primary-module. Max py-12."

  flutter-notes:
    - "Use BoxDecoration with LinearGradient for gradient surfaces."
    - "Card elevation = 2.0 for section-card; 6.0 for modals."
    - "BorderRadius.circular(14) = rounded.card default."
    - "Lucide icons are available via lucide_flutter package."
    - "Inter font: google_fonts package, FontWeight.w400/w500/w600 only."
    - "Coloured left-accent bar: Container with leftBorderSide in module accent colour."

  react-notes:
    - "Tailwind classes are fine; map tokens to Tailwind color values in tailwind.config."
    - "Lucide React icons: import { Users, FolderKanban, TicketCheck, BadgeDollarSign } from 'lucide-react'."
    - "Gradient: className='bg-gradient-to-br from-[#6C3DE8] to-[#C026D3]'."
    - "Left-accent bar: borderLeft: '4px solid {module-accent}' inline or via Tailwind arbitrary value."
    - "Tab indicator: bottom border 2px in module accent on active tab item."


# ─── DESIGN TOKENS QUICK REFERENCE ──────────────────────────────────────────

quick-ref:
  most-used-colours:
    canvas:           "#F7F8FC"
    surface-card:     "#FFFFFF"
    border:           "#E2E5F0"
    ink:              "#1A1D2E"
    ink-muted:        "#4B5068"
    brand-violet:     "#6C3DE8"
    brand-teal:       "#0EA5E9"
    hr-violet:        "#7C3AED"
    project-blue:     "#0EA5E9"
    ticket-rose:      "#E11D48"
    payroll-green:    "#059669"
    success:          "#10B981"
    warning:          "#F59E0B"
    error:            "#EF4444"

  icon-library:       "Lucide React / lucide_flutter"
  font:               "Inter (Google Fonts)"
  base-radius:        "12px (rounded.card) for cards; 8px (rounded.md) for inputs/buttons"
  base-spacing:       "4px unit (concise density)"
  density:            "compact — p-4 cards, gap-3 sections, py-2 cells, px-4 py-2 buttons"
  gradient:           "linear-gradient(135deg, #6C3DE8 0%, #8B5CF6 50%, #C026D3 100%)"

# ─── UI-TO-ARCHITECTURE WIRING ────────────────────────────────────────────────

ui-architecture-connections:

  navigation-philosophy:
    sidebar-rendering: >
      The app-shell sidebar nav layout is mapped directly to the `sidebars` configuration collection.
      Menus are compiled dynamically from DB configs based on the logged-in user's role (ADR-005).
    route-guarding: >
      Routes are guarded on the client via `axiosInstance` error intercepts. If an API returns a 403,
      the frontend immediately hides related UI widgets and navigates to the login screen.

  domain-color-semantics:
    hr:       { accent: "{colors.hr-accent}",      meaning: "Active worker records, profile updates, and leave approvals." }
    projects: { accent: "{colors.project-accent}", meaning: "Kanban task boards, milestones, and daily activity lists." }
    tickets:  { accent: "{colors.ticket-accent}",  meaning: "Customer SLA indicators, ticket inbox, and urgency states." }
    payroll:  { accent: "{colors.payroll-accent}", meaning: "Completed payslips, payroll run cycles, and tax matrices." }
    assets:   { accent: "{colors.asset-accent}",   meaning: "Hardware register, repair incidents, and allocations." }

  dynamic-status-chips:
    mapping: >
      Chip colors and text values are never hardcoded. They are fetched from `status_configss` and
      `status_mappings` at runtime to match the operational and metaStatus states of records.

  accessibility-compliance:
    wcag: >
      All colors meet a minimum contrast ratio of 4.5:1 for body copy and 3:1 for large display headers
      against their respective white (#FFFFFF) and canvas (#F7F8FC) backgrounds.

