<script lang="ts">
	import {
		ShieldCheck,
		PenLine,
		ListChecks,
		Lock,
		FileJson,
		Smartphone
	} from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';

	const features = [
		{
			icon: ShieldCheck,
			title: 'Self-Hosted',
			description: 'Run SupaQuiz on your own server or container. No third-party services required.'
		},
		{
			icon: PenLine,
			title: 'Easy Quiz Builder',
			description: 'Create MCQ, true/false, and fill-in-the-blank questions with media and code snippets.'
		},
		{
			icon: ListChecks,
			title: 'Auto-Grading',
			description: 'Objective questions are graded instantly, with detailed per-attempt results.'
		},
		{
			icon: Lock,
			title: 'Privacy First',
			description: 'Participant data stays on your infrastructure and is never shared externally.'
		},
		{
			icon: FileJson,
			title: 'Import/Export',
			description: 'Move quizzes between instances as portable JSON, including media references.'
		},
		{
			icon: Smartphone,
			title: 'Mobile Friendly',
			description: 'Fully responsive quiz builder and quiz-taking experience on any device.'
		}
	];
</script>

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Why SupaQuiz</h2>
		<p class="mt-3 text-muted-foreground">
			Everything you need to run quizzes, without giving up control of your data.
		</p>
	</div>

	<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each features as feature}
			<Card.Root class="h-full">
				<Card.Header>
					<feature.icon class="h-8 w-8 text-primary" />
					<Card.Title class="mt-4 text-lg">{feature.title}</Card.Title>
					<Card.Description>{feature.description}</Card.Description>
				</Card.Header>
			</Card.Root>
		{/each}
	</div>
</section>
