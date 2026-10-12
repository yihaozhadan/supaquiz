<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	const COLLAPSE_LINE_THRESHOLD = 20;

	let { code }: { code: string | null | undefined } = $props();

	let lineCount = $derived(code ? code.split('\n').length : 0);
	let collapsible = $derived(lineCount > COLLAPSE_LINE_THRESHOLD);
	let expanded = $state(false);
</script>

{#if code}
	{#if !collapsible}
		<pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{code}</code></pre>
	{:else}
		<div class="overflow-hidden rounded-md bg-muted">
			<button
				type="button"
				class="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
				aria-expanded={expanded}
				onclick={() => (expanded = !expanded)}
			>
				<span>Code snippet · {lineCount} lines</span>
				{#if expanded}
					<ChevronUp class="size-4 shrink-0 text-muted-foreground" />
				{:else}
					<ChevronDown class="size-4 shrink-0 text-muted-foreground" />
				{/if}
			</button>
			{#if expanded}
				<pre class="overflow-x-auto px-4 pb-4 text-sm"><code>{code}</code></pre>
			{/if}
		</div>
	{/if}
{/if}
