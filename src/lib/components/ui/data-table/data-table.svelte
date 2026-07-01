<script lang="ts" generics="T">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type SortDirection = 'asc' | 'desc' | null;

	interface Column {
		id: string;
		header: string;
		sortable?: boolean;
		class?: string;
		headerClass?: string;
	}

	let {
		columns,
		data,
		sortColumn = $bindable(null),
		sortDirection = $bindable(null),
		pageSize = $bindable(10),
		currentPage = $bindable(1),
		cell
	}: {
		columns: Column[];
		data: T[];
		sortColumn?: string | null;
		sortDirection?: SortDirection;
		pageSize?: number;
		currentPage?: number;
		cell: Snippet<[{ row: T; column: Column }]>;
	} = $props();

	let pageSizeOptions = [10, 25, 50];

	let sortedData = $derived.by(() => {
		if (!sortColumn || !sortDirection) return data;

		return [...data].sort((a, b) => {
			const aVal = (a as Record<string, unknown>)[sortColumn!];
			const bVal = (b as Record<string, unknown>)[sortColumn!];

			if (aVal === bVal) return 0;
			if (aVal === null || aVal === undefined) return 1;
			if (bVal === null || bVal === undefined) return -1;

			const comparison = aVal < bVal ? -1 : 1;
			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	let totalPages = $derived(Math.ceil(sortedData.length / pageSize));
	let paginatedData = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return sortedData.slice(start, start + pageSize);
	});

	function toggleSort(columnId: string) {
		if (sortColumn === columnId) {
			if (sortDirection === 'asc') {
				sortDirection = 'desc';
			} else if (sortDirection === 'desc') {
				sortColumn = null;
				sortDirection = null;
			}
		} else {
			sortColumn = columnId;
			sortDirection = 'asc';
		}
		currentPage = 1;
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	function handlePageSizeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		pageSize = Number(target.value);
		currentPage = 1;
	}
</script>

<div class="space-y-4">
	<div class="rounded-lg border border-border overflow-hidden">
		<table class="min-w-full divide-y divide-border">
			<thead class="bg-muted">
				<tr>
					{#each columns as column}
						<th
							class={cn(
								'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
								column.sortable && 'cursor-pointer select-none hover:text-foreground',
								column.headerClass
							)}
							onclick={column.sortable ? () => toggleSort(column.id) : undefined}
							role={column.sortable ? 'button' : undefined}
							tabindex={column.sortable ? 0 : undefined}
							onkeydown={column.sortable
								? (e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											toggleSort(column.id);
										}
									}
								: undefined}
						>
							<div class="flex items-center gap-2">
								{column.header}
								{#if column.sortable}
									<ArrowUpDown class="size-3.5 {sortColumn === column.id ? 'text-foreground' : 'text-muted-foreground/50'}" />
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="bg-card divide-y divide-border">
				{#each paginatedData as row, i (i)}
					<tr class="hover:bg-muted/50 transition-colors">
						{#each columns as column}
							<td class={cn('px-4 py-3 text-sm', column.class)}>
								{@render cell({ row, column })}
							</td>
						{/each}
					</tr>
				{/each}
				{#if paginatedData.length === 0}
					<tr>
						<td colspan={columns.length} class="px-4 py-8 text-center text-muted-foreground">
							No data available.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<span>Show</span>
			<select
				class="h-8 rounded-md border border-border bg-background px-2 text-sm"
				value={pageSize}
				onchange={handlePageSizeChange}
			>
				{#each pageSizeOptions as size}
					<option value={size}>{size}</option>
				{/each}
			</select>
			<span>of {sortedData.length} entries</span>
		</div>

		<div class="flex items-center gap-1">
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => goToPage(currentPage - 1)}
				disabled={currentPage === 1}
			>
				<ChevronLeft class="size-4" />
			</Button>
			{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
				{#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
					<Button
						variant={page === currentPage ? 'default' : 'outline'}
						size="icon-sm"
						onclick={() => goToPage(page)}
					>
						{page}
					</Button>
				{:else if page === currentPage - 2 || page === currentPage + 2}
					<span class="px-1 text-muted-foreground">...</span>
				{/if}
			{/each}
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => goToPage(currentPage + 1)}
				disabled={currentPage === totalPages}
			>
				<ChevronRight class="size-4" />
			</Button>
		</div>
	</div>
</div>
