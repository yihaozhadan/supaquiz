<script lang="ts">
	import { SearchX } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';

	let {
		title = 'No results found',
		description,
		icon = SearchX,
		actionLabel,
		actionHref,
		children
	}: {
		title?: string;
		description?: string;
		icon?: typeof SearchX;
		actionLabel?: string;
		actionHref?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4 text-center">
	<div class="rounded-full bg-muted p-4">
		<icon class="h-8 w-8 text-muted-foreground"></icon>
	</div>
	<h3 class="mt-4 text-lg font-semibold text-foreground">{title}</h3>
	{#if description}
		<p class="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if actionLabel && actionHref}
		<a href={actionHref} class={buttonVariants({ class: 'mt-4 min-h-11' })}>{actionLabel}</a>
	{/if}
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</div>
