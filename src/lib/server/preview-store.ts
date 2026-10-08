/**
 * In-memory store for graded admin preview attempts.
 * Preview submissions are never written to the database; keeping them
 * process-local is sufficient since they only need to survive long enough
 * to render the results page. The map is bounded so repeated previews
 * cannot grow memory without limit.
 */

export interface PreviewAttempt {
	id: string;
	quizId: string;
	participantKey: string;
	intakeFormData: Record<string, unknown>;
	answers: Record<string, unknown>;
	score: number;
	totalQuestions: number;
	timeTakenSeconds: number;
	submittedAt: Date;
}

const MAX_PREVIEW_ATTEMPTS = 100;

const previewAttempts = new Map<string, PreviewAttempt>();

export function savePreviewAttempt(attempt: PreviewAttempt) {
	if (previewAttempts.size >= MAX_PREVIEW_ATTEMPTS) {
		const oldest = previewAttempts.keys().next().value;
		if (oldest) previewAttempts.delete(oldest);
	}
	previewAttempts.set(attempt.id, attempt);
}

export function getPreviewAttempt(id: string): PreviewAttempt | undefined {
	return previewAttempts.get(id);
}
