<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { buttonVariants } from '$lib/components/ui/button';
	import { CheckCircle2, Trophy, XCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
		<div class="mt-8 space-y-4">
			<h2 class="text-lg font-semibold">Answer Review</h2>
			{#each data.questions as question (question.id)}
				{@const correct = isCorrect(question)}
				<Card>
					<CardHeader>
						<div class="flex items-start justify-between gap-2">
							<CardTitle class="text-base leading-snug">{question.text}</CardTitle>
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
		</div>
	{/if}

	<div class="mt-8 flex justify-center">
		<a href="/quizzes" class={buttonVariants({ variant: 'outline', class: 'min-h-11' })}>
			Browse more quizzes
		</a>
	</div>
</div>
