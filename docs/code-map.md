# Aurora LMS Code Documentation

Comprehensive file-by-file reference for the LMS simulation. Use this guide to quickly understand responsibilities, entry points, and data flow across both the React (client) and Express (server) workspaces.

## Client (React + Vite)

| File | Description |
| --- | --- |
| `client/src/main.jsx` | React root. Mounts `<App />` inside `React.StrictMode` and applies global styles from `index.css`. |
| `client/src/App.jsx` | Configures React Router, wraps pages in `AuthProvider`, applies `AuroraBackground`, and defines the `ProtectedRoute` guard logic. |
| `client/src/index.css` | Tailwind layer plus Aurora-specific utility classes (glass panels, inputs, orbiting aurora background, custom scrollbar). |
| `client/src/context/AuthContext.jsx` | Centralized authentication store. Handles login/logout, localStorage persistence, and offline demo credentials when the API is unreachable. |
| `client/src/api/lmsClient.js` | Thin fetch wrapper with unified error handling. Exposes every REST call used by dashboards (auth, courses, learners, instructors, admin, banking). |
| `client/src/components/AuroraBackground.jsx` | Layout wrapper rendering the animated aurora gradient, floating orbs, and noise texture that surround all pages. |
| `client/src/components/CourseMaterialsModal.jsx` | Full-screen modal showing course assets (videos, notes, audio) plus MCQ completion workflow. Handles download/copy actions for every material. |
| `client/src/components/NotificationBanner.jsx` | Animated toast/banner component for surfacing success, warning, or offline status across dashboards. |
| `client/src/components/StatGlint.jsx` | Presentation component for metric cards (value, label, sparkline). Adds polished gradients and shimmer animations. |
| `client/src/components/Timeline.jsx` | Reusable vertical timeline for showing recent activity/events (used in instructor dashboard). |
| `client/src/pages/Login.jsx` | Multi-role login portal with role switcher, credential inputs, and offline-mode banner. Invokes `AuthContext.login`. |
| `client/src/pages/LearnerDashboard.jsx` | Learner experience: wallet setup, catalog browsing/purchase, pending/enrolled/completed sections, course modal access, certificate download. |
| `client/src/pages/InstructorDashboard.jsx` | Instructor console: course creation/editing, transaction validation, payout requests, wallet view, activity timeline. |
| `client/src/pages/AdminDashboard.jsx` | Admin oversight: platform metrics, organization wallet, roster insights, payout approvals, material editing, enrolled-student list per course. |

## Server (Express + In-memory Store)

| File | Description |
| --- | --- |
| `server/src/index.js` | Express entry point. Sets up CORS, JSON parsing, persistence middleware, health check, API routers, and graceful shutdown behavior. |
| `server/src/data/store.js` | Authoritative in-memory dataset for LMS entities (org, instructors, learners, admins, courses, transactions, bank accounts). Also exports helper finders and constants such as `MAX_COURSES` and `LUMP_SUM_ON_UPLOAD`. |
| `server/src/data/storePersistence.js` | Handles JSON snapshot persistence for the in-memory store: initialization, async writes, sync flush on shutdown, and middleware hook that persists on mutating requests. |
| `server/src/utils/httpError.js` | Defines a typed `HttpError` class and the `withErrorHandling` helper that wraps async route handlers to standardize error responses. |
| `server/src/middleware/errorHandlers.js` | Express middleware for 404 handling and global error formatting. |
| `server/src/routes/authRoutes.js` | `/api/auth` endpoints for login and learner registration. Delegates to `authService`. |
| `server/src/routes/coursesRoutes.js` | `/api/courses` read-only endpoints returning catalog data enriched with instructor metadata. |
| `server/src/routes/learnersRoutes.js` | `/api/learners` endpoints for profile fetch, bank setup, enrollment, completion, and certificate PDF downloads. |
| `server/src/routes/instructorsRoutes.js` | `/api/instructors` endpoints for dashboard fetch, course upload/update, payout workflows, wallet updates, and per-transaction validation. |
| `server/src/routes/adminRoutes.js` | `/api/admin` endpoints powering the admin dashboard, payout approvals/rejections, and material overrides. |
| `server/src/routes/bankRoutes.js` | `/api/bank` utilities for account provisioning, balance snapshots, direct debit/credit, and generic transfers. |
| `server/src/services/authService.js` | Implements login (role-agnostic) and register (new learners) logic, issuing lightweight session objects. |
| `server/src/services/learnerService.js` | Learner domain logic: profile shaping, bank configuration, enrollments, completion checks, certificate issuance (PDFKit), and payout math. |
| `server/src/services/instructorService.js` | Instructor workflows: dashboard compilation, course creation/update, transaction validation, payout requests/validation, wallet operations. |
| `server/src/services/adminService.js` | Admin aggregation: metrics, roster enrichment, transaction ordering, payout approval/rejection, and course material overrides. |
| `server/src/services/bankService.js` | Core credit ledger utilities: account snapshots, upsert, debit/credit, inter-account transfers, secret verification, and organization account lookup. |

Refer to this document whenever you need a quick mental model of where a capability lives before diving into implementation details.
