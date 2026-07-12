import { z } from 'zod';

export const intakeFormFieldSchema = z.object({
	name: z.string().min(1).max(100),
	type: z.enum(['text', 'email', 'number', 'select']),
	required: z.boolean()
});

export const quizCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	password: z.string().min(0).max(100).optional(),
	timeLimitSeconds: z.number().int().min(0).optional(),
	shuffleQuestions: z.boolean().default(false),
	maxAttempts: z.number().int().min(1).default(1),
	maxParticipants: z.number().int().min(1),
	allowBackNavigation: z.boolean().default(true),
	questionDisplayMode: z.enum(['one_at_a_time', 'all_on_one_page']).default('one_at_a_time'),
	revealAnswersAfter: z.enum(['immediate', 'never']).default('immediate'),
	intakeFormSchema: z.array(intakeFormFieldSchema).default([]),
	status: z.enum(['draft', 'active', 'expired']).default('draft'),
	isPublic: z.boolean().default(true),
	isVisibleAfterExpiry: z.boolean().default(true),
	activateAt: z.coerce.date().optional(),
	expireAt: z.coerce.date().optional()
});

export const quizUpdateSchema = quizCreateSchema.partial().extend({
	id: z.uuid()
});

export const questionOptionSchema = z.object({
	id: z.uuid().optional(),
	text: z.string().min(1).max(500),
	isCorrect: z.boolean()
});

export const questionCreateSchema = z.object({
	quizId: z.uuid(),
	type: z.enum(['mcq_single', 'mcq_multi', 'true_false', 'fitb']),
	text: z.string().min(1).max(2000),
	mediaUrl: z.string().max(500).optional(),
	options: z.array(questionOptionSchema).optional(),
	correctAnswer: z.union([
		z.string(), // For fitb and true_false
		z.array(z.string()) // For mcq_multi
	]),
	explanation: z.string().max(2000).optional(),
	codeSnippet: z.string().max(10000).optional(),
	orderIndex: z.number().int().min(0)
});

export const questionUpdateSchema = questionCreateSchema.partial().extend({
	id: z.uuid()
});

export const quizStatusToggleSchema = z.object({
	id: z.uuid(),
	status: z.enum(['draft', 'active', 'expired'])
});

export const quizExportQuestionSchema = z.object({
	type: z.enum(['mcq_single', 'mcq_multi', 'true_false', 'fitb']),
	text: z.string().min(1).max(2000),
	mediaUrl: z.string().max(500).nullable().optional(),
	options: z.array(questionOptionSchema).nullable().optional(),
	correctAnswer: z.union([z.string(), z.array(z.string())]),
	explanation: z.string().max(2000).nullable().optional(),
	codeSnippet: z.string().max(10000).nullable().optional(),
	orderIndex: z.number().int().min(0)
});

export const quizExportSchema = z.object({
	version: z.literal(1),
	quiz: z.object({
		title: z.string().min(1).max(200),
		description: z.string().min(1).max(2000),
		password: z.string().nullable().optional(),
		timeLimitSeconds: z.number().int().min(0).nullable().optional(),
		shuffleQuestions: z.boolean().default(false),
		maxAttempts: z.number().int().min(1).default(1),
		maxParticipants: z.number().int().min(1),
		allowBackNavigation: z.boolean().default(true),
		questionDisplayMode: z.enum(['one_at_a_time', 'all_on_one_page']).default('one_at_a_time'),
		revealAnswersAfter: z.enum(['immediate', 'never']).default('immediate'),
		intakeFormSchema: z.array(intakeFormFieldSchema).default([]),
		isPublic: z.boolean().default(true),
		isVisibleAfterExpiry: z.boolean().default(true)
	}),
	questions: z.array(quizExportQuestionSchema).max(50)
});
