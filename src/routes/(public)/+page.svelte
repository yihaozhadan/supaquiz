<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button';
	import { ListChecks, ArrowRight, ShieldCheck, PenLine, FileText, Info } from 'lucide-svelte';

	const features = [
		{
			icon: ShieldCheck,
			title: 'Self-Hosted & Private',
			description: 'Run quizzes on your own infrastructure. Participant data never leaves your server.'
		},
		{
			icon: PenLine,
			title: 'Easy Quiz Builder',
			description: 'Create MCQ, true/false, and fill-in-the-blank questions with media and code snippets.'
		},
		{
			icon: ListChecks,
			title: 'Auto-Grading',
			description: 'Objective questions are graded instantly. Review results with rich per-attempt detail.'
		}
	];

	const links = [
		{ href: '/quizzes', label: 'Browse Quizzes', icon: ListChecks, description: 'Take a quiz or view what is available.' },
		{ href: '/docs', label: 'Documentation', icon: FileText, description: 'Learn how to take part and submit a quiz.' },
		{ href: '/about', label: 'About SupaQuiz', icon: Info, description: 'The story behind this open-source project.' }
	];
</script>

<svelte:head>
	<title>SupaQuiz — Self-hosted quiz platform</title>
	<meta
		name="description"
		content="SupaQuiz is an open-source, self-hosted quiz platform with an easy builder and instant auto-grading."
	/>
</svelte:head>

<section class="relative overflow-hidden border-b">
	<div
		class="absolute inset-0 -z-10 bg-gradient-to-b from-secondary via-secondary/50 to-background"
		aria-hidden="true"
	></div>
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
		<div class="mx-auto max-w-3xl text-center">
			<span
				class="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
			>
				Open-source · Self-hosted · Privacy-first
			</span>
			<h1 class="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
				Run quizzes on your own terms
			</h1>
			<p class="mt-5 text-lg text-muted-foreground text-pretty sm:text-xl">
				SupaQuiz is a lightweight quiz platform you host yourself. Build quizzes with multiple question
				types, collect participant responses, and auto-grade results — all without sending data to a
				third party.
			</p>
			<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<a href="/quizzes" class={buttonVariants({ size: 'lg' })}>
					Browse Quizzes
					<ArrowRight class="ml-2 h-4 w-4" />
				</a>
				<a href="/docs" class={buttonVariants({ variant: 'outline', size: 'lg' })}>
					Read the Docs
				</a>
			</div>
		</div>
	</div>
</section>

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each features as feature}
			<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
				<feature.icon class="h-8 w-8 text-primary" />
				<h2 class="mt-4 text-lg font-semibold">{feature.title}</h2>
				<p class="mt-2 text-sm text-muted-foreground">{feature.description}</p>
			</div>
		{/each}
	</div>
</section>

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
	<h2 class="text-2xl font-semibold tracking-tight">Get started</h2>
	<div class="mt-6 grid gap-4 sm:grid-cols-3">
		{#each links as link}
			<a
				href={link.href}
				class="group flex flex-col gap-2 rounded-lg border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent"
			>
				<div class="flex items-center gap-2">
					<link.icon class="h-5 w-5 text-primary" />
					<span class="font-medium">{link.label}</span>
				</div>
				<p class="text-sm text-muted-foreground">{link.description}</p>
				<span
					class="mt-2 inline-flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
				>
					Open {link.label.toLowerCase()} <ArrowRight class="ml-1 h-3 w-3" />
				</span>
			</a>
		{/each}
	</div>
</section>
