# UX Standards — WorkHub

> Standard patterns applied across web (React/Vite) and mobile (React Native/Expo) apps.
> Referenced by `frontend-ui-tokens/SKILL.md`. Update when new UX patterns are established.

---

## 1. Login Page (web: `login.jsx`, mobile: `Login.tsx`)

| Element | Pattern | Details |
|---------|---------|---------|
| Layout | Two-panel (web) / Stacked (mobile) | Web: hero left, form right. Mobile: gradient header top, form below |
| Brand Hero | Dark gradient (`#0F172A` → `#1E3A8A`) | App icon/logo, name "WorkHub", tagline |
| Feature Cards | 3 module-accented cards | Bottom-left on web; pill badges on mobile |
| Background | Animated floating shapes (web only) | `@keyframes float` in CSS, 3 colored blobs |
| Form Fields | Floating label inputs | Web: `FloatingLabelInput`. Mobile: `TextInput` with label above |
| Forgot Password | "Forgot?" link below password field | Uses module accent color, links to `/forgot-password` |
| Submit Button | Brand gradient with ArrowRight icon | `tracker-btn-brand` (web) / blue filled + ArrowRight (mobile) |
| Error State | Red banner above form | Shows validation and API error messages |
| Branding | "WorkHub" name, "© {year} Portal" footer | No "Workhub" or old branding anywhere in UI |

## 2. Splash Screen (web only: `SplashScreen.jsx`)

| Element | Pattern |
|---------|---------|
| Trigger | Once per browser session (`sessionStorage` flag) |
| Animation | Gradient fade-in → stacked logo → title → 3 bouncing dots → fade-out |
| Duration | ~2.7 seconds total |
| Transition | Fade out to opacity 0, then switch to main app |
| State | Stored in `App.jsx`, `showSplash` → `useState(true)`, callback from `onFinish` |

## 3. Dashboard (web: `Dashboard/index.jsx`, mobile: `dashboard/index.tsx`)

### 3a. Hero Section (all roles)

| Element | Pattern |
|---------|---------|
| Greeting | Time-based: "Good Morning/Afternoon/Evening" with emoji |
| Title | "Welcome back, {firstName}!" |
| Date | Formatted: "Thursday, 13 March 2025" (en-IN locale) |
| CTA Buttons | Employee: Clock In/Out button + Tasks button. Manager/Admin: Tasks button |

### 3b. Employee View

| Section | Component | Details |
|---------|-----------|---------|
| Stat Cards | `StatCard` | Attendance status (color-coded), Leave Balance, My Tasks |
| Quick Actions | Grid of 4 Link cards | Apply Leave, View Tasks, Daily Tracker, Regularize |
| Priority Tasks | `PriorityTasks` component | Top 5 incomplete tasks, sorted by priority |
| Recent Activity | `RecentActivity` component | Cross-model feed (employees, tasks, leaves, attendances) |

### 3c. Manager/Admin View

| Section | Component | Details |
|---------|-----------|---------|
| Stat Cards | `StatCard` 4-column | Total Employees, Present Today, On Leave (calc), Pending Leaves count |
| Quick Actions | Role-specific grid | Manager: Approve Leaves, Assign Task, Team Tracker, Team Directory. SuperAdmin: Company Settings, Add Employee, All Leaves, Master Data |
| Pending Leaves | Custom card | List of 4 pending leaves with ProfileImage, leave type, date, status badge |
| Recent Tasks | `TableGenerator` | Tasks model, searchable, sortable, auto-refresh 30s |
| Empty State | CheckCircle icon + "No pending requests" | For pending leaves section when empty |

### 3d. Mobile Role Components

| Role | Component | File |
|------|-----------|------|
| Employee | `EmployeeDashboard` | `App/components/roles/employee/EmployeeDashboard.tsx` |
| Manager | `ManagerDashboard` | `App/components/roles/manager/ManagerDashboard.tsx` |
| HR/Admin | `HRDashboard` | `App/components/roles/hr/HRDashboard.tsx` |
| SuperAdmin | `SuperAdminDashboard` | `App/components/roles/superadmin/SuperAdminDashboard.tsx` |

Each renders a 2-column stat card grid + 2-column action cards.

## 4. Loading States

| Context | Pattern |
|---------|---------|
| Page Load | Centered spinner overlay: `h-12 w-12` border spinner + "Loading {page}..." text |
| Pull-to-refresh (mobile) | `RefreshControl` with `refreshing` state |
| Button Submit | Disable button + show spinner/indicator, re-enable after complete |
| Data Fetch | `loading` boolean → conditional render |
| API Error | `console.error` + toast notification + set fallback state |

## 5. Empty States

| Context | Pattern |
|---------|---------|
| Dashboard Pending Leaves | `CheckCircle` icon + "No pending requests" text |
| Dashboard Recent Tasks | `Inbox` icon + "No recent tasks found" text |
| List Pages | Consistent icon + message + optional CTA |

## 6. Error & Validation

| Context | Pattern |
|---------|---------|
| Login Error | Red banner above form: "Invalid email or password" |
| Form Validation | Client-side check before API call, show inline error |
| API 401 | Redirect to login, clear stored tokens |
| Network Error | Toast notification "Something went wrong" |

## 7. Branding Rules

| Asset | Standard |
|-------|----------|
| App Name | "WorkHub" (never "Workhub" or "LMX" in UI) |
| Footer | "© {currentYear} Portal" |
| Icon | Initial letter "W" in brand container |
| Gradient | Dark navy `#0F172A` → blue `#1E3A8A` for heroes |
| Module accents | Per `design-tokens.md` module accent table |
| Tokens | CSS variables from `tokens.css`, never raw hex (web) |

## 8. Responsive Breakpoints (web)

| Breakpoint | Behavior |
|------------|----------|
| `<1024px` | Sidebar collapses to icon rail / drawer |
| `<768px` | 2-column → 1-column layouts, smaller padding |
| `<640px` | Full-width cards, stacked layout |

## 9. Mobile-specific Patterns

| Pattern | Standard |
|---------|----------|
| Auth Route | Stack navigator in `(authRoute)` group |
| Protected Route | Drawer navigator in `(protectedRoute)` group |
| Sidebar | Fetched from `/populate/read/sidebars`, fallback default routes |
| Branding in Drawer | "WorkHub" with blue "Hub" suffix |
| Keyboard | `KeyboardAvoidingView` on login, `ScrollView` `keyboardShouldPersistTaps="handled"` |
| Password visibility | Eye/EyeOff toggle icon in password field |
| Safe Area | `SafeAreaView` from `react-native-safe-area-context` |

## History

| Date | Change |
|------|--------|
| 2025-03 | Initial UX standards established after web + mobile redesign |
