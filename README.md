# SupaQuiz

A lightweight, self-hostable open-source quiz platform. Create, publish, and take quizzes locally with no accounts, no cloud dependencies, and no subscription barriers.

## Features

### Quiz Builder

- Create quizzes with multiple question types: Multiple Choice (single/multiple answers), True/False, Fill-in-the-Blank
- Optional password protection per quiz
- Custom participant intake forms (text, email, number, and select fields)
- Question shuffling and randomization
- Time limits and attempt restrictions (per participant, identified by email or browser fingerprint)
- Participant limits per quiz
- Scheduling with activation/expiration dates, evaluated lazily on each request
- Import/export quizzes as JSON
- Media support (images, audio, video, code snippets) via uploads or external URLs
- Per-question explanations and code snippets
- Display settings: one-at-a-time or all-on-one-page, optional back-navigation lock
- Answer reveal settings (immediate or never)
- Public or private listing, with optional visibility after expiry
- Duplicate a quiz with all of its questions
- Up to 50 questions per quiz; up to 5 active quizzes at a time

### Admin Dashboard

- Secure login (argon2-hashed password + JWT session)
- Manage all quizzes in one place: create, edit, duplicate, delete
- Publish, archive, or keep quizzes as drafts (max 5 active at a time)
- View quiz status (draft/scheduled/active/expired/archived)
- Question editor with reordering
- Preview a quiz before publishing (grades answers without saving an attempt)
- Simple result metrics (total attempts, average/high/low scores)
- Per-attempt detail view and attempt deletion
- Export results to CSV/JSON
- File management for uploaded media

### Quiz Taking

- Custom intake form before starting
- Auto-save answers every 30 seconds
- Countdown timer with auto-submit when the time limit expires
- Instant scoring and optional answer reveal
- Per-attempt results page
- Mobile-friendly interface

### Public Site

- Home page featuring recently added active quizzes
- Browse all public quizzes with search (title and description)
- Filter by status (active/expired/all) and sort (newest, oldest, most popular, alphabetical)
- Paginated results
- Unlisted quizzes stay hidden from browse but remain reachable via direct link (password-protected, if set)
- Documentation and about pages

## Tech Stack

| Layer     | Technology          |
| --------- | ------------------- |
| Framework | SvelteKit           |
| Language  | TypeScript          |
| Styling   | TailwindCSS 4       |
| Database  | SQLite (WAL mode)   |
| ORM       | Drizzle ORM         |
| Runtime   | Bun                 |
| Testing   | Playwright + Vitest |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Installation

```sh
# Clone the repository
git clone https://github.com/yihaozhadan/supaquiz.git
cd supaquiz

# Install dependencies
bun install

# Create data directory for SQLite database
mkdir -p data

# Copy environment variables and configure
cp .env.example .env
# Edit .env and set ADMIN_USER, ADMIN_PASS_HASH, and SESSION_SECRET

# Generate a password hash for the admin account
bun run scripts/generate-hash.ts

# Initialize database schema
bun run db:push
```

### Development

```sh
# Start development server
bun run dev

# Open in browser
bun run dev -- --open
```

### Testing

```sh
# Run unit tests
bun run test:unit

# Run end-to-end tests
bun run test:e2e

# Run all tests
bun test
```

### Building

```sh
# Create production build
bun run build

# Preview production build
bun run preview
```

## Project Structure

```
src/
├── lib/
│   ├── server/          # Server-only modules
│   │   ├── db/          # Drizzle schema and connection
│   │   ├── auth.ts      # Argon2 login + JWT sessions
│   │   ├── quiz-actions.ts    # Quiz/question CRUD
│   │   ├── quiz-attempts.ts   # Submission, grading, availability checks
│   │   ├── quiz-session.ts    # Participant/session cookies
│   │   ├── grading.ts         # Answer normalization and scoring
│   │   ├── storage.ts         # Media uploads
│   │   ├── file-actions.ts    # Uploaded-file management
│   │   ├── import-export.ts   # JSON quiz import/export
│   │   ├── result-actions.ts  # Attempt metrics and bulk delete
│   │   ├── draft-store.ts     # In-memory auto-saved answers
│   │   ├── preview-store.ts   # In-memory admin preview attempts
│   │   └── validations.ts     # Zod schemas
│   ├── components/
│   │   ├── admin/       # Dashboard components
│   │   ├── public/      # Public site components
│   │   └── ui/          # shadcn-svelte primitives
│   ├── quiz-status.ts      # Effective-status logic
│   └── results-format.ts  # Result formatting/CSV helpers
├── routes/
│   ├── (public)/        # Home, browse, docs, about
│   ├── admin/           # Dashboard, quizzes, files, login/logout
│   ├── quiz/[id]/       # Take a quiz and view results
│   ├── uploads/         # Uploaded media serving
│   ├── demo/            # Demo pages
│   ├── +layout.svelte   # Root layout
│   └── layout.css       # Global styles
├── test/                # Test setup
├── app.d.ts             # TypeScript declarations
└── app.html             # HTML template
```

## License

See [LICENSE](LICENSE) for details.
