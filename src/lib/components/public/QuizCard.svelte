<script lang="ts">
	import { Clock, FileQuestion, Lock, Users, ArrowRight } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { buttonVariants } from '$lib/components/ui/button';

	let {
		id,
		title,
		description,
		questionCount,
		timeLimitSeconds,
		attemptCount,
		isPasswordProtected = false,
		activateAt = null,
		expireAt = null
	}: {
		id: string;
		title: string;
		description: string;
		questionCount: number;
		timeLimitSeconds?: number | null;
		attemptCount: number;
		isPasswordProtected?: boolean;
		activateAt?: Date | string | null;
		expireAt?: Date | string | null;
	} = $props();

	function formatTimeLimit(seconds: number) {
		const minutes = Math.round(seconds / 60);
		return `${minutes} min`;
	}

	const activateAtTime = $derived(activateAt ? new Date(activateAt).getTime() : null);
	const expireAtTime = $derived(expireAt ? new Date(expireAt).getTime() : null);

	const isUpcoming = $derived(activateAtTime !== null && activateAtTime > Date.now());
	const isEndingSoon = $derived(
		expireAtTime !== null &&
			expireAtTime > Date.now() &&
			expireAtTime - Date.now() < 24 * 60 * 60 * 1000
	);
</script>

<Card.Root class="group flex h-full flex-col transition-colors hover:border-primary/50">
	<Card.Header>
		<div class="flex items-start justify-between gap-2">
			<Card.Title class="text-lg leading-snug">{title}</Card.Title>
			{#if isPasswordProtected}
				<Lock class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Password protected" />
			{/if}
		</div>
		<Card.Description class="line-clamp-2">{description}</Card.Description>
	</Card.Header>

	<Card.Content class="flex-1 space-y-3">
		{#if isUpcoming || isEndingSoon}
			<div class="flex flex-wrap gap-2">
				{#if isUpcoming}
					<Badge variant="secondary">Upcoming</Badge>
				{/if}
				{#if isEndingSoon}
					<Badge variant="destructive">Ending soon</Badge>
				{/if}
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
			<span class="inline-flex items-center gap-1.5">
				<FileQuestion class="h-4 w-4" />
				{questionCount} {questionCount === 1 ? 'question' : 'questions'}
			</span>
			{#if timeLimitSeconds}
				<span class="inline-flex items-center gap-1.5">
					<Clock class="h-4 w-4" />
					{formatTimeLimit(timeLimitSeconds)}
				</span>
			{/if}
			<span class="inline-flex items-center gap-1.5">
				<Users class="h-4 w-4" />
				{attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
			</span>
		</div>
	</Card.Content>

	<Card.Footer>
		<a
			href={`/quiz/${id}`}
			class={buttonVariants({ variant: 'outline', class: 'w-full min-h-11 group-hover:border-primary/50' })}
		>
			Start Quiz
			<ArrowRight class="ml-1.5 h-4 w-4" />
		</a>
	</Card.Footer>
</Card.Root>
