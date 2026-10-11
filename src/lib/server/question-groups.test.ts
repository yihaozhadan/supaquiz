import { describe, it, expect, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { quiz, question, questionGroup } from './db/schema';
import {
	createQuestionGroup,
	createQuestion,
	deleteQuestionGroup,
	listQuestionGroups
} from './quiz-actions';
import { resolveSessionQuestions } from './session-questions';

/**
 * Integration test for question groups. Unlike the mocked unit tests, this
 * exercises the real drizzle schema against the in-memory SQLite database
 * used by the test env.
 */
beforeAll(() => {
	const client = (db as any).$client;
	client.exec(`
		CREATE TABLE quiz (
			id text PRIMARY KEY NOT NULL,
			title text NOT NULL,
			description text NOT NULL,
			password text,
			time_limit_seconds integer,
			shuffle_questions integer DEFAULT false NOT NULL,
			questions_per_attempt integer,
			max_attempts integer DEFAULT 1,
			max_participants integer,
			allow_back_navigation integer DEFAULT true NOT NULL,
			question_display_mode text DEFAULT 'one_at_a_time' NOT NULL,
			reveal_answers_after text DEFAULT 'immediate' NOT NULL,
			intake_form_schema text NOT NULL,
			status text DEFAULT 'draft' NOT NULL,
			is_public integer DEFAULT true NOT NULL,
			is_visible_after_expiry integer DEFAULT true NOT NULL,
			activate_at integer,
			expire_at integer,
			created_at integer NOT NULL,
			updated_at integer NOT NULL
		);
		CREATE TABLE question_group (
			id text PRIMARY KEY NOT NULL,
			quiz_id text NOT NULL REFERENCES quiz(id) ON DELETE cascade,
			name text NOT NULL,
			pick_count integer,
			order_index integer DEFAULT 0 NOT NULL
		);
		CREATE TABLE question (
			id text PRIMARY KEY NOT NULL,
			quiz_id text NOT NULL REFERENCES quiz(id) ON DELETE cascade,
			group_id text REFERENCES question_group(id),
			type text NOT NULL,
			text text NOT NULL,
			media_url text,
			options text,
			correct_answer text NOT NULL,
			explanation text,
			code_snippet text,
			order_index integer NOT NULL
		);
	`);
});

async function seedQuiz() {
	const [row] = await db
		.insert(quiz)
		.values({ title: 'Group Test Quiz', description: 'd', intakeFormSchema: [] })
		.returning();
	return row;
}

function questionFormData(fields: Record<string, string>) {
	const fd = new FormData();
	for (const [key, value] of Object.entries(fields)) fd.append(key, value);
	return fd;
}

describe('question groups', () => {
	it('creates, lists, and deletes a group', async () => {
		const q = await seedQuiz();

		const fd = new FormData();
		fd.append('quizId', q.id);
		fd.append('name', 'Geography');
		fd.append('pickCount', '2');
		const created = await createQuestionGroup(fd);

		expect(created.success).toBe(true);
		const groups = await listQuestionGroups(q.id);
		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({ name: 'Geography', pickCount: 2, quizId: q.id });

		await deleteQuestionGroup(groups[0].id);
		expect(await listQuestionGroups(q.id)).toHaveLength(0);
	});

	it('assigns a question to a group and rejects foreign groups', async () => {
		const q1 = await seedQuiz();
		const q2 = await seedQuiz();

		const g1 = await db
			.insert(questionGroup)
			.values({ quizId: q1.id, name: 'G1', orderIndex: 0 })
			.returning();
		const g2 = await db
			.insert(questionGroup)
			.values({ quizId: q2.id, name: 'G2', orderIndex: 0 })
			.returning();

		const ok = await createQuestion(
			questionFormData({
				quizId: q1.id,
				groupId: g1[0].id,
				type: 'fitb',
				text: 'Grouped question',
				correctAnswer: 'a',
				orderIndex: '0'
			})
		);
		expect(ok.success).toBe(true);
		if (ok.success) expect(ok.question?.groupId).toBe(g1[0].id);

		const foreign = await createQuestion(
			questionFormData({
				quizId: q1.id,
				groupId: g2[0].id,
				type: 'fitb',
				text: 'Foreign group',
				correctAnswer: 'a',
				orderIndex: '1'
			})
		);
		expect(foreign.success).toBe(false);
	});

	it('deleting a group unassigns its questions instead of deleting them', async () => {
		const q = await seedQuiz();
		const [g] = await db
			.insert(questionGroup)
			.values({ quizId: q.id, name: 'G', orderIndex: 0 })
			.returning();
		const [qn] = await db
			.insert(question)
			.values({
				quizId: q.id,
				groupId: g.id,
				type: 'fitb',
				text: 'Q',
				correctAnswer: 'a',
				orderIndex: 0
			})
			.returning();

		await deleteQuestionGroup(g.id);

		const remaining = await db.query.question.findFirst({ where: eq(question.id, qn.id) });
		expect(remaining).toBeDefined();
		expect(remaining?.groupId).toBeNull();
	});

	it('serves ungrouped questions plus the per-group pick count per attempt', async () => {
		const q = await seedQuiz();
		const [g] = await db
			.insert(questionGroup)
			.values({ quizId: q.id, name: 'G', pickCount: 1, orderIndex: 0 })
			.returning();

		await db.insert(question).values([
			{ quizId: q.id, type: 'fitb', text: 'u1', correctAnswer: 'a', orderIndex: 0 },
			{ quizId: q.id, type: 'fitb', text: 'u2', correctAnswer: 'a', orderIndex: 1 },
			{
				quizId: q.id,
				groupId: g.id,
				type: 'fitb',
				text: 'g1',
				correctAnswer: 'a',
				orderIndex: 2
			},
			{
				quizId: q.id,
				groupId: g.id,
				type: 'fitb',
				text: 'g2',
				correctAnswer: 'a',
				orderIndex: 3
			}
		]);

		const session = {
			quizId: q.id,
			participantKey: 'p',
			intakeFormData: {},
			sessionId: crypto.randomUUID(),
			startedAt: Date.now()
		};

		const served = await resolveSessionQuestions(session);
		// 2 ungrouped + 1 sampled from the group
		expect(served).toHaveLength(3);

		// Subsequent resolves for the same session return the cached order.
		const again = await resolveSessionQuestions(session);
		expect(again).toEqual(served);
	});
});
