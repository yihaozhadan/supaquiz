/**
 * Pure helpers for deciding which questions a participant is served and in
 * what order. Kept free of DB/IO concerns so it can be unit tested.
 */

/** Fisher-Yates shuffle; returns a new array, leaving the input untouched. */
export function shuffleArray<T>(items: readonly T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export interface QuestionOrderOptions {
	/** Randomize the order of the served questions. */
	shuffle: boolean;
	/**
	 * When set and smaller than the pool, a random subset of this many
	 * questions is served each attempt. Null/undefined or values >= the pool
	 * size serve every question.
	 */
	subsetSize?: number | null;
}

/**
 * Build the ordered list of question ids for one attempt.
 * Subset sampling is always uniform-random; the order of the sampled
 * questions follows the pool order unless `shuffle` is enabled.
 */
export function selectQuestionOrder(
	questionIds: readonly string[],
	options: QuestionOrderOptions
): string[] {
	let ids = [...questionIds];
	const subset = options.subsetSize;
	if (subset != null && subset > 0 && subset < ids.length) {
		const sampled = new Set(shuffleArray(ids).slice(0, subset));
		ids = ids.filter((id) => sampled.has(id));
	}
	if (options.shuffle) {
		ids = shuffleArray(ids);
	}
	return ids;
}
