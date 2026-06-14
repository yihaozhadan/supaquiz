# SupaQuiz

A lightweight, self-hostable open-source quiz platform. Create, publish, and take quizzes locally with no accounts, no cloud dependencies, and no subscription barriers.

## Features

### Quiz Builder
- Create quizzes with multiple question types: Multiple Choice (single/multiple answers), True/False, Fill-in-the-Blank
- Optional password protection per quiz
- Custom participant intake forms
- Question shuffling and randomization
- Time limits and attempt restrictions
- Scheduling with activation/expiration dates
- Import/export quizzes as JSON
- Media support (images, audio, video, code snippets)

### Admin Dashboard
- Manage all quizzes in one place
- View quiz status (draft/active/expired)
- Simple result metrics (total attempts, average/high/low scores)
- Export results to CSV/JSON
- File management for uploaded media

### Quiz Taking
- Auto-save answers every 30 seconds
- Auto-submit when time limit expires
- Instant scoring and optional answer reveal
- Mobile-friendly interface

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit |
| Language | TypeScript |
| Styling | TailwindCSS 4 |
| Database | SQLite (WAL mode) |
| ORM | Drizzle ORM |
| Runtime | Bun |
| Testing | Playwright + Vitest |

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
│   ├── server/
│   │   └── db/          # Database schema and migrations
│   ├── assets/          # Static assets
│   ├── index.ts         # Shared utilities
│   └── utils.ts         # Helper functions
├── routes/
│   ├── +layout.svelte   # Root layout
│   ├── +page.svelte     # Home page
│   └── layout.css       # Global styles
├── test/                # Test files
├── app.d.ts             # TypeScript declarations
└── app.html             # HTML template
```

## License

See [LICENSE](LICENSE) for details.
