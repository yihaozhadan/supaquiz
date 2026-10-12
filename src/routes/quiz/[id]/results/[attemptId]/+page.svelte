<script lang="ts">
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import QuestionMedia from '$lib/components/QuestionMedia.svelte';
	import CodeSnippet from '$lib/components/CodeSnippet.svelte';
	import { paginationRange } from '$lib/pagination';
	import { resolve } from '$app/paths';
	import { CheckCircle2, ChevronLeft, ChevronRight, Eye, Trophy, XCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const QUESTIONS_PER_PAGE = 10;

	let currentPage = $state(1);
	let reviewSection = $state<HTMLDivElement>();

	let pageCount = $derived(Math.ceil(data.questions.length / QUESTIONS_PER_PAGE));
	let pagedQuestions = $derived(
		data.questions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE)
	);
	let pageItems = $derived(paginationRange(currentPage, pageCount));

	function goToPage(page: number) {
		currentPage = Math.min(Math.max(1, page), pageCount);
		reviewSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}

	function isCorrect(question: (typeof data.questions)[number]): boolean {
		const answer = data.attempt.answers[question.id];
		if (Array.isArray(question.correctAnswer)) {
			return (
				Array.isArray(answer) &&
				answer.length === question.correctAnswer.length &&
				question.correctAnswer.every((c) => (answer as string[]).includes(c))
			);
		}
		if (typeof answer === 'string' && typeof question.correctAnswer === 'string') {
			return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
		}
		return false;
	}

	function optionText(question: (typeof data.questions)[number], id: string): string {
		return question.options?.find((o) => o.id === id)?.text ?? id;
	}
</script>

<svelte:head>
	<title>Results — {data.quizTitle}</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
	{#if data.isPreview}
		<div
			class="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary"
		>
			<Eye class="size-4 shrink-0" />
			<span>Preview result — this attempt was not recorded.</span>
		</div>
	{/if}
	<Card>
		<CardHeader class="text-center">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
				<Trophy class="size-6 text-primary-foreground" />
			</div>
			<CardTitle class="text-2xl">Quiz Complete!</CardTitle>
			<CardDescription>{data.quizTitle}</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4 text-center">
			<div class="text-4xl font-bold">{data.percentage}%</div>
			<p class="text-muted-foreground">
				You scored {data.attempt.score} out of {data.attempt.totalQuestions}
			</p>
			<p class="text-sm text-muted-foreground">
				Time taken: {formatDuration(data.attempt.timeTakenSeconds)}
			</p>
		</CardContent>
	</Card>

	{#if data.revealAnswers && data.questions.length > 0}
		<div class="mt-8 space-y-4" bind:this={reviewSection}>
			<h2 class="text-lg font-semibold">Answer Review</h2>
			{#each pagedQuestions as question, i (question.id)}
				{@const correct = isCorrect(question)}
				{@const questionNumber = (currentPage - 1) * QUESTIONS_PER_PAGE + i + 1}
				<Card>
					<CardHeader>
						<div class="flex items-start justify-between gap-2">
							<CardTitle class="text-base leading-snug">
								<span class="text-muted-foreground">{questionNumber}.</span>
								{question.text}
							</CardTitle>
							{#if correct}
								<Badge variant="secondary" class="shrink-0 gap-1">
									<CheckCircle2 class="h-3.5 w-3.5" />
									Correct
								</Badge>
							{:else}
								<Badge variant="destructive" class="shrink-0 gap-1">
									<XCircle class="h-3.5 w-3.5" />
									Incorrect
								</Badge>
							{/if}
						</div>
					</CardHeader>
					<CardContent class="space-y-2 text-sm">
						<QuestionMedia mediaUrl={question.mediaUrl} />
						<CodeSnippet code={question.codeSnippet} />
						<p>
							<span class="font-medium">Correct answer:</span>
							{Array.isArray(question.correctAnswer)
								? question.correctAnswer.map((a) => optionText(question, a)).join(', ')
								: question.type === 'fitb'
									? question.correctAnswer
									: optionText(question, question.correctAnswer)}
						</p>
						{#if question.explanation}
							<p class="text-muted-foreground">{question.explanation}</p>
						{/if}
					</CardContent>
				</Card>
			{/each}
			{#if pageCount > 1}
				<nav class="flex items-center justify-center gap-1.5 pt-2" aria-label="Answer review pages">
					<Button
						variant="outline"
						size="sm"
						class="min-h-9 gap-1"
						disabled={currentPage === 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						<ChevronLeft class="size-4" />
						Previous
					</Button>
					{#each pageItems as item, index (index)}
						{#if item === 'ellipsis'}
							<span class="px-1 text-muted-foreground">…</span>
						{:else}
							<Button
								variant={item === currentPage ? 'default' : 'outline'}
								size="sm"
								class="min-h-9 min-w-9"
								aria-current={item === currentPage ? 'page' : undefined}
								onclick={() => goToPage(item)}
							>
								{item}
							</Button>
						{/if}
					{/each}
					<Button
						variant="outline"
						size="sm"
						class="min-h-9 gap-1"
						disabled={currentPage === pageCount}
						onclick={() => goToPage(currentPage + 1)}
					>
						Next
						<ChevronRight class="size-4" />
					</Button>
				</nav>
			{/if}
		</div>
	{/if}

	<div class="mt-8 flex justify-center gap-3">
		{#if data.isPreview}
			<a
				href={resolve('/admin/quizzes/[id]/edit', { id: data.quizId })}
				class={buttonVariants({ variant: 'outline', class: 'min-h-11' })}
			>
				Back to quiz editor
			</a>
		{/if}
		<a href={resolve('/quizzes')} class={buttonVariants({ variant: 'outline', class: 'min-h-11' })}>
			Browse more quizzes
		</a>
	</div>
</div>
