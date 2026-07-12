<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import {
		Breadcrumb,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbList,
		BreadcrumbPage,
		BreadcrumbSeparator
	} from '$lib/components/ui/breadcrumb';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-svelte';
	import QuizCard from '$lib/components/public/QuizCard.svelte';
	import SearchBar from '$lib/components/public/SearchBar.svelte';
	import EmptyState from '$lib/components/public/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let statusFilter = $state('active');
	let sortBy = $state('newest');
	let filterSheetOpen = $state(false);

	$effect(() => {
		query = data.query ?? '';
		statusFilter = data.status ?? 'active';
		sortBy = data.sort ?? 'newest';
	});
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
	const startIndex = $derived((data.page - 1) * data.pageSize + 1);
	const endIndex = $derived(Math.min(data.page * data.pageSize, data.total));
	const isLoading = $derived($navigating !== null);

	const statusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'expired', label: 'Expired' },
		{ value: 'all', label: 'All' }
	];

	const sortOptions = [
		{ value: 'newest', label: 'Newest' },
		{ value: 'oldest', label: 'Oldest' },
		{ value: 'most_popular', label: 'Most Popular' },
		{ value: 'alphabetical', label: 'Alphabetical' }
	];

	function updateUrl(nextPage = 1) {
		const params = new URLSearchParams();
		if (query.trim()) params.set('q', query.trim());
		if (statusFilter !== 'active') params.set('status', statusFilter);
		if (sortBy !== 'newest') params.set('sort', sortBy);
		if (nextPage > 1) params.set('page', String(nextPage));

		const qs = params.toString();
		goto(`/quizzes${qs ? `?${qs}` : ''}`, { keepFocus: true });
	}

	function handleSearch(value: string) {
		query = value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => updateUrl(1), 250);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		updateUrl(1);
	}

	function handleSortChange(value: string) {
		sortBy = value;
		updateUrl(1);
	}

	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;
		updateUrl(page);
	}

	function visiblePageNumbers(current: number, last: number): (number | string)[] {
		if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

		const pages: (number | string)[] = [1];
		if (current > 3) pages.push('...');

		const start = Math.max(2, current - 2);
		const end = Math.min(last - 1, current + 2);
		for (let i = start; i <= end; i++) pages.push(i);

		if (current < last - 2) pages.push('...');
		pages.push(last);
		return pages;
	}
</script>

<svelte:head>
	<title>Browse Quizzes — SupaQuiz</title>
	<meta name="description" content="Browse and search available public quizzes on SupaQuiz." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
	<Breadcrumb>
		<BreadcrumbList>
			<BreadcrumbItem>
				<BreadcrumbLink href="/">Home</BreadcrumbLink>
			</BreadcrumbItem>
			<BreadcrumbSeparator />
			<BreadcrumbItem>
				<BreadcrumbPage>Browse Quizzes</BreadcrumbPage>
			</BreadcrumbItem>
		</BreadcrumbList>
	</Breadcrumb>

	<div class="mt-6 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Browse Quizzes</h1>
		<p class="text-muted-foreground">Find and take available quizzes.</p>
	</div>

	<!-- Toolbar: search + filters -->
	<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="flex-1">
			<SearchBar
				placeholder="Search by title or description..."
				value={query}
				onSearch={handleSearch}
			/>
		</div>

		<div class="hidden items-center gap-3 sm:flex">
			<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
				<Select.Trigger class="w-36" aria-label="Status filter">
					{statusOptions.find((o) => o.value === statusFilter)?.label}
				</Select.Trigger>
				<Select.Content>
					{#each statusOptions as option}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root type="single" value={sortBy} onValueChange={handleSortChange}>
				<Select.Trigger class="w-40" aria-label="Sort quizzes">
					{sortOptions.find((o) => o.value === sortBy)?.label}
				</Select.Trigger>
				<Select.Content>
					{#each sortOptions as option}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<Button variant="outline" class="sm:hidden min-h-11" onclick={() => (filterSheetOpen = true)}>
			<SlidersHorizontal class="mr-2 h-4 w-4" />
			Filters
		</Button>
	</div>

	<!-- Results count -->
	<div class="mt-4 text-sm text-muted-foreground">
		{#if data.total > 0}
			Showing {startIndex}–{endIndex} of {data.total} {data.total === 1 ? 'quiz' : 'quizzes'}
		{:else}
			0 quizzes
		{/if}
	</div>

	<!-- Quiz grid -->
	<div class="mt-6">
		{#if isLoading}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div class="space-y-3 rounded-lg border p-6">
						<Skeleton class="h-5 w-3/4" />
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-2/3" />
						<Skeleton class="mt-4 h-9 w-full" />
					</div>
				{/each}
			</div>
		{:else if data.quizzes.length === 0}
			<EmptyState
				icon={Search}
				title="No quizzes found"
				description="Try adjusting your search or filter to find what you are looking for."
			/>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.quizzes as quiz (quiz.id)}
					<QuizCard {...quiz} />
				{/each}
			</div>
		{/if}
	</div>

	<!-- Pagination -->
	{#if data.total > 0 && totalPages > 1}
		<nav class="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
			<Button
				variant="outline"
				size="icon"
				class="h-10 w-10"
				disabled={data.page <= 1}
				onclick={() => goToPage(data.page - 1)}
				aria-label="Previous page"
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>

			{#each visiblePageNumbers(data.page, totalPages) as page}
				{#if page === '...'}
					<span class="px-2 text-sm text-muted-foreground" aria-hidden="true">...</span>
				{:else}
					<Button
						variant={page === data.page ? 'default' : 'outline'}
						class="h-10 w-10 px-0"
						onclick={() => goToPage(page as number)}
						aria-label={`Page ${page}`}
						aria-current={page === data.page ? 'page' : undefined}
					>
						{page}
					</Button>
				{/if}
			{/each}

			<Button
				variant="outline"
				size="icon"
				class="h-10 w-10"
				disabled={data.page >= totalPages}
				onclick={() => goToPage(data.page + 1)}
				aria-label="Next page"
			>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</nav>
	{/if}
</div>

<!-- Mobile filter drawer -->
<Sheet.Root bind:open={filterSheetOpen}>
	<Sheet.Content side="right" class="w-full max-w-xs p-0">
		<div class="flex h-16 items-center justify-between border-b px-4">
			<h2 class="text-lg font-semibold">Filters</h2>
		</div>
		<div class="space-y-6 p-4">
			<div class="space-y-2">
				<span class="text-sm font-medium">Status</span>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger class="w-full" aria-label="Status filter">
						{statusOptions.find((o) => o.value === statusFilter)?.label}
					</Select.Trigger>
					<Select.Content>
						{#each statusOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<span class="text-sm font-medium">Sort</span>
				<Select.Root type="single" value={sortBy} onValueChange={handleSortChange}>
					<Select.Trigger class="w-full" aria-label="Sort quizzes">
						{sortOptions.find((o) => o.value === sortBy)?.label}
					</Select.Trigger>
					<Select.Content>
						{#each sortOptions as option}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<Button class="w-full min-h-11" onclick={() => (filterSheetOpen = false)}>Done</Button>
		</div>
	</Sheet.Content>
</Sheet.Root>
