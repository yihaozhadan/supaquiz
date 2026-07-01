<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import TopBar from './TopBar.svelte';

	let { children } = $props();

	let sidebarCollapsed = $state(false);
	let mobileOpen = $state(false);
</script>

<div class="min-h-screen bg-background">
	<Sidebar bind:collapsed={sidebarCollapsed} bind:mobileOpen />

	<div class="transition-all duration-200 {sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}">
		<TopBar onToggleMobile={() => (mobileOpen = true)} />

		<main class="p-4 sm:p-6">
			<div class="mx-auto max-w-7xl">
				{@render children()}
			</div>
		</main>
	</div>
</div>
