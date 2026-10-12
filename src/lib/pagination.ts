export type PaginationItem = number | 'ellipsis';

/**
 * Page-number items for a pager: always includes the first and last page,
 * `siblings` pages on either side of the current page, and 'ellipsis'
 * markers for gaps. Returns every page when the range is short enough to
 * show without collapsing.
 */
export function paginationRange(current: number, total: number, siblings = 1): PaginationItem[] {
	if (total <= 0) return [];
	const page = Math.min(Math.max(1, current), total);

	// first + last + current + 2*siblings + up to 2 ellipsis slots
	const maxVisible = 2 * siblings + 5;
	if (total <= maxVisible) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const items: PaginationItem[] = [1];
	const start = Math.max(2, page - siblings);
	const end = Math.min(total - 1, page + siblings);
	if (start > 2) items.push('ellipsis');
	for (let p = start; p <= end; p++) items.push(p);
	if (end < total - 1) items.push('ellipsis');
	items.push(total);
	return items;
}
