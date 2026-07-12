<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Clock, Eye, FileQuestion, Lock, Loader2, ShieldAlert } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);

	const blockedMessages: Record<string, string> = {
		not_started: 'This quiz has not started yet. Please check back later.',
		expired: 'This quiz has expired and is no longer accepting submissions.',
		full: 'This quiz has reached its maximum number of participants.',
		inactive: 'This quiz is not currently active.'
	};

	const passwordVerified = $derived(data.passwordVerified || form?.passwordOk === true);

	const trueFalseOptions = [
		{ id: 'true', text: 'True' },
		{ id: 'false', text: 'False' }
	];

	function mediaKind(url: string): 'image' | 'audio' | 'video' | 'other' {
		const ext = url.split('.').pop()?.toLowerCase() ?? '';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
		if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
		if (['mp4', 'webm', 'ogv'].includes(ext)) return 'video';
		return 'other';
	}

	function isCorrectOption(
		question: (typeof data.questions)[number],
		option: { id: string; text: string; isCorrect?: boolean }
	): boolean {
		if (question.type === 'true_false') {
			return question.correctAnswer === option.id;
		}
		if (Array.isArray(question.correctAnswer)) {
			return question.correctAnswer.includes(option.id);
		}
		return question.correctAnswer === option.id;
	}
</script>

<svelte:head>
	<title>{data.quiz.title} — SupaQuiz</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
	{#if !data.availability.available && !data.viewOnly}
		<Card>
			<CardHeader class="text-center">
				<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
					<ShieldAlert class="size-6 text-muted-foreground" />
				</div>
				<CardTitle>{data.quiz.title}</CardTitle>
				<CardDescription>
					{blockedMessages[data.availability.reason] ?? 'This quiz is not available.'}
				</CardDescription>
			</CardHeader>
		</Card>
	{:else if data.passwordRequired && !passwordVerified}
		<Card>
			<CardHeader class="text-center">
				<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
					<Lock class="size-6 text-primary-foreground" />
				</div>
				<CardTitle>{data.quiz.title}</CardTitle>
				<CardDescription>This quiz is password protected.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					method="POST"
					action="?/password"
					class="space-y-4"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
				>
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							required
							placeholder="Enter quiz password"
							disabled={isSubmitting}
						/>
					</div>

					{#if form?.passwordError}
						<div
							role="alert"
							class="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center"
						>
							{form.passwordError}
						</div>
					{/if}

					<Button type="submit" class="w-full min-h-11" disabled={isSubmitting}>
						{#if isSubmitting}
							<Loader2 class="size-4 animate-spin" />
						{/if}
						Continue
					</Button>
				</form>
			</CardContent>
		</Card>
	{:else if data.viewOnly}
		<div class="space-y-6">
			<Card>
				<CardHeader class="text-center">
					<div
						class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary"
					>
						<Eye class="size-6 text-primary-foreground" />
					</div>
					<CardTitle class="text-2xl">{data.quiz.title}</CardTitle>
					<CardDescription>{data.quiz.description}</CardDescription>
					<div
						class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground"
					>
						<span class="inline-flex items-center gap-1.5">
							<FileQuestion class="h-4 w-4" />
							{data.quiz.questionCount}
							{data.quiz.questionCount === 1 ? 'question' : 'questions'}
						</span>
						{#if data.quiz.timeLimitSeconds}
							<span class="inline-flex items-center gap-1.5">
								<Clock class="h-4 w-4" />
								{Math.round(data.quiz.timeLimitSeconds / 60)} min
							</span>
						{/if}
					</div>
				</CardHeader>
				<CardContent>
					<div class="rounded-md bg-muted p-4 text-sm text-center text-muted-foreground">
						This quiz has expired and is no longer accepting submissions. The creator has made the
						questions and answers visible for reference.
					</div>
				</CardContent>
			</Card>

			{#each data.questions as question, index (question.id)}
				<Card>
					<CardHeader>
						<CardTitle class="text-lg">Question {index + 1}</CardTitle>
						<CardDescription>{question.text}</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if question.mediaUrl}
							{#if mediaKind(question.mediaUrl) === 'image'}
								<img
									src={question.mediaUrl}
									alt="Question media"
									class="w-full rounded-lg object-cover"
								/>
							{:else if mediaKind(question.mediaUrl) === 'audio'}
								<audio controls src={question.mediaUrl} class="w-full"></audio>
							{:else if mediaKind(question.mediaUrl) === 'video'}
								<video controls src={question.mediaUrl} class="w-full rounded-lg">
									<track kind="captions" srclang="en" label="English" />
								</video>
							{:else}
								<a
									href={question.mediaUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary underline"
								>
									View media
								</a>
							{/if}
						{/if}

						{#if question.codeSnippet}
							<pre class="overflow-x-auto rounded-md bg-muted p-3 text-sm"><code
									>{question.codeSnippet}</code
								></pre>
						{/if}

						{#if question.type === 'fitb'}
							<div class="space-y-2">
								<Label>Correct answer</Label>
								<Input value={question.correctAnswer as string} disabled />
							</div>
						{:else if question.type === 'true_false'}
							<div class="space-y-2">
								{#each trueFalseOptions as option (option.id)}
									<label
										class="flex items-center gap-3 rounded-md border p-3 {isCorrectOption(
											question,
											option
										)
											? 'border-green-500 bg-green-500/10'
											: 'border-border'}"
									>
										<input
											type="radio"
											checked={isCorrectOption(question, option)}
											disabled
											class="h-4 w-4"
										/>
										<span>{option.text}</span>
									</label>
								{/each}
							</div>
						{:else if question.options}
							<div class="space-y-2">
								{#each question.options as option (option.id)}
									<label
										class="flex items-center gap-3 rounded-md border p-3 {isCorrectOption(
											question,
											option
										)
											? 'border-green-500 bg-green-500/10'
											: 'border-border'}"
									>
										<input
											type={question.type === 'mcq_multi' ? 'checkbox' : 'radio'}
											checked={isCorrectOption(question, option)}
											disabled
											class="h-4 w-4"
										/>
										<span>{option.text}</span>
									</label>
								{/each}
							</div>
						{/if}

						{#if question.explanation}
							<div class="text-sm text-muted-foreground">
								<strong>Explanation:</strong>
								{question.explanation}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else}
		<Card>
			<CardHeader>
				<CardTitle class="text-2xl">{data.quiz.title}</CardTitle>
				<CardDescription>{data.quiz.description}</CardDescription>
				<div
					class="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground"
				>
					<span class="inline-flex items-center gap-1.5">
						<FileQuestion class="h-4 w-4" />
						{data.quiz.questionCount}
						{data.quiz.questionCount === 1 ? 'question' : 'questions'}
					</span>
					{#if data.quiz.timeLimitSeconds}
						<span class="inline-flex items-center gap-1.5">
							<Clock class="h-4 w-4" />
							{Math.round(data.quiz.timeLimitSeconds / 60)} min
						</span>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				<form
					method="POST"
					action="?/intake"
					class="space-y-4"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
				>
					{#each data.quiz.intakeFormSchema as field (field.name)}
						<div class="space-y-2">
							<Label for={field.name}>
								{field.name}{field.required ? ' *' : ''}
							</Label>
							<Input
								id={field.name}
								name={field.name}
								type={field.type === 'email'
									? 'email'
									: field.type === 'number'
										? 'number'
										: 'text'}
								required={field.required}
								disabled={isSubmitting}
							/>
						</div>
					{/each}

					{#if form?.intakeError}
						<div
							role="alert"
							class="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center"
						>
							{form.intakeError}
						</div>
					{/if}

					<Button type="submit" class="w-full min-h-11" disabled={isSubmitting}>
						{#if isSubmitting}
							<Loader2 class="size-4 animate-spin" />
						{/if}
						Start Quiz
					</Button>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>
