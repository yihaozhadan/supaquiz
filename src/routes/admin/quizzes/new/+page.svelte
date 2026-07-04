<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { toasts } from '$lib/components/admin/toast';
	import { ArrowLeft, Loader2 } from 'lucide-svelte';

	let { form } = $props();

	let isSubmitting = $state(false);
	let shuffleQuestions = $state(false);
	let allowBackNavigation = $state(true);
	let revealAnswersAfter = $state('immediate');

	$effect(() => {
		if (form?.error) toasts.error(form.error);
		if (form?.success) toasts.success('Quiz created successfully');
	});
</script>

<PageHeader title="Create New Quiz" description="Set up a new quiz with basic configuration">
	<Button href="/admin/quizzes" variant="outline" size="sm">
		<ArrowLeft class="size-4" />
		Back
	</Button>
</PageHeader>

<form method="POST" class="space-y-6" use:enhance={() => {
		isSubmitting = true;
		return async () => {
			isSubmitting = false;
		};
	}}>
	<input type="hidden" name="shuffleQuestions" value={shuffleQuestions ? 'on' : ''} />
	<input type="hidden" name="allowBackNavigation" value={allowBackNavigation ? 'on' : ''} />
	<input type="hidden" name="revealAnswersAfter" value={revealAnswersAfter} />

	<Card>
		<CardHeader>
			<CardTitle>Basic Information</CardTitle>
			<CardDescription>Basic details about your quiz.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="title">Title</Label>
				<Input type="text" name="title" id="title" required placeholder="Enter quiz title" disabled={isSubmitting} />
			</div>
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea name="description" id="description" rows={3} required placeholder="Enter quiz description" disabled={isSubmitting} />
			</div>
			<div class="space-y-2">
				<Label for="password">Password (optional)</Label>
				<Input type="text" name="password" id="password" placeholder="Leave empty for no password" disabled={isSubmitting} />
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Quiz Settings</CardTitle>
			<CardDescription>Configure how the quiz behaves.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-5">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="timeLimitSeconds">Time Limit (seconds, optional)</Label>
					<Input type="number" name="timeLimitSeconds" id="timeLimitSeconds" min="0" placeholder="No limit" disabled={isSubmitting} />
				</div>
				<div class="space-y-2">
					<Label for="maxAttempts">Max Attempts</Label>
					<Input type="number" name="maxAttempts" id="maxAttempts" value="1" min="1" required disabled={isSubmitting} />
				</div>
				<div class="space-y-2">
					<Label for="maxParticipants">Max Participants</Label>
					<Input type="number" name="maxParticipants" id="maxParticipants" min="1" required disabled={isSubmitting} />
				</div>
				<div class="space-y-2">
					<Label for="revealAnswersAfter">Reveal Answers After</Label>
					<Select.Root type="single" bind:value={revealAnswersAfter}>
						<Select.Trigger id="revealAnswersAfter" class="w-full">
							{revealAnswersAfter === 'immediate' ? 'Immediate' : 'Never'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="immediate">Immediate</Select.Item>
							<Select.Item value="never">Never</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<Label for="shuffleQuestions">Shuffle Questions</Label>
						<p class="text-xs text-muted-foreground">Randomize question order for each participant</p>
					</div>
					<Switch id="shuffleQuestions" bind:checked={shuffleQuestions} disabled={isSubmitting} />
				</div>
				<div class="flex items-center justify-between">
					<div>
						<Label for="allowBackNavigation">Allow Back Navigation</Label>
						<p class="text-xs text-muted-foreground">Let participants go back to previous questions</p>
					</div>
					<Switch id="allowBackNavigation" bind:checked={allowBackNavigation} disabled={isSubmitting} />
				</div>
			</div>
		</CardContent>
	</Card>

	<div class="flex justify-end">
		<Button type="submit" size="lg" disabled={isSubmitting}>
			{#if isSubmitting}
				<Loader2 class="size-4 animate-spin" />
			{/if}
			Create Quiz
		</Button>
	</div>
</form>
