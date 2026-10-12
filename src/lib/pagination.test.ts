import { describe, it, expect } from 'vitest';
import { paginationRange } from './pagination';

describe('paginationRange', () => {
	it('returns an empty list for no pages', () => {
		expect(paginationRange(1, 0)).toEqual([]);
	});

	it('returns every page when the range fits without collapsing', () => {
		expect(paginationRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('collapses the tail when the current page is near the start', () => {
		expect(paginationRange(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
		expect(paginationRange(2, 10)).toEqual([1, 2, 3, 'ellipsis', 10]);
	});

	it('collapses the head when the current page is near the end', () => {
		expect(paginationRange(9, 10)).toEqual([1, 'ellipsis', 8, 9, 10]);
		expect(paginationRange(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
	});

	it('collapses both sides around a middle page', () => {
		expect(paginationRange(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
	});

	it('clamps an out-of-range current page', () => {
		expect(paginationRange(0, 10)).toEqual([1, 2, 'ellipsis', 10]);
		expect(paginationRange(99, 10)).toEqual([1, 'ellipsis', 9, 10]);
	});
});
