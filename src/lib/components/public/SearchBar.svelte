<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';

	let {
		value = $bindable(''),
		placeholder = 'Search...',
		onSearch,
		delay = 300,
		loading = false
	}: {
		value?: string;
		placeholder?: string;
		onSearch?: (value: string) => void;
		delay?: number;
		loading?: boolean;
	} = $props();

	let timeout: ReturnType<typeof setTimeout> | undefined;

	function handleInput() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => onSearch?.(value), delay);
	}

	function clear() {
		value = '';
		if (timeout) clearTimeout(timeout);
		onSearch?.(value);
	}
</script>

<div class="relative">
	<Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
	<Input
		type="search"
		{placeholder}
		bind:value
		oninput={handleInput}
		class="h-11 pl-9 pr-9"
		aria-label={placeholder}
	/>
	{#if value}
		<button
			type="button"
			onclick={clear}
			aria-label="Clear search"
			class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
		>
			<X class="h-4 w-4" />
		</button>
	{:else if loading}
		<div
			class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
			aria-hidden="true"
		></div>
	{/if}
</div>
