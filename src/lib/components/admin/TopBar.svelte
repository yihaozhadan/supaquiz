<script lang="ts">
	import { page } from '$app/state';
	import { Menu } from 'lucide-svelte';

	let { onToggleMobile }: { onToggleMobile: () => void } = $props();

	const routeLabels: Record<string, string> = {
		'/admin': 'Dashboard',
		'/admin/quizzes': 'Quizzes',
		'/admin/quizzes/new': 'New Quiz',
		'/admin/files': 'Files',
		'/admin/settings': 'Settings'
	};

	let breadcrumbs = $derived.by(() => {
		const segments = page.url.pathname.split('/').filter(Boolean);
		const crumbs: { label: string; href: string }[] = [];
		let path = '';
		for (const seg of segments) {
			path += '/' + seg;
			if (routeLabels[path]) {
				crumbs.push({ label: routeLabels[path], href: path });
			}
		}
		if (crumbs.length === 0 || crumbs[0].href !== '/admin') {
			crumbs.unshift({ label: 'Dashboard', href: '/admin' });
		}
		return crumbs;
	});

	const username = $derived(page.data.admin?.username ?? 'admin');
</script>

<header class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
	<button
		onclick={onToggleMobile}
		class="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
		aria-label="Open sidebar"
	>
		<Menu class="h-5 w-5" />
	</button>

	<nav class="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
		{#each breadcrumbs as crumb, i}
			{#if i > 0}
				<span class="mx-1">/</span>
			{/if}
			{#if i < breadcrumbs.length - 1}
				<a href={crumb.href} class="hover:text-foreground transition-colors">
					{crumb.label}
				</a>
			{:else}
				<span class="text-foreground font-medium">{crumb.label}</span>
			{/if}
		{/each}
	</nav>

	<div class="ml-auto flex items-center gap-3">
		<span class="text-sm text-muted-foreground hidden sm:inline">{username}</span>
		<div class="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold uppercase">
			{username.charAt(0)}
		</div>
	</div>
</header>
