# Frontend Core — Module Brain

> This document covers the **core architecture** of the frontend — not individual pages, but the foundational wiring that every page depends on.

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | React | 19.1.1 |
| **Build Tool** | Vite | 7.1.2 |
| **Language** | JSX (JavaScript + JSX) | ES Modules (`"type": "module"`) |
| **Styling** | Tailwind CSS | 4.1.12 (via `@tailwindcss/vite` plugin) |
| **Routing** | React Router DOM | 7.8.2 (file-based via `vite-plugin-pages`) |
| **HTTP Client** | Axios | 1.11.0 (single instance: `api/axiosInstance.js`) |
| **UI Components** | MUI (Material UI) | 7.3.2 (`@mui/material`, `@mui/lab`, `@mui/x-date-pickers`) |
| **Icons** | Lucide React, React Icons, Heroicons, Ant Design Icons | Multiple |
| **Notifications** | react-hot-toast | 2.6.0 |
| **Real-Time** | Socket.IO Client | 4.8.1 |
| **Date Handling** | date-fns | 4.1.0 |
| **Auth Token** | jwt-decode | 4.0.0 |
| **Export** | xlsx (SheetJS) | 0.18.5 |
| **Cookies** | js-cookie | 3.0.5 |
| **Typography** | Inter (Google Fonts, loaded via index.html) | — |

---

## 2. Project Structure

```
frontend/src/
├── api/
│   └── axiosInstance.js        ← Single axios instance (auth headers, CSRF, interceptors)
├── assets/                     ← Static images (profile placeholders, etc.)
├── components/
│   ├── Common/                 ← Shared UI components (ProfileImage, etc.)
│   ├── Static/                 ← Fixed layout components (NotificationDrawer, etc.)
│   ├── role/                   ← Role-based UI components
│   ├── useGenericAPI.js        ← Hook for dynamic populate API calls
│   └── useSocket.js            ← Socket.IO connection hook
├── constants/                  ← App-wide constants and config
├── context/
│   ├── authProvider.jsx        ← Auth state (user, setUser, loading)
│   ├── permissionProvider.jsx  ← CBAC + ABAC: hasCapability(key), can(action, model)
│   ├── themeProvider.jsx       ← Dark/light mode toggle (localStorage-persisted)
│   └── notificationProvider.jsx ← Real-time notification state
├── hooks/
│   ├── useUserProfile.js       ← Fetch and cache current user profile data
│   └── useUserRole.js          ← Derive role name from user JWT
├── layouts/
│   ├── baseLayouts.jsx         ← Root layout (auth guard + sidebar + topnav)
│   ├── Sidebar.jsx             ← Dynamic sidebar (loaded from DB via populate API)
│   └── topNavBar.jsx           ← Top nav with search, notifications, user avatar
├── pages/                      ← File-based routing (vite-plugin-pages)
│   ├── login.jsx               ← Login page (public)
│   ├── Logout.jsx              ← Logout handler
│   ├── Dashboard/              ← Dashboard module
│   ├── Attendance/             ← Attendance module
│   ├── CRM/                    ← CRM module
│   ├── Tickets/                ← Ticket system module
│   ├── tasks/                  ← Task management module
│   ├── Teams.jsx               ← Team management
│   ├── Profile/                ← User profile module
│   ├── Settings/               ← System settings module
│   ├── Master-Data/            ← Master data management
│   ├── Travel-Expenses/        ← Travel & expense module
│   ├── PlayGround/             ← Development playground
│   └── [model]/                ← Dynamic model-based pages
├── utils/                      ← Shared utility functions
├── App.jsx                     ← Root component (renders BaseLayout)
├── main.jsx                    ← Entry point (providers: Theme > Auth > Notification)
└── index.css                   ← Global styles + Tailwind import + animations
```

---

## 3. Core Wiring (How Everything Connects)

### 3.1 Entry Point (`main.jsx`)
```
ReactDOM.createRoot(#root)
  └─ React.StrictMode
       └─ BrowserRouter
            └─ ThemeProvider        ← Dark/light class on <html>
                 └─ AuthProvider    ← JWT decode, token storage
                      └─ NotificationProvider  ← Socket.IO notifications
                           └─ App  ← Renders BaseLayout
```

### 3.2 Auth Guard (`baseLayouts.jsx`)
The `BaseLayout` component acts as the central auth guard:
- If `loading` → show loading spinner
- If `!user && path !== /login` → redirect to `/login`
- If `user && path === /login` → redirect to `/dashboard`
- If `path === /login` → render `<Login />` (no sidebar/topnav)
- Otherwise → render sidebar + topnav + page content

### 3.3 File-Based Routing (react-pages via vite-plugin-pages)
Routes are automatically generated from the file/folder structure inside the `src/pages/` directory:
- Creating a React component file directly (e.g., `pages/login.jsx` or `pages/ForgotPassword.jsx`) or a subdirectory with an `index.jsx` (e.g., `pages/Dashboard/index.jsx`) automatically registers a route.
- The resulting route paths match the folder/file names (including camelCase naming, e.g., `forgotPassword.jsx` maps to `/forgotPassword`).
- Dynamic routes use square brackets (e.g., `pages/[model]/index.jsx` maps to `/:model` as a dynamic route parameter).

### 3.4 API Layer (`axiosInstance.js`)
- Single pre-configured Axios instance
- Base URL from environment variables
- Auto-attaches JWT `Authorization: Bearer <token>` header
- Auto-attaches `x-device-uuid` header for device fingerprinting
- Interceptors handle 401 responses (token refresh or redirect to login)
- **NEVER create a second axios instance** — all API calls go through this one

### 3.5 Theme System (`themeProvider.jsx`)
- Persisted in `localStorage` under key `"theme"`
- Toggles `.dark` / `.light` class on `document.documentElement`
- Tailwind CSS v4 uses `@custom-variant dark (&:where(.dark, .dark *))` for dark mode

### 3.6 Dynamic Sidebar (`Sidebar.jsx`)
- Sidebar menu items are **fetched from the database** via `POST /populate/read/sidebars`
- Supports hierarchical parent/child navigation
- Icons loaded dynamically from `react-icons/md` (Material Design)

---

## 4. Key Packages & Their Roles

| Package | Purpose | Where Used |
|---|---|---|
| `@tailwindcss/vite` | Tailwind CSS v4 Vite plugin | `vite.config.js` |
| `tailwindcss` | Utility-first CSS framework | `index.css` (`@import "tailwindcss"`) |
| `vite-plugin-pages` | File-based routing from `pages/` | `vite.config.js`, `baseLayouts.jsx` |
| `@vitejs/plugin-react-swc` | Fast React JSX transform via SWC | `vite.config.js` |
| `axios` | HTTP client | `api/axiosInstance.js` |
| `socket.io-client` | Real-time WebSocket | `components/useSocket.js`, `notificationProvider.jsx` |
| `jwt-decode` | Decode JWT tokens without verification | `login.jsx`, `authProvider.jsx` |
| `react-hot-toast` | Toast notifications | Throughout components |
| `@mui/material` | Material UI components | Form fields, dialogs, tables |
| `@mui/x-date-pickers` | Date/time picker components | Attendance, tasks |
| `lucide-react` | Modern icon library | TopNavBar, pages |
| `react-icons` | Icon collection (Material Design set) | Sidebar icons |
| `date-fns` | Date formatting/manipulation | Throughout |
| `xlsx` | Excel export functionality | Reports, data export |
| `js-cookie` | Cookie management | Auth tokens |
| `file-saver` | Client-side file download | Export features |
| `react-calendar` | Calendar widget | Attendance module |

---

## 5. Dark Mode Implementation

The app uses a **class-based dark mode** strategy:
1. `themeProvider.jsx` adds/removes `.dark` class on `<html>`
2. Tailwind CSS v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *))`
3. All components use `dark:` prefix for dark mode styles
4. Theme preference persisted in `localStorage`

---

## 6. Rules for AI Agents

1. **Never modify `axiosInstance.js`** — it controls global auth, CSRF, and interceptors
2. **Never modify `authProvider.jsx`** or `themeProvider.jsx` without approval — they wrap the entire app
3. **Always use Tailwind CSS classes** — no inline styles or separate CSS modules per component
4. **Always support dark mode** — every new component must include `dark:` variants
5. **Always be responsive** — use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
6. **Use `axiosInstance`** for all API calls — never import axios directly
7. **File-based routing** — creating a new page means creating a file in `pages/`
8. **Use existing UI libraries** — MUI for complex form controls, Lucide for icons
