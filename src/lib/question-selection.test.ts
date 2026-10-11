import { describe, it, expect } from 'vitest';
import { selectQuestionOrder, shuffleArray } from './question-selection';

const pool = Array.from({ length: 10 }, (_, i) => `q${i}`);

describe('shuffleArray', () => {
	it('returns a new array with the same members', () => {
		const result = shuffleArray(pool);
		expect(result).toHaveLength(pool.length);
		expect(new Set(result)).toEqual(new Set(pool));
		expect(result).not.toBe(pool);
	});

	it('does not mutate the input', () => {
		const input = [...pool];
		shuffleArray(input);
		expect(input).toEqual(pool);
	});
});

describe('selectQuestionOrder', () => {
	it('returns all ids in pool order by default', () => {
		expect(selectQuestionOrder(pool, { shuffle: false })).toEqual(pool);
	});

	it('serves a random subset of the requested size', () => {
		const result = selectQuestionOrder(pool, { shuffle: false, subsetSize: 4 });
		expect(result).toHaveLength(4);
		expect(new Set(result).size).toBe(4);
		for (const id of result) expect(pool).toContain(id);
	});

	it('keeps pool order within the subset when shuffle is off', () => {
		const result = selectQuestionOrder(pool, { shuffle: false, subsetSize: 5 });
		const indices = result.map((id) => pool.indexOf(id));
		expect(indices).toEqual([...indices].sort((a, b) => a - b));
	});

	it('serves all questions when subsetSize meets or exceeds the pool', () => {
		expect(selectQuestionOrder(pool, { shuffle: false, subsetSize: 10 })).toEqual(pool);
		expect(selectQuestionOrder(pool, { shuffle: false, subsetSize: 50 })).toEqual(pool);
	});

	it('ignores non-positive subset sizes', () => {
		expect(selectQuestionOrder(pool, { shuffle: false, subsetSize: 0 })).toEqual(pool);
	});

	it('shuffles the subset when shuffle is on', () => {
		const result = selectQuestionOrder(pool, { shuffle: true, subsetSize: 4 });
		expect(result).toHaveLength(4);
		expect(new Set(result).size).toBe(4);
		for (const id of result) expect(pool).toContain(id);
	});

	it('produces different subsets across attempts', () => {
		const seen = new Set(
			Array.from({ length: 20 }, () =>
				selectQuestionOrder(pool, { shuffle: false, subsetSize: 3 }).join(',')
			)
		);
		expect(seen.size).toBeGreaterThan(1);
	});
});
