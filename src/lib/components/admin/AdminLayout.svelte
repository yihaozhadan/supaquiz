<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import TopBar from './TopBar.svelte';
	import Toaster from './Toaster.svelte';

	let { children } = $props();

	let sidebarCollapsed = $state(false);
	let mobileOpen = $state(false);
</script>

<div class="min-h-screen bg-background">
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
	>
		Skip to content
	</a>
	<Sidebar bind:collapsed={sidebarCollapsed} bind:mobileOpen />

	<div class="transition-all duration-200 {sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}">
		<TopBar onToggleMobile={() => (mobileOpen = true)} />

		<main class="p-4 sm:p-6" id="main-content" tabindex="-1">
			<div class="mx-auto max-w-7xl">
				{@render children()}
			</div>
		</main>
	</div>

	<Toaster />
</div>
