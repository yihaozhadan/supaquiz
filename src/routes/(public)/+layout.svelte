<script lang="ts">
	import Header from '$lib/components/public/Header.svelte';
	import Footer from '$lib/components/public/Footer.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col bg-background">
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
	>
		Skip to content
	</a>

	<Header />

	<main id="main-content" tabindex="-1" class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
