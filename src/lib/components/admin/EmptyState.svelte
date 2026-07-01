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

<div class="flex flex-col items-center justify-center py-12 px-4 text-center">
	<div class="rounded-full bg-muted p-4 mb-4">
		<icon class="size-8 text-muted-foreground"></icon>
	</div>
	<h3 class="text-lg font-semibold text-foreground mb-1">{title}</h3>
	{#if description}
		<p class="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
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
