import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const admin = sqliteTable('admin', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const quiz = sqliteTable('quiz', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	description: text('description').notNull(),
	password: text('password'),
	timeLimitSeconds: integer('time_limit_seconds'),
	shuffleQuestions: integer('shuffle_questions', { mode: 'boolean' }).notNull().default(false),
	maxAttempts: integer('max_attempts').notNull().default(1),
	maxParticipants: integer('max_participants').notNull(),
	allowBackNavigation: integer('allow_back_navigation', { mode: 'boolean' })
		.notNull()
		.default(true),
	questionDisplayMode: text('question_display_mode', {
		enum: ['one_at_a_time', 'all_on_one_page']
	})
		.notNull()
		.default('one_at_a_time'),
	revealAnswersAfter: text('reveal_answers_after', {
		enum: ['immediate', 'never']
	})
		.notNull()
		.default('immediate'),
	intakeFormSchema: text('intake_form_schema', { mode: 'json' }).notNull(),
	status: text('status', { enum: ['draft', 'active', 'expired'] })
		.notNull()
		.default('draft'),
	isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
	isVisibleAfterExpiry: integer('is_visible_after_expiry', { mode: 'boolean' })
		.notNull()
		.default(true),
	activateAt: integer('activate_at', { mode: 'timestamp' }),
	expireAt: integer('expire_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const question = sqliteTable('question', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	quizId: text('quiz_id')
		.notNull()
		.references(() => quiz.id, { onDelete: 'cascade' }),
	type: text('type', {
		enum: ['mcq_single', 'mcq_multi', 'true_false', 'fitb']
	}).notNull(),
	text: text('text').notNull(),
	mediaUrl: text('media_url'),
	options: text('options', { mode: 'json' }),
	correctAnswer: text('correct_answer', { mode: 'json' }).notNull(),
	explanation: text('explanation'),
	codeSnippet: text('code_snippet'),
	orderIndex: integer('order_index').notNull()
});

export const attempt = sqliteTable('attempt', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	quizId: text('quiz_id')
		.notNull()
		.references(() => quiz.id, { onDelete: 'cascade' }),
	participantKey: text('participant_key').notNull(),
	intakeFormData: text('intake_form_data', { mode: 'json' }).notNull(),
	answers: text('answers', { mode: 'json' }).notNull(),
	score: integer('score').notNull(),
	totalQuestions: integer('total_questions').notNull(),
	timeTakenSeconds: integer('time_taken_seconds').notNull(),
	submittedAt: integer('submitted_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
