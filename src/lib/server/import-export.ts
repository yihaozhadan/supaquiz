import { db } from './db';
import { quiz, question } from './db/schema';
import { getQuizById } from './quiz-actions';
import { quizExportSchema } from './validations';
import { copyQuestionMedia } from './storage';

export interface QuizExportData {
	version: 1;
	quiz: {
		title: string;
		description: string;
		password: string | null;
		timeLimitSeconds: number | null;
		shuffleQuestions: boolean;
		maxAttempts: number;
		maxParticipants: number;
		allowBackNavigation: boolean;
		revealAnswersAfter: 'immediate' | 'never';
		intakeFormSchema: unknown;
		isPublic: boolean;
	};
	questions: Array<{
		type: string;
		text: string;
		mediaUrl: string | null;
		options: unknown;
		correctAnswer: unknown;
		explanation: string | null;
		codeSnippet: string | null;
		orderIndex: number;
	}>;
}

/**
 * Serialize a quiz and its questions to a plain, JSON-friendly export object.
 * Media is referenced by its relative `DATA_DIR` path; the file itself is
 * not bundled (v1). Fields that only make sense for a specific quiz instance
 * (id, status, timestamps, activation window) are intentionally omitted.
 */
export async function exportQuiz(id: string): Promise<QuizExportData | null> {
	const quizData = await getQuizById(id);
	if (!quizData) return null;

	return {
		version: 1,
		quiz: {
			title: quizData.title,
			description: quizData.description,
			password: quizData.password,
			timeLimitSeconds: quizData.timeLimitSeconds,
			shuffleQuestions: quizData.shuffleQuestions,
			maxAttempts: quizData.maxAttempts,
			maxParticipants: quizData.maxParticipants,
			allowBackNavigation: quizData.allowBackNavigation,
			revealAnswersAfter: quizData.revealAnswersAfter,
			intakeFormSchema: quizData.intakeFormSchema,
			isPublic: quizData.isPublic
		},
		questions: quizData.questions.map((q) => ({
			type: q.type,
			text: q.text,
			mediaUrl: q.mediaUrl,
			options: q.options,
			correctAnswer: q.correctAnswer,
			explanation: q.explanation,
			codeSnippet: q.codeSnippet,
			orderIndex: q.orderIndex
		}))
	};
}

/**
 * Import a quiz from previously-exported JSON. Generates new IDs for the
 * quiz and its questions, copies referenced media files into storage under
 * the new quiz id, and always creates the quiz in `draft` status so it must
 * be reviewed and explicitly activated. If a referenced media file cannot
 * be found on disk, the question is imported without media and a warning
 * is returned.
 */
export async function importQuiz(jsonText: string) {
	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(jsonText);
	} catch {
		return { success: false as const, error: 'File is not valid JSON' };
	}

	const parsed = quizExportSchema.safeParse(parsedJson);
	if (!parsed.success) {
		return { success: false as const, error: 'Invalid quiz export format' };
	}

	const { quiz: quizFields, questions } = parsed.data;

	const newQuiz = await db
		.insert(quiz)
		.values({
			...quizFields,
			intakeFormSchema: JSON.stringify(quizFields.intakeFormSchema),
			status: 'draft'
		})
		.returning();

	const warnings: string[] = [];

	if (questions.length > 0) {
		const questionValues = [];
		for (const q of questions) {
			let mediaUrl: string | null = null;
			if (q.mediaUrl) {
				mediaUrl = await copyQuestionMedia(q.mediaUrl, newQuiz[0].id);
				if (!mediaUrl) {
					warnings.push(`Media file missing for question: "${q.text.slice(0, 60)}"`);
				}
			}
			questionValues.push({
				quizId: newQuiz[0].id,
				type: q.type,
				text: q.text,
				mediaUrl,
				options: q.options ? JSON.stringify(q.options) : null,
				correctAnswer: JSON.stringify(q.correctAnswer),
				explanation: q.explanation ?? null,
				codeSnippet: q.codeSnippet ?? null,
				orderIndex: q.orderIndex
			});
		}
		await db.insert(question).values(questionValues);
	}

	return { success: true as const, quiz: newQuiz[0], warnings };
}
