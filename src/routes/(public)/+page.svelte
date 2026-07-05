<script lang="ts">
	import { ArrowRight, Search as SearchIcon } from 'lucide-svelte';
	import HeroSection from '$lib/components/public/HeroSection.svelte';
	import FeatureHighlights from '$lib/components/public/FeatureHighlights.svelte';
	import QuizCard from '$lib/components/public/QuizCard.svelte';
	import SearchBar from '$lib/components/public/SearchBar.svelte';
	import EmptyState from '$lib/components/public/EmptyState.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { buttonVariants } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let loading = $state(false);

	const filteredQuizzes = $derived(
		searchQuery.trim()
			? data.quizzes.filter((q) =>
					`${q.title} ${q.description}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
				)
			: data.quizzes
	);

	function handleSearch(value: string) {
		loading = true;
		searchQuery = value;
		// Filtering is instant (client-side over the preloaded homepage set);
		// the loading flicker is intentionally brief to signal activity.
		setTimeout(() => (loading = false), 150);
	}
</script>

<svelte:head>
	<title>SupaQuiz — Self-hosted quiz platform</title>
	<meta
		name="description"
		content="SupaQuiz is an open-source, self-hosted quiz platform with an easy builder and instant auto-grading."
	/>
</svelte:head>

<HeroSection />

<FeatureHighlights />

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Available Quizzes</h2>
			<p class="mt-2 text-muted-foreground">Jump into a quiz that's open right now.</p>
		</div>
		<a
			href="/quizzes"
			class="hidden items-center text-sm font-medium text-primary hover:underline sm:inline-flex"
		>
			View all quizzes
			<ArrowRight class="ml-1 h-4 w-4" />
		</a>
	</div>

	<div class="mt-6 max-w-md">
		<SearchBar
			placeholder="Search available quizzes..."
			onSearch={handleSearch}
			{loading}
		/>
	</div>

	<div class="mt-8">
		{#if loading}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(3) as _}
					<div class="space-y-3 rounded-lg border p-6">
						<Skeleton class="h-5 w-3/4" />
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-2/3" />
						<Skeleton class="mt-4 h-9 w-full" />
					</div>
				{/each}
			</div>
		{:else if filteredQuizzes.length === 0 && data.quizzes.length === 0}
			<EmptyState
				icon={SearchIcon}
				title="No quizzes available yet"
				description="Check back soon — the admin hasn't published any quizzes."
			/>
		{:else if filteredQuizzes.length === 0}
			<EmptyState
				icon={SearchIcon}
				title="No quizzes found"
				description="Try a different search term, or browse the full directory."
				actionLabel="Browse All Quizzes"
				actionHref="/quizzes"
			/>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredQuizzes as quiz (quiz.id)}
					<QuizCard {...quiz} />
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-8 text-center sm:hidden">
		<a href="/quizzes" class={buttonVariants({ variant: 'outline', class: 'min-h-11 w-full' })}>
			View all quizzes
			<ArrowRight class="ml-2 h-4 w-4" />
		</a>
	</div>
</section>
