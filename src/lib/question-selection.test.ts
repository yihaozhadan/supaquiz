import { describe, it, expect } from 'vitest';
import { selectQuestionOrder, shuffleArray } from './question-selection';

const pool = Array.from({ length: 10 }, (_, i) => `q${i}`);
const questionPool = pool.map((id) => ({ id }));

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
		expect(selectQuestionOrder(questionPool, { shuffle: false })).toEqual(pool);
	});

	it('serves a random subset of the requested size', () => {
		const result = selectQuestionOrder(questionPool, { shuffle: false, subsetSize: 4 });
		expect(result).toHaveLength(4);
		expect(new Set(result).size).toBe(4);
		for (const id of result) expect(pool).toContain(id);
	});

	it('keeps pool order within the subset when shuffle is off', () => {
		const result = selectQuestionOrder(questionPool, { shuffle: false, subsetSize: 5 });
		const indices = result.map((id) => pool.indexOf(id));
		expect(indices).toEqual([...indices].sort((a, b) => a - b));
	});

	it('serves all questions when subsetSize meets or exceeds the pool', () => {
		expect(selectQuestionOrder(questionPool, { shuffle: false, subsetSize: 10 })).toEqual(pool);
		expect(selectQuestionOrder(questionPool, { shuffle: false, subsetSize: 50 })).toEqual(pool);
	});

	it('ignores non-positive subset sizes', () => {
		expect(selectQuestionOrder(questionPool, { shuffle: false, subsetSize: 0 })).toEqual(pool);
	});

	it('shuffles the subset when shuffle is on', () => {
		const result = selectQuestionOrder(questionPool, { shuffle: true, subsetSize: 4 });
		expect(result).toHaveLength(4);
		expect(new Set(result).size).toBe(4);
		for (const id of result) expect(pool).toContain(id);
	});

	it('produces different subsets across attempts', () => {
		const seen = new Set(
			Array.from({ length: 20 }, () =>
				selectQuestionOrder(questionPool, { shuffle: false, subsetSize: 3 }).join(',')
			)
		);
		expect(seen.size).toBeGreaterThan(1);
	});
});

describe('selectQuestionOrder with groups', () => {
	const grouped = [
		{ id: 'u1' },
		{ id: 'a1', groupId: 'gA' },
		{ id: 'u2' },
		{ id: 'a2', groupId: 'gA' },
		{ id: 'a3', groupId: 'gA' },
		{ id: 'a4', groupId: 'gA' },
		{ id: 'b1', groupId: 'gB' },
		{ id: 'b2', groupId: 'gB' },
		{ id: 'b3', groupId: 'gB' },
		{ id: 'u3' }
	];
	const ungroupedIds = ['u1', 'u2', 'u3'];
	const groupAIds = ['a1', 'a2', 'a3', 'a4'];
	const groupBIds = ['b1', 'b2', 'b3'];

	it('serves all questions when groups have no pick count', () => {
		const result = selectQuestionOrder(grouped, {
			shuffle: false,
			groups: [{ id: 'gA' }, { id: 'gB' }]
		});
		expect(result).toEqual(grouped.map((q) => q.id));
	});

	it('samples pickCount questions from each group and always serves ungrouped', () => {
		const result = selectQuestionOrder(grouped, {
			shuffle: false,
			groups: [
				{ id: 'gA', pickCount: 2 },
				{ id: 'gB', pickCount: 1 }
			]
		});
		expect(result).toHaveLength(3 + 2 + 1);
		expect(ungroupedIds.every((id) => result.includes(id))).toBe(true);
		expect(result.filter((id) => groupAIds.includes(id))).toHaveLength(2);
		expect(result.filter((id) => groupBIds.includes(id))).toHaveLength(1);
	});

	it('serves the whole group when pickCount meets or exceeds group size', () => {
		const result = selectQuestionOrder(grouped, {
			shuffle: false,
			groups: [
				{ id: 'gA', pickCount: 4 },
				{ id: 'gB', pickCount: 99 }
			]
		});
		expect(result).toEqual(grouped.map((q) => q.id));
	});

	it('ignores non-positive pick counts', () => {
		const result = selectQuestionOrder(grouped, {
			shuffle: false,
			groups: [{ id: 'gA', pickCount: 0 }, { id: 'gB' }]
		});
		expect(result).toEqual(grouped.map((q) => q.id));
	});

	it('treats questions referencing unknown groups as ungrouped', () => {
		const questions = [{ id: 'x1', groupId: 'ghost' }, { id: 'a1', groupId: 'gA' }];
		const result = selectQuestionOrder(questions, {
			shuffle: false,
			groups: [{ id: 'gA', pickCount: 1 }]
		});
		expect(result).toContain('x1');
	});

	it('applies the global subset cap to the combined pool after group sampling', () => {
		const result = selectQuestionOrder(grouped, {
			shuffle: false,
			subsetSize: 4,
			groups: [
				{ id: 'gA', pickCount: 2 },
				{ id: 'gB', pickCount: 2 }
			]
		});
		expect(result).toHaveLength(4);
		expect(new Set(result).size).toBe(4);
	});

	it('varies the sampled members across attempts', () => {
		const seen = new Set(
			Array.from({ length: 30 }, () =>
				selectQuestionOrder(grouped, {
					shuffle: false,
					groups: [{ id: 'gA', pickCount: 2 }, { id: 'gB' }]
				}).join(',')
			)
		);
		expect(seen.size).toBeGreaterThan(1);
	});
});
