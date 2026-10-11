# SupaQuiz Wiki

## Overview

**SupaQuiz** is a lightweight, self-hostable open-source quiz platform designed for creating, publishing, and taking quizzes locally with no accounts, no cloud dependencies, and no subscription barriers. Built with modern web technologies, it provides a complete quiz ecosystem for both quiz creators and participants.

The project is implemented as a SvelteKit application using TypeScript, with a SQLite database (WAL mode) managed through Drizzle ORM, and runs on the Bun runtime.

## Features

### Quiz Builder

- **Multiple question types**: Multiple Choice (single/multiple answers), True/False, and Fill-in-the-Blank
- **Password protection**: Optional password protection per quiz
- **Custom participant intake forms**: Text, email, number, and select fields
- **Question shuffling and randomization**: Questions can be shuffled for each attempt
- **Question groups**: Organize the pool into sections with optional per-group random sampling per attempt — see [Question Groups](QuestionGroups.md)
- **Time limits and attempt restrictions**: Per-participant controls identified by email or browser fingerprint
- **Participant limits**: Configure maximum number of participants per quiz
- **Scheduling**: Activation and expiration dates with lazy evaluation on each request
- **Import/export**: Quizzes can be imported/exported as JSON
- **Media support**: Images, audio, video, and code snippets via uploads or external URLs
- **Per-question explanations and code snippets**
- **Display settings**: One-at-a-time or all-on-one-page, optional back-navigation lock
- **Answer reveal settings**: Immediate or never reveal answers
- **Public or private listing**: Optional visibility after expiry
- **Duplicate quiz**: Copy a quiz with all of its questions
- **Scalability**: Up to 500 questions per quiz; up to 5 active quizzes at a time

### Admin Dashboard

- **Secure login**: Argon2-hashed password with JWT session management
- **Quiz management**: Create, edit, duplicate, and delete quizzes
- **Status management**: Publish, archive, or keep quizzes as drafts (maximum 5 active at a time)
- **Quiz status tracking**: View status (draft/scheduled/active/expired/archived)
- **Question editor**: Reorder questions and edit details
- **Preview mode**: Preview a quiz before publishing (grades answers without saving an attempt)
- **Result metrics**: Total attempts, average/high/low scores
- **Per-attempt detail view**: Detailed view of individual attempts with attempt deletion
- **Result export**: Export results to CSV/JSON format
- **File management**: Manage uploaded media files

### Quiz Taking Experience

- **Custom intake form**: Complete forms before starting a quiz
- **Auto-save answers**: Answers auto-saved every 30 seconds
- **Countdown timer**: Auto-submit when time limit expires
- **Instant scoring**: Immediate scoring with optional answer reveal
- **Per-attempt results page**: Detailed results after completing a quiz
- **Mobile-friendly interface**: Fully responsive design for mobile devices

### Public Site

- **Home page**: Featuring recently added active quizzes
- **Browse all public quizzes**: Search by title and description
- **Filtering**: Filter by status (active/expired/all)
- **Sorting**: Sort by newest, oldest, most popular, or alphabetical
- **Pagination**: Paginated results for browsing
- **Unlisted quizzes**: Stay hidden from browse but remain reachable via direct link (password-protected if set)
- **Documentation and about pages**

## Benefits

### For Quiz Creators/Owners

- **Complete control**: Self-hosted solution means no third-party dependencies or subscription fees
- **No account required**: Participants can take quizzes without creating accounts
- **Unlimited question banks**: Support for up to 500 questions per quiz
- **Flexible quiz design**: Multiple question types and display options
- **Security**: Argon2-hashed passwords and JWT-secured admin sessions
- **Data privacy**: All data stored locally in SQLite; no data sent to external services
- **Customization**: Full control over quiz appearance and behavior
- **Cost-effective**: Open-source with no per-user costs or licensing fees

### For Participants

- **Privacy-friendly**: No personal account required to take quizzes
- **Mobile-friendly**: Works seamlessly on desktop and mobile devices
- **Auto-save**: Worried about connection drops? Answers are auto-saved every 30 seconds
- **Fair testing**: Randomized question subsets prevent answer sharing
- **Immediate feedback**: Instant scoring and results upon completion

### For Organizations/Institutions

- **No cloud infrastructure**: Run on your own servers or local machine
- **Data sovereignty**: All quiz data remains on your premises
- **Customizable**: Open-source code allows for modifications and extensions
- **Integration**: Can be integrated into existing workflows or learning management systems

## Technology Stack

| Layer | Technology |
|-------|-----------|
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

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **GitHub Repository**: https://github.com/yihaozhadan/supaquiz
- **Demo**: Try the live demo to explore features
- **Documentation**: Additional docs in the `docs/` folder