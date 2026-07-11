<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Clock, FileQuestion, Lock, Loader2, ShieldAlert } from 'lucide-svelte';
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
</script>

<svelte:head>
	<title>{data.quiz.title} — SupaQuiz</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
	{#if !data.availability.available}
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
						<div role="alert" class="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center">
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
	{:else}
		<Card>
			<CardHeader>
				<CardTitle class="text-2xl">{data.quiz.title}</CardTitle>
				<CardDescription>{data.quiz.description}</CardDescription>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground">
					<span class="inline-flex items-center gap-1.5">
						<FileQuestion class="h-4 w-4" />
						{data.quiz.questionCount} {data.quiz.questionCount === 1 ? 'question' : 'questions'}
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
								type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
								required={field.required}
								disabled={isSubmitting}
							/>
						</div>
					{/each}

					{#if form?.intakeError}
						<div role="alert" class="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center">
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
