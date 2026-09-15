<script lang="ts">
	import { page } from '$app/state';
	import { Menu } from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import {
		Breadcrumb,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbList,
		BreadcrumbPage,
		BreadcrumbSeparator
	} from '$lib/components/ui/breadcrumb';

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
		class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
		aria-label="Open sidebar"
	>
		<Menu class="h-5 w-5" />
	</button>

	<Breadcrumb>
		<BreadcrumbList>
			{#each breadcrumbs as crumb, i}
				<BreadcrumbItem>
					{#if i < breadcrumbs.length - 1}
						<BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
					{:else}
						<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
					{/if}
				</BreadcrumbItem>
				{#if i < breadcrumbs.length - 1}
					<BreadcrumbSeparator />
				{/if}
			{/each}
		</BreadcrumbList>
	</Breadcrumb>

	<div class="ml-auto flex items-center gap-3">
		<span class="hidden text-sm text-muted-foreground sm:inline">{username}</span>
		<Avatar.Root class="size-8">
			<Avatar.Fallback class="bg-primary text-xs font-semibold text-primary-foreground uppercase">
				{username.charAt(0)}
			</Avatar.Fallback>
		</Avatar.Root>
	</div>
</header>
