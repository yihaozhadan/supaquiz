# Open Source Quiz Platform – Step-by-Step Implementation Plan

> **Purpose**: An AI-agent-executable roadmap for building the Open Source Quiz Platform. Each phase produces a working, testable increment.
> **Stack**: SvelteKit 2 (Bun), TypeScript, TailwindCSS 4, shadcn-svelte, Drizzle ORM + SQLite (WAL), Zod, jose, Lucide-Svelte, Vitest, Playwright, Biome, Docker.

---

## Phase 0: Project Bootstrap & Tooling (Est. 1–2 sessions)

**Goal**: A runnable SvelteKit project with lint, format, tests, database, and Docker skeleton.

- [√] **0.1** Initialize SvelteKit project (`npx sv create`) with TypeScript and no demo app.
- [√] **0.2** Add TailwindCSS 4 (`@tailwindcss/vite`) and configure `vite.config.ts`.
- [√] **0.3** Add `shadcn-svelte` CLI and init with default base color; install `lucide-svelte`.
- [x] **0.4** Add dev dependencies: `biome`, `vitest`, `playwright`, `drizzle-kit`, `drizzle-orm`, `better-sqlite3`, `zod`, `jose`, `sharp`.
- [√] **0.5** Configure `biome.json` for linting and formatting; add `check` and `format` scripts to `package.json`.
- [√] **0.6** Configure `vitest` with `@testing-library/svelte` for unit tests.
- [√] **0.7** Configure Playwright with one basic smoke test (homepage loads).
- [√] **0.8** Add `.env.example` with `PORT`, `DATA_DIR`, `ADMIN_USER`, `ADMIN_PASS_HASH`, `SESSION_SECRET`, `MAX_FILE_SIZE`.
- [√] **0.9** Set up Drizzle ORM: create `src/lib/server/db.ts`, define `sqlite` connection with WAL mode, create `drizzle.config.ts`, add `db:push` / `db:migrate` scripts.
- [√] **0.10** Create initial schema (`src/lib/server/db/schema.ts`):
  - Tables: `admin`, `quiz`, `question`, `attempt` (align with [Section 10 of requirements](open-source-quiz-requirements.md)).
  - Use `drizzle-orm/sqlite-core` with explicit types and indices.
- [√] **0.11** Add multi-stage `Dockerfile` (Alpine, non-root user, `VOLUME /data`, `EXPOSE 3000`).
- [√] **0.12** Add `docker-compose.yml` for local dev with bind mount to `./data`.
- [√] **0.13** Verify everything: `bun install`, `bun run check`, `bun run test`, Docker build succeeds.

**Deliverable**: Repo builds, tests pass, Docker image builds, DB connects, schema pushes cleanly.

---

## Phase 1: Admin Authentication (Est. 1 session)

**Goal**: Single-admin login, session management, and route protection.

- [√] **1.1** Implement admin bootstrap on first startup:
  - Read `ADMIN_USER` and `ADMIN_PASS_HASH` from env.
  - If `admin` table is empty, insert the single admin record (store hash as-is; do not re-hash).
- [√] **1.2** Add `jose`-based session helpers (`src/lib/server/auth.ts`):
  - `createSession(username)` → signed JWT in HTTP-only cookie.
  - `verifySession(cookies)` → decode and validate JWT; return admin record or null.
  - `deleteSession(cookies)` → clear cookie.
- [√] **1.3** Create admin login page (`/admin/login`):
  - SvelteKit form action: validate credentials with `argon2` or `bcrypt` against the stored hash.
  - On success, call `createSession` and redirect to dashboard.
  - Rate-limit login attempts: 5 per 15 minutes per IP (in-memory LRU or simple map).
- [√] **1.4** Create admin logout action.
- [√] **1.5** Add `+layout.server.ts` in admin group to enforce session check; redirect unauthenticated to `/admin/login`.
- [√] **1.6** Write unit tests for session create/verify/delete.
- [√] **1.7** Write Playwright test for login flow (success, bad password, redirect).

**Deliverable**: Admin can log in/out; protected routes redirect; tests pass.

---

## Phase 2: Quiz CRUD & Builder (Est. 2–3 sessions)

**Goal**: Admin can create, edit, duplicate, delete, publish/unpublish quizzes with all configuration fields.

- [√] **2.1** Define Zod schemas for quiz create/update and question create/update.
- [√] **2.2** Build quiz list page (`/admin/quizzes`):
  - Table with title, status, attempt count, active participant count, creation date.
  - Actions: edit, duplicate, delete, activate/deactivate.
- [√] **2.3** Implement quiz status toggle with constraints:
  - Enforce max 5 active quizzes globally before activation.
  - Enforce `max_participants` is set before publishing (status → active).
- [√] **2.4** Build quiz editor page (`/admin/quizzes/[id]/edit`):
  - Form sections: title, description, password (optional), time limit (optional), shuffle toggle, max attempts, max participants, back-navigation toggle, reveal answers toggle.
  - Intake form builder: dynamic list of fields (name, type, required).
  - Activation/expiration datetime pickers (optional).
- [√] **2.5** Build question editor within quiz editor:
  - Support types: `mcq_single`, `mcq_multi`, `true_false`, `fitb`.
  - Add/remove/reorder questions (max 50 per quiz).
  - For MCQ: add/remove options, mark correct option(s).
  - For FITB: store correct answer string.
  - Optional media upload per question (image/audio/video) and code snippet attachment.
- [√] **2.6** Implement file upload helpers (`src/lib/server/storage.ts`):
  - Save to `DATA_DIR/uploads/quizzes/{quiz_id}/questions/{question_id}/{uuid}.{ext}`.
  - Validate MIME type and size (50MB).
  - Generate UUIDv7 filenames.
- [√] **2.7** Duplicate quiz action: deep-copy quiz + questions + media references.
- [√] **2.8** Delete quiz action: cascade delete questions and attempts; optionally orphan-check files.
- [√] **2.9** Write Vitest tests for constraint logic (max 5 active, max 50 questions).
- [√] **2.10** Write Playwright tests for quiz creation, editing, duplicate, delete.

**Deliverable**: Full quiz builder UI works; constraints enforced; media uploads stored locally.

---

## Phase 3: Quiz Import / Export (Est. 1 session)

**Goal**: Admin can export and import quizzes as JSON with media references.

- [ ] **3.1** Export quiz to JSON (`/admin/quizzes/[id]/export`):
  - Serialize quiz metadata + questions + media file paths (relative to `DATA_DIR`).
  - Offer download as `.json`.
  - (Optional v2) Bundle media into a `.zip` alongside the JSON.
- [ ] **3.2** Import quiz from JSON (`/admin/quizzes/import`):
  - File upload endpoint; validate JSON schema with Zod.
  - Remap IDs (generate new UUIDs for quiz, questions, and media).
  - Copy referenced media files into local storage under new paths.
  - If media files are missing, flag warnings but allow import.
- [ ] **3.3** Add import/export buttons to quiz list page.
- [ ] **3.4** Write tests for roundtrip export → import.

**Deliverable**: Import/export works; roundtrip preserves quiz structure and media.

---

## Phase 4: Participant Quiz Engine (Est. 2–3 sessions)

**Goal**: Participants can access, take, and submit quizzes with full constraint enforcement.

- [ ] **4.1** Public quiz access page (`/quiz/[id]`):
  - Lazy-evaluate activation and expiration times on request.
  - If before activation, after expiration, or max participants reached, show blocking message.
- [ ] **4.2** Quiz password gate: if password is set, show password form before intake.
  - Compare with stored hash (bcrypt/SHA-256+salt) or plaintext if not hashed.
- [ ] **4.3** Participant intake form: render fields dynamically from `intake_form_schema`.
- [ ] **4.4** Quiz taking UI (`/quiz/[id]/take`):
  - Mode A: one question at a time (prev/next optional based on `allow_back_navigation`).
  - Mode B: all questions on one page (configurable per quiz).
  - Display media (image/audio/video) and code snippets.
  - Optional global timer; auto-submit on expiry.
- [ ] **4.5** Auto-save mechanism:
  - POST draft answers to server every 30 seconds (simple JSON endpoint).
  - Store draft in-memory on server or in a lightweight `draft` table; no complex state needed.
- [ ] **4.6** Submission handler:
  - Validate quiz is still active and participant cap not exceeded.
  - Auto-grade objective questions (MCQ single/multi, T/F, FITB with case-insensitive trim).
  - Store attempt record: intake data, answers, score, total questions, time taken, timestamp.
- [ ] **4.7** Post-submission page:
  - Show score and percentage.
  - Reveal correct answers/explanations only if `reveal_answers_after === immediate`.
- [ ] **4.8** Enforce max attempts per participant:
  - Key participants by a combination of intake form fields (e.g., email if present) or a browser-fingerprint cookie.
  - If `max_attempts` reached, block new attempts.
- [ ] **4.9** Write Vitest tests for grading logic per question type.
- [ ] **4.10** Write Playwright tests for full quiz flow (access → intake → take → submit → results).

**Deliverable**: Public quiz flow works end-to-end; constraints enforced; auto-save and grading correct.

---

## Phase 5: Admin Dashboard – Results & Files (Est. 1–2 sessions)

**Goal**: Admin can view, filter, sort, export, and manage results and uploaded files.

- [ ] **5.1** Results list page (`/admin/quizzes/[id]/results`):
  - Table: intake data, score, percentage, time taken, submitted at.
  - Sort by score, time taken, date.
  - Filter/search by intake field values (e.g., name contains "Alice").
- [ ] **5.2** Simple metrics bar (no charts):
  - Total attempts, average score, highest score, lowest score.
- [ ] **5.3** Export results:
  - CSV export (client-side generation from table data or server streaming).
  - JSON export (full attempt records).
- [ ] **5.4** Result management actions:
  - Delete individual attempt.
  - Clear all results for a quiz.
- [ ] **5.5** File management page (`/admin/files`):
  - Browse uploaded files organized by quiz.
  - Show file type, size, upload date.
  - Delete unused/orphaned files.
  - Upload replacement file for existing media reference.
- [ ] **5.6** Write tests for CSV export format and file cleanup logic.

**Deliverable**: Results and files are fully manageable; exports verified.

---

## Phase 6: Admin Dashboard UI/UX (Est. 2–3 sessions)

**Goal**: Replace the placeholder dashboard with a polished, responsive admin UI using shadcn-svelte components, a persistent sidebar, and a consistent layout system.

### 6.1 Layout Foundation

- [x] **6.1.1** Create `src/lib/components/admin/AdminLayout.svelte`:
  - Persistent sidebar (240px, collapsible to 64px icon-only on mobile/tablet).
  - Top bar with breadcrumb, search placeholder, notification bell (stub), and user avatar/dropdown.
  - Main content area with `max-w-7xl` container and consistent padding.
- [x] **6.1.2** Create `src/lib/components/admin/Sidebar.svelte`:
  - Nav items: Dashboard, Quizzes, Files, Settings (stub).
  - Active state highlight using `sidebar-menu-item` shadcn pattern.
  - Collapse toggle button; persist state in `localStorage`.
  - Mobile: slide-out drawer with overlay backdrop.
- [x] **6.1.3** Create `src/lib/components/admin/TopBar.svelte`:
  - Breadcrumb derived from `$page.url.pathname`.
  - User dropdown: profile info, logout link.
- [x] **6.1.4** Refactor `src/routes/admin/+layout.svelte` to wrap all child routes in `<AdminLayout>`, eliminating nav duplication from every page.
- [x] **6.1.5** Migrate all existing admin pages to use the new layout; remove duplicated nav bar markup.

### 6.2 Dashboard Home (`/admin`)

- [x] **6.2.1** Stats cards row (shadcn `Card`):
  - Total quizzes, Active quizzes, Total attempts, Active participants.
  - Each card: icon, value, label, trend indicator (optional, static for v1).
- [x] **6.2.2** Recent activity feed (shadcn `Card`):
  - Last 5 quiz attempts: participant name, quiz title, score, timestamp.
  - "View all" link to results page.
- [x] **6.2.3** Quick actions panel:
  - "Create Quiz" button (primary CTA).
  - "Import Quiz" secondary button.
- [x] **6.2.4** Quiz status overview:
  - Simple bar or pill display showing draft / active / expired counts.
- [x] **6.2.5** Server-side data loading in `+page.server.ts`:
  - Query aggregate stats from `quiz` and `attempt` tables.
  - Return typed data with Zod validation.

### 6.3 Quiz List Page (`/admin/quizzes`)

- [x] **6.3.1** Replace raw table with shadcn `DataTable` pattern:
  - Columns: Title, Status (badge), Questions, Attempts, Created, Actions.
  - Sortable column headers.
  - Row hover state.
- [x] **6.3.2** Add toolbar above table:
  - Search input (debounced, client-side filter).
  - Status filter dropdown (All, Draft, Active, Expired).
  - "New Quiz" button (primary).
- [x] **6.3.3** Pagination (client-side, 10/25/50 per page).
- [x] **6.3.4** Action column: dropdown menu (shadcn `DropdownMenu`) with Edit, Duplicate, Delete, View Results, Export.
- [x] **6.3.5** Delete confirmation dialog (shadcn `AlertDialog`).
- [x] **6.3.6** Status badges: colored pills (green=active, yellow=draft, red=expired).

### 6.4 Quiz Editor (`/admin/quizzes/[id]/edit`)

- [x] **6.4.1** Tabbed layout (shadcn `Tabs`): Details | Questions | Intake Form | Settings.
- [x] **6.4.2** Details tab: form fields using shadcn `Input`, `Textarea`, `Switch`, `Select`.
- [x] **6.4.3** Questions tab:
  - Drag-and-drop reorder (use `@dnd-kit/sortable` or simple up/down arrow buttons).
  - Question cards with type badge, preview text, edit/delete actions.
  - "Add Question" button at bottom.
  - Question count indicator (e.g., "12 / 50").
- [x] **6.4.4** Intake Form tab:
  - Dynamic field builder with add/remove/reorder.
  - Field type selector (text, email, number, select).
- [x] **6.4.5** Settings tab: toggle switches for shuffle, back navigation, reveal answers; number inputs for limits.
- [x] **6.4.6** Save indicator: show unsaved changes warning on navigation; auto-save draft every 60s.
- [x] **6.4.7** Sticky footer with Save / Cancel / Publish buttons.

### 6.5 Question Editor

- [x] **6.5.1** Modal or slide-over panel (shadcn `Sheet`) for question editing.
- [x] **6.5.2** Type selector at top; dynamically render fields based on selected type.
- [x] **6.5.3** MCQ: dynamic option list with add/remove; radio/checkbox for correct answer(s).
- [x] **6.5.4** FITB: single text input for correct answer.
- [x] **6.5.5** Media upload area: drag-and-drop zone, preview thumbnail, file type/size validation feedback.
- [x] **6.5.6** Code snippet input: textarea with monospace font preview.

### 6.6 Results Page (`/admin/quizzes/[id]/results`)

- [x] **6.6.1** DataTable with columns: Participant (intake name/email), Score, Percentage, Time Taken, Submitted At.
- [x] **6.6.2** Toolbar: search by participant name, sort by score/time/date.
- [x] **6.6.3** Metrics bar: total attempts, avg score, highest, lowest (shadcn `Card` row).
- [x] **6.6.4** Export dropdown: CSV, JSON (shadcn `DropdownMenu`).
- [x] **6.6.5** Row click opens attempt detail modal: full answers, correct answers (if reveal enabled), score breakdown.
- [x] **6.6.6** Bulk actions: select rows → delete selected.

### 6.7 Files Page (`/admin/files`)

- [x] **6.7.1** Grid/list view toggle (shadcn `ToggleGroup`).
- [x] **6.7.2** Grid view: file cards with thumbnail preview (images), file icon (other types), filename, size, quiz label.
- [x] **6.7.3** List view: table with columns: Name, Type, Size, Quiz, Uploaded, Actions.
- [x] **6.7.4** Filter by quiz, file type.
- [x] **6.7.5** Delete confirmation dialog; highlight orphaned files (not referenced by any question).

### 6.8 Component Library Setup

- [x] **6.8.1** Install shadcn-svelte components via CLI as needed:
  - `Card`, `Button`, `Input`, `Textarea`, `Select`, `Switch`, `Badge`, `DropdownMenu`, `AlertDialog`, `Tabs`, `Sheet`, `DataTable`, `ToggleGroup`, `Avatar`, `Separator`, `Breadcrumb`, `Skeleton`.
- [x] **6.8.2** Create `src/lib/components/ui/` directory structure following shadcn-svelte conventions.
- [x] **6.8.3** Create shared utility components:
  - `PageHeader.svelte` (title + description + optional action button).
  - `EmptyState.svelte` (illustration + message + CTA for empty lists).
  - `LoadingSkeleton.svelte` (table/card skeleton placeholders).
  - `ConfirmDialog.svelte` (reusable confirmation modal).

### 6.9 Responsive Design

- [x] **6.9.1** Desktop (≥1024px): sidebar + main content side-by-side.
- [x] **6.9.2** Tablet (768–1023px): collapsible sidebar, content fills width.
- [x] **6.9.3** Mobile (<768px): sidebar as slide-out drawer; tables become card lists; forms stack vertically.
- [x] **6.9.4** Touch-friendly: min 44px tap targets, swipe gestures for mobile nav.
- [x] **6.9.5** Test all pages at 375px, 768px, 1024px, 1440px breakpoints.

### 6.10 Accessibility & Polish

- [x] **6.10.1** Keyboard navigation: Tab through all interactive elements, Enter/Space to activate, Escape to close modals.
- [x] **6.10.2** Focus management: trap focus in modals/sheets, return focus on close.
- [ ] **6.10.3** ARIA labels on icon-only buttons, form fields, and navigation.
- [ ] **6.10.4** Color contrast: verify all text meets WCAG AA (4.5:1 ratio).
- [ ] **6.10.5** Loading states: skeleton loaders for data fetches, spinner on form submissions.
- [x] **6.10.6** Error states: inline form validation messages, toast notifications for actions (success/error).
- [x] **6.10.7** Empty states: friendly illustrations and CTAs when no quizzes, no results, no files.

### 6.11 Tests

- [x] **6.11.1** Playwright: sidebar navigation works, collapse/expand toggles, mobile drawer opens/closes.
- [x] **6.11.2** Playwright: dashboard stats load correctly, quiz list filters/sorts work.
- [x] **6.11.3** Playwright: quiz editor tabs switch, question add/edit/delete flows.
- [x] **6.11.4** Playwright: results export downloads valid CSV/JSON.
- [x] **6.11.5** Playwright: responsive layouts render correctly at each breakpoint.
- [x] **6.11.6** Vitest: stat aggregation queries return correct values.

**Deliverable**: Polished admin dashboard with consistent layout, sidebar navigation, shadcn-svelte components, responsive design, and full accessibility.

---

## Phase 7: Polish, Non-Functional Requirements & QA (Est. 1–2 sessions)

**Goal**: Production-ready container, mobile-friendly UI, performance, and security hardening.

- [ ] **6.1** Mobile responsiveness pass on all major pages (Tailwind breakpoints).
- [ ] **6.2** Security review:
  - Ensure all file paths are sanitized (no path traversal).
  - Ensure raw HTML from users is escaped (Svelte default; verify no `{@html}` with user input).
  - Rate limit public endpoints (auto-save, quiz start) to prevent abuse.
  - Validate all inputs with Zod on server actions.
- [ ] **6.3** SQLite concurrency safety:
  - Verify WAL mode is enabled.
  - Add retry logic with exponential backoff for `SQLITE_BUSY` on writes.
- [ ] **6.4** Performance:
  - Verify quiz start < 2s (measure with Playwright).
  - Lazy load heavy media; use ` Sharp` to resize uploaded images to reasonable max dimensions.
- [ ] **6.5** Error handling:
  - Add `+error.svelte` pages.
  - Return meaningful error messages for constraint violations (max active, max participants, etc.).
- [ ] **6.6** Docker finalization:
  - Ensure `HEALTHCHECK` in Dockerfile.
  - Document bind-mount volume for `/data`.
  - Test `docker run` with env vars; confirm admin bootstraps and app starts.
- [ ] **6.7** README:
  - One-command start instructions (`docker run ...` or `docker compose up`).
  - Feature list, data model, environment variables, development setup.
- [ ] **6.8** Full test suite green: `bun run test` (unit + e2e).

**Deliverable**: App is self-hostable, documented, tested, and meets all non-functional requirements.

---

## Phase 8: Public-Facing Pages — Homepage, Browse, Docs & About (Est. 2–3 sessions)

**Goal**: Build a polished public-facing website with a landing page, quiz browse/search, documentation, and about page. All pages share a consistent header and footer via a public layout group.

> **Note**: This phase is independent of Phases 4–7 and can be worked on in parallel. It only requires Phase 0 (bootstrap) and Phase 2 (quiz CRUD) to be complete so quiz data is available for the browse page.

### 8.1 Public Layout Foundation

- [x] **8.1.1** Create public layout group at `src/routes/(public)/+layout.svelte`:
  - Wraps all public pages with shared Header and Footer.
  - Consistent max-width container (`max-w-6xl`) and padding.
  - No sidebar — full-width content area.
- [x] **8.1.2** Create `src/lib/components/public/Header.svelte`:
  - Sticky top bar with backdrop blur on scroll.
  - Left: App logo/name linking to `/`.
  - Center/Right: nav links — Browse Quizzes (`/quizzes`), Docs (`/docs`), About (`/about`).
  - Right: "Admin Login" link (secondary style) + "Participant Login" button (primary accent, if participant system is implemented).
  - Mobile: hamburger menu with slide-out drawer (shadcn `Sheet`) containing all nav links.
  - Active page highlighted using `$page.url.pathname` comparison.
- [x] **8.1.3** Create `src/lib/components/public/Footer.svelte`:
  - Three-column layout (stacks on mobile):
    - Column 1: App name, tagline, version.
    - Column 2: Links (Browse Quizzes, Docs, About, Admin Login).
    - Column 3: GitHub link, "Built with SvelteKit" credit.
  - Bottom bar: copyright notice, "Self-hosted with SupaQuiz" badge.
  - Responsive: single column on mobile.
- [x] **8.1.4** Move existing `src/routes/+page.svelte` to `src/routes/(public)/+page.svelte` (homepage).
- [x] **8.1.5** Move or create `src/routes/(public)/quizzes/+page.svelte` (browse page).
- [x] **8.1.6** Move or create `src/routes/(public)/docs/+page.svelte` (documentation).
- [x] **8.1.7** Move or create `src/routes/(public)/about/+page.svelte` (about page).
- [x] **8.1.8** Verify all public routes render within the shared layout.

### 8.2 Landing Page / Homepage (`/`)

- [x] **8.2.1** Hero section component (`src/lib/components/public/HeroSection.svelte`):
  - Full-width with gradient or patterned background.
  - Headline: value proposition text.
  - Subheadline: 1–2 sentences on benefits.
  - Primary CTA: "Browse Quizzes" → `/quizzes` or scroll to quiz list.
  - Secondary CTA: "View on GitHub" → external link (optional).
  - Responsive: stacks on mobile, centered on desktop.
- [x] **8.2.2** Feature highlights section (`src/lib/components/public/FeatureHighlights.svelte`):
  - 3-column grid (responsive: 1-col mobile, 2-col tablet, 3-col desktop).
  - 3–6 feature cards using shadcn `Card`:
    - Each: Lucide icon, title, short description.
    - Suggested: Self-Hosted, Easy Quiz Builder, Auto-Grading, Privacy First, Import/Export, Mobile Friendly.
- [x] **8.2.3** Homepage quiz list section:
  - Section heading: "Available Quizzes".
  - Search bar with debounced filtering.
  - Quiz cards in responsive grid (same card design as browse page).
  - Show first 6 active quizzes with "View All" link to `/quizzes`.
  - Empty state when no quizzes available.
  - Loading skeleton state.
- [x] **8.2.4** Server-side data loading in `(public)/+page.server.ts`:
  - Query active public quizzes (status = active, is_public = true).
  - Return quiz list with title, description, question count, time limit, attempt count.
  - Limit to 6 for homepage display.

### 8.3 Quiz Browse & Search Page (`/quizzes`)

- [x] **8.3.1** Create `(public)/quizzes/+page.svelte`:
  - Full-page quiz directory with prominent search bar at top.
  - Search input with real-time debounced filtering (by title and description).
- [x] **8.3.2** Filter controls:
  - Status filter (Active / All) — default Active.
  - Sort dropdown: Newest, Oldest, Most Popular, Alphabetical.
  - Filters collapse into drawer on mobile.
- [x] **8.3.3** Quiz card grid:
  - Responsive: 1-col mobile, 2-col tablet, 3-col desktop.
  - Each card: title, description (2-line truncation), question count, time limit badge, attempt count, lock icon if password-protected, "Start Quiz" button.
  - Status indicators for scheduling (upcoming, ending soon).
- [x] **8.3.4** Pagination:
  - 12 quizzes per page.
  - Page number navigation with prev/next.
  - Results count indicator (e.g., "Showing 1–12 of 34 quizzes").
- [x] **8.3.5** Empty and loading states:
  - Empty: "No quizzes found. Try adjusting your search." with illustration.
  - Loading: skeleton card grid (3x2 skeleton cards).
- [x] **8.3.6** Server-side data loading in `(public)/quizzes/+page.server.ts`:
  - Query public quizzes with search, filter, sort, and pagination params.
  - Return paginated results with total count.
- [x] **8.3.7** Breadcrumb: Home > Browse Quizzes.

### 8.4 Documentation Page (`/docs`)

- [ ] **8.4.1** Create `(public)/docs/+page.svelte`:
  - Layout: left sidebar (table of contents) + main content area.
  - Sidebar: sticky on desktop, collapsible hamburger on mobile.
- [ ] **8.4.2** Sidebar navigation component (`src/lib/components/public/DocsSidebar.svelte`):
  - List of section links with active state highlighting.
  - Collapsible on mobile with toggle button.
  - Smooth scroll to anchor on click.
- [ ] **8.4.3** Documentation content sections:
  - **Getting Started**: How to take a quiz, prerequisites.
  - **Taking a Quiz**: Step-by-step guide (browse → select → intake → answer → submit).
  - **Quiz Features**: Question types, time limits, multiple attempts explained.
  - **Your Results**: Viewing scores, reviewing answers.
  - **Participant Account**: Login, assigned quizzes, profile management.
  - **FAQ**: Common questions and troubleshooting.
  - **Contact / Support**: How to reach the quiz admin.
- [ ] **8.4.4** Each section: heading, prose content, optional code blocks or screenshots.
- [ ] **8.4.5** Anchor links: sections have URL hashes (`/docs#getting-started`).
- [ ] **8.4.6** Content can be either:
  - Svelte components with prose styling (Tailwind `prose` classes), or
  - Markdown files loaded at build time (if using a markdown plugin).
- [ ] **8.4.7** Responsive: sidebar becomes dropdown or hidden behind hamburger on mobile.
- [ ] **8.4.8** Breadcrumb: Home > Documentation.

### 8.5 About Page (`/about`)

- [ ] **8.5.1** Create `(public)/about/+page.svelte`:
  - Centered content layout with generous spacing.
  - Max-width ~800px for readability.
- [ ] **8.5.2** Content sections:
  - **About SupaQuiz**: 2–3 paragraphs on project philosophy (open-source, self-hosted, privacy-first).
  - **Key Features**: bullet list or icon grid of capabilities.
  - **Technology Stack**: table or badges (SvelteKit, TailwindCSS, SQLite, Drizzle, etc.).
  - **Self-Hosting**: brief instructions or link to docs.
  - **Contributing**: link to GitHub repo, contribution guidelines.
  - **License**: MIT (or chosen license) with link to LICENSE file.
  - **Credits**: attribution to open-source libraries.
- [ ] **8.5.3** Optional: admin/team info section (name, avatar, bio).
- [ ] **8.5.4** Breadcrumb: Home > About.

### 8.6 Shared Styles & Components

- [ ] **8.6.1** Create `src/lib/components/public/QuizCard.svelte`:
  - Reusable quiz card component used on both homepage and browse page.
  - Props: quiz data (title, description, questionCount, timeLimit, attemptCount, isPasswordProtected, status).
  - Consistent styling with hover state and focus ring for accessibility.
- [ ] **8.6.2** Create `src/lib/components/public/SearchBar.svelte`:
  - Reusable search input with debounce.
  - Props: placeholder, onSearch callback, loading state.
  - Clear button when input has text.
- [ ] **8.6.3** Create `src/lib/components/public/EmptyState.svelte`:
  - Reusable empty state with illustration, message, optional CTA button.
  - Used on homepage, browse page, and docs page.
- [ ] **8.6.4** Ensure all public pages use consistent typography and spacing via Tailwind utility classes.
- [ ] **8.6.5** Verify WCAG 2.1 AA compliance: semantic HTML, keyboard nav, focus indicators, color contrast.

### 8.7 Responsive Design

- [ ] **8.7.1** Desktop (≥1024px): full header nav, sidebar on docs, 3-column grids.
- [ ] **8.7.2** Tablet (768–1023px): 2-column quiz grids, collapsible docs sidebar.
- [ ] **8.7.3** Mobile (<768px): single column, hamburger menu, stacked layouts, drawer navigation.
- [ ] **8.7.4** Touch-friendly: min 44px tap targets, no hover-dependent interactions.
- [ ] **8.7.5** Test all pages at 375px, 768px, 1024px, 1440px breakpoints.

### 8.8 Tests

- [ ] **8.8.1** Playwright: homepage loads with hero, features, and quiz list.
- [ ] **8.8.2** Playwright: browse page search and filter work correctly.
- [ ] **8.8.3** Playwright: docs page sidebar navigation and anchor links work.
- [ ] **8.8.4** Playwright: about page renders all sections.
- [ ] **8.8.5** Playwright: header and footer are consistent across all public pages.
- [ ] **8.8.6** Playwright: mobile hamburger menu opens/closes, nav works.
- [ ] **8.8.7** Vitest: quiz list query returns correct filtered/paginated results.

**Deliverable**: Polished public-facing website with landing page, quiz browse/search, documentation, and about page. Consistent header/footer, responsive design, accessible, and tested.

---

## Appendices

### A.1. AI Agent Hints

- **Prefer minimal changes**: Each phase should leave the repo in a runnable state. Commit after each phase.
- **Use existing patterns**: shadcn-svelte components > custom CSS; Drizzle schema > raw SQL; SvelteKit form actions > separate REST API.
- **Test first for logic**: Write Vitest tests for grading, constraints, and import/export before UI.
- **Avoid premature abstraction**: Single admin = no generic user system. One container = no distributed concerns.
- **Feature flags**: If unsure about a feature, make it optional (e.g., media upload can be skipped in early iterations).

### A.2. File & Directory Conventions

```
repo/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts              # Drizzle + SQLite connection
│   │   │   ├── schema.ts          # All table definitions
│   │   │   ├── auth.ts            # Admin session (jose)
│   │   │   ├── storage.ts         # File upload helpers
│   │   │   └── grading.ts         # Quiz grading logic
│   │   └── components/
│   │       ├── ui/                # shadcn-svelte components
│   │       ├── admin/             # Admin-specific components
│   │       └── public/            # Public-facing components (Header, Footer, HeroSection, etc.)
│   ├── routes/
│   │   ├── (public)/              # Public layout group (shared Header/Footer)
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte       # Landing page / homepage
│   │   │   ├── quizzes/           # Browse & search quizzes
│   │   │   ├── docs/              # Documentation
│   │   │   └── about/             # About page
│   │   ├── admin/
│   │   │   ├── (dashboard)/       # Protected admin layout
│   │   │   │   ├── quizzes/
│   │   │   │   ├── files/
│   │   │   │   └── +layout.server.ts
│   │   │   └── login/
│   │   └── quiz/
│   │       └── [id]/
│   │           ├── +page.server.ts
│   │           └── take/
│   ├── app.html
│   └── app.css
├── drizzle/
│   └── migrations/
├── static/
├── tests/
│   ├── unit/
│   └── e2e/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

### A.3. Dependency Quick Reference

| Category   | Packages                                          |
| ---------- | ------------------------------------------------- |
| Framework  | `svelte`, `sveltekit`                             |
| Styling    | `tailwindcss`, `tailwind-merge`, `clsx`           |
| UI         | `shadcn-svelte` (via CLI), `lucide-svelte`        |
| DB         | `drizzle-orm`, `better-sqlite3`, `drizzle-kit`    |
| Validation | `zod`, `superforms`                               |
| Auth       | `jose`, `argon2` (or `bcrypt`)                    |
| Tests      | `vitest`, `@testing-library/svelte`, `playwright` |
| Dev        | `biome`, `typescript`, `bun-types`                |
| Files      | `sharp` (optional)                                |

---

_Plan Version: 1.1_
_Generated: 2026-06-05_
_Updated: 2026-07-04_
