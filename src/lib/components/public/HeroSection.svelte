<script lang="ts">
	import { ArrowRight, ExternalLink } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';

	let {
		githubUrl = 'https://github.com/yihaozhadan/supaquiz'
	}: {
		githubUrl?: string;
	} = $props();
</script>

<section class="relative overflow-hidden border-b">
	<div
		class="absolute inset-0 -z-10 bg-gradient-to-b from-secondary via-secondary/50 to-background"
		aria-hidden="true"
	></div>
	<div
		class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-[size:24px_24px] opacity-40"
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
				SupaQuiz is a lightweight quiz platform you host yourself. Build quizzes with multiple
				question types, collect participant responses, and auto-grade results — all without
				sending data to a third party.
			</p>
			<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<a href="/quizzes" class={buttonVariants({ size: 'lg', class: 'min-h-11 w-full sm:w-auto' })}>
					Browse Quizzes
					<ArrowRight class="ml-2 h-4 w-4" />
				</a>
				{#if githubUrl}
					<a
						href={githubUrl}
						target="_blank"
						rel="noopener noreferrer"
						class={buttonVariants({ variant: 'outline', size: 'lg', class: 'min-h-11 w-full sm:w-auto' })}
					>
						<ExternalLink class="mr-2 h-4 w-4" />
						View on GitHub
					</a>
				{/if}
			</div>
		</div>
	</div>
</section>
