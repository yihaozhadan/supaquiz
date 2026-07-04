<script lang="ts">
	import { page } from '$app/stores';
	import AdminLayout from '$lib/components/admin/AdminLayout.svelte';

	let { children } = $props();
</script>

{#if $page.url.pathname === '/admin/login'}
	{@render children()}
{:else}
	<AdminLayout>
		{@render children()}
	</AdminLayout>
{/if}
