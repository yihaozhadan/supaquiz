<script lang="ts">
	import { FileQuestion } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';

	let {
		title = 'No items found',
		description,
		icon = FileQuestion,
		actionLabel,
		actionHref,
		children
	}: {
		title?: string;
		description?: string;
		icon?: typeof FileQuestion;
		actionLabel?: string;
		actionHref?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center px-4 py-12 text-center">
	<div class="mb-4 rounded-full bg-muted p-4">
		<icon class="size-8 text-muted-foreground"></icon>
	</div>
	<h3 class="mb-1 text-lg font-semibold text-foreground">{title}</h3>
	{#if description}
		<p class="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if actionLabel && actionHref}
		<Button href={actionHref}>{actionLabel}</Button>
	{/if}
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</div>
