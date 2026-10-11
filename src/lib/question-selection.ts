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

/** A question in the pool. `groupId` is null/undefined for ungrouped questions. */
export interface AttemptQuestion {
	id: string;
	groupId?: string | null;
}

/** Per-group sampling configuration. */
export interface QuestionGroupSampling {
	id: string;
	/**
	 * Random questions served from this group per attempt. Null/undefined or
	 * values >= the group size serve every question in the group.
	 */
	pickCount?: number | null;
}

export interface QuestionOrderOptions {
	/** Randomize the order of the served questions. */
	shuffle: boolean;
	/**
	 * When set and smaller than the served pool, a random subset of this many
	 * questions is served each attempt. Applied after per-group sampling, so
	 * it caps the combined pool of ungrouped questions and group samples.
	 * Null/undefined or values >= the pool size serve every question.
	 */
	subsetSize?: number | null;
	/**
	 * Per-group sampling. Each listed group contributes `pickCount` random
	 * questions (or all of them when unset). Ungrouped questions — and
	 * questions pointing at a group not listed here — are always served.
	 */
	groups?: readonly QuestionGroupSampling[];
}

/**
 * Build the ordered list of question ids for one attempt.
 * Sampling is always uniform-random; the order of the served questions
 * follows the pool order unless `shuffle` is enabled.
 */
export function selectQuestionOrder(
	questions: readonly AttemptQuestion[],
	options: QuestionOrderOptions
): string[] {
	let ids = questions.map((q) => q.id);

	const groups = options.groups ?? [];
	if (groups.length > 0) {
		const groupById = new Map(groups.map((g) => [g.id, g]));
		const included = new Set<string>();

		// Ungrouped questions (or ones pointing at an unknown group) always serve.
		for (const q of questions) {
			if (q.groupId == null || !groupById.has(q.groupId)) included.add(q.id);
		}

		for (const group of groups) {
			const memberIds = questions.filter((q) => q.groupId === group.id).map((q) => q.id);
			const pick = group.pickCount;
			if (pick != null && pick > 0 && pick < memberIds.length) {
				for (const id of shuffleArray(memberIds).slice(0, pick)) included.add(id);
			} else {
				for (const id of memberIds) included.add(id);
			}
		}

		ids = ids.filter((id) => included.has(id));
	}

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

/**
 * How many questions an attempt serves, computed from aggregate counts only
 * (no id list needed). Mirrors the sampling rules of selectQuestionOrder:
 * ungrouped questions always serve, each group contributes min(pick, size),
 * and the global subset caps the combined pool.
 */
export function servedQuestionCount(params: {
	/** Ungrouped questions, plus any pointing at groups not listed below. */
	ungroupedCount: number;
	groups: readonly { size: number; pickCount?: number | null }[];
	subsetSize?: number | null;
}): number {
	let served = params.ungroupedCount;
	for (const group of params.groups) {
		const pick = group.pickCount;
		served += pick != null && pick > 0 && pick < group.size ? pick : group.size;
	}
	const cap = params.subsetSize;
	if (cap != null && cap > 0 && cap < served) return cap;
	return served;
}
