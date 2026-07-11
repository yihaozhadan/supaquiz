<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let currentIndex = $state(0);
	let answers = $state<Record<string, unknown>>({ ...data.draftAnswers });
	let isSubmitting = $state(false);
	let submitForm: HTMLFormElement;

	const totalQuestions = data.questions.length;
	const currentQuestion = $derived(data.questions[currentIndex]);
	const showAllOnOnePage = data.quiz.questionDisplayMode === 'all_on_one_page';

	let timeLeft = $state(
		data.quiz.timeLimitSeconds
			? Math.max(0, data.quiz.timeLimitSeconds - Math.round((Date.now() - data.startedAt) / 1000))
			: null
	);

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function mediaKind(url: string): 'image' | 'audio' | 'video' | 'other' {
		const ext = url.split('.').pop()?.toLowerCase() ?? '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
		if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
		if (['mp4', 'webm', 'ogv'].includes(ext)) return 'video';
		return 'other';
	}

	function setSingleAnswer(questionId: string, value: string) {
		answers[questionId] = value;
	}

	function toggleMultiAnswer(questionId: string, optionId: string, checked: boolean) {
		const current = Array.isArray(answers[questionId]) ? [...(answers[questionId] as string[])] : [];
		if (checked) {
			if (!current.includes(optionId)) current.push(optionId);
		} else {
			const idx = current.indexOf(optionId);
			if (idx >= 0) current.splice(idx, 1);
		}
		answers[questionId] = current;
	}

	const trueFalseOptions = [
		{ id: 'true', text: 'True' },
		{ id: 'false', text: 'False' }
	];

	function goNext() {
		if (currentIndex < totalQuestions - 1) currentIndex += 1;
	}
	function goPrev() {
		if (currentIndex > 0) currentIndex -= 1;
	}

	function doSubmit() {
		submitForm.requestSubmit();
	}

	async function autosave() {
		try {
			await fetch(`/quiz/${data.quiz.id}/take/draft`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ answers })
			});
		} catch {
			// Best-effort; ignore network errors.
		}
	}

	$effect(() => {
		const interval = setInterval(autosave, 30000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (timeLeft === null) return;
		if (timeLeft <= 0) {
			doSubmit();
			return;
		}
		const timer = setTimeout(() => {
			timeLeft = (timeLeft as number) - 1;
		}, 1000);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{data.quiz.title} — SupaQuiz</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold">{data.quiz.title}</h1>
		{#if timeLeft !== null}
			<span
				class="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
				class:text-destructive={timeLeft < 60}
			>
				<Clock class="h-4 w-4" />
				{formatTime(timeLeft)}
			</span>
		{/if}
	</div>

	{#snippet questionBody(question: (typeof data.questions)[number])}
		{#if question.mediaUrl}
			{#if mediaKind(question.mediaUrl) === 'image'}
				<img src={question.mediaUrl} alt="" class="max-h-80 w-full rounded-md object-contain" />
			{:else if mediaKind(question.mediaUrl) === 'audio'}
				<audio src={question.mediaUrl} controls class="w-full"></audio>
			{:else if mediaKind(question.mediaUrl) === 'video'}
				<video src={question.mediaUrl} controls class="max-h-80 w-full rounded-md">
					<track kind="captions" />
				</video>
			{/if}
		{/if}

		{#if question.codeSnippet}
			<pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{question.codeSnippet}</code></pre>
		{/if}

		{#if question.type === 'mcq_single' || question.type === 'true_false'}
			<div class="space-y-2">
				{#each (question.type === 'true_false' ? trueFalseOptions : question.options) ?? [] as option (option.id)}
					<label
						class="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 py-2.5 hover:bg-muted/50"
					>
						<input
							type="radio"
							name={`q-${question.id}`}
							value={option.id}
							checked={answers[question.id] === option.id}
							onchange={() => setSingleAnswer(question.id, option.id as string)}
							class="h-4 w-4"
						/>
						<span>{option.text}</span>
					</label>
				{/each}
			</div>
		{:else if question.type === 'mcq_multi'}
			<div class="space-y-2">
				{#each question.options ?? [] as option (option.id)}
					<label
						class="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 py-2.5 hover:bg-muted/50"
					>
						<input
							type="checkbox"
							checked={Array.isArray(answers[question.id]) &&
								(answers[question.id] as string[]).includes(option.id as string)}
							onchange={(e) =>
								toggleMultiAnswer(question.id, option.id as string, e.currentTarget.checked)}
							class="h-4 w-4"
						/>
						<span>{option.text}</span>
					</label>
				{/each}
			</div>
		{:else if question.type === 'fitb'}
			<Input
				type="text"
				placeholder="Type your answer..."
				value={(answers[question.id] as string) ?? ''}
				oninput={(e) => setSingleAnswer(question.id, e.currentTarget.value)}
			/>
		{/if}
	{/snippet}

	{#if showAllOnOnePage}
		<div class="space-y-6">
			{#each data.questions as question, index (question.id)}
				<Card>
					<CardHeader>
						<span class="text-sm text-muted-foreground">Question {index + 1} of {totalQuestions}</span>
						<CardTitle class="text-lg leading-snug">{question.text}</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						{@render questionBody(question)}
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if form?.error}
			<div role="alert" class="mt-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center">
				{form.error}
			</div>
		{/if}

		<div class="mt-6 flex justify-end">
			<Button class="min-h-11" disabled={isSubmitting} onclick={doSubmit}>
				{#if isSubmitting}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				Submit Quiz
			</Button>
		</div>
	{:else}
		<div class="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
			<div
				class="h-full bg-primary transition-all"
				style={`width: ${((currentIndex + 1) / totalQuestions) * 100}%`}
			></div>
		</div>

		{#if currentQuestion}
			<Card>
				<CardHeader>
					<span class="text-sm text-muted-foreground">
						Question {currentIndex + 1} of {totalQuestions}
					</span>
					<CardTitle class="text-lg leading-snug">{currentQuestion.text}</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					{@render questionBody(currentQuestion)}
				</CardContent>
			</Card>

			{#if form?.error}
				<div role="alert" class="mt-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center">
					{form.error}
				</div>
			{/if}

			<div class="mt-6 flex items-center justify-between">
				<Button
					variant="outline"
					class="min-h-11"
					disabled={!data.quiz.allowBackNavigation || currentIndex === 0}
					onclick={goPrev}
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</Button>

				{#if currentIndex < totalQuestions - 1}
					<Button class="min-h-11" onclick={goNext}>
						Next
						<ChevronRight class="h-4 w-4" />
					</Button>
				{:else}
					<Button class="min-h-11" disabled={isSubmitting} onclick={doSubmit}>
						{#if isSubmitting}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						Submit Quiz
					</Button>
				{/if}
			</div>
		{/if}
	{/if}

	<form
		bind:this={submitForm}
		method="POST"
		action="?/submit"
		class="hidden"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<input type="hidden" name="answers" value={JSON.stringify(answers)} />
	</form>
</div>
