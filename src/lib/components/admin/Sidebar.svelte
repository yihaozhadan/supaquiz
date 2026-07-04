<script lang="ts">
	import { page } from '$app/state';
	import {
		LayoutDashboard,
		ListChecks,
		FolderOpen,
		Settings,
		ChevronLeft,
		ChevronRight,
		X
	} from 'lucide-svelte';

	let { collapsed = $bindable(false), mobileOpen = $bindable(false) } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
		{ href: '/admin/quizzes', label: 'Quizzes', icon: ListChecks, exact: false },
		{ href: '/admin/files', label: 'Files', icon: FolderOpen, exact: false },
		{ href: '/admin/settings', label: 'Settings', icon: Settings, exact: false }
	];

	function isActive(href: string, exact: boolean) {
		if (exact) return page.url.pathname === href;
		return page.url.pathname.startsWith(href);
	}

	function toggleCollapse() {
		collapsed = !collapsed;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('sidebar-collapsed', String(collapsed));
		}
	}

	function closeMobile() {
		mobileOpen = false;
	}

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('sidebar-collapsed');
			if (stored === 'true') collapsed = true;
		}
	});

	let touchStartX = $state(0);
	let touchStartY = $state(0);

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		const touchEndX = e.changedTouches[0].clientX;
		const touchEndY = e.changedTouches[0].clientY;
		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;
		if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -60) {
			closeMobile();
		}
	}
</script>

{#if mobileOpen}
	<div
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		onclick={closeMobile}
		onkeydown={(e) => e.key === 'Escape' && closeMobile()}
		role="button"
		tabindex="-1"
		aria-label="Close sidebar"
	></div>
{/if}

<aside
	class="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200
		{collapsed ? 'w-16' : 'w-60'}
		{mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	aria-label="Main navigation"
>
	<div class="flex h-14 items-center border-b border-sidebar-border px-3 {collapsed ? 'justify-center' : 'justify-between'}">
		{#if !collapsed}
			<a href="/admin" class="text-lg font-semibold text-sidebar-foreground truncate">
				SupaQuiz
			</a>
		{/if}
		<div class="flex items-center gap-1">
			<button
				onclick={toggleCollapse}
				class="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				aria-expanded={!collapsed}
			>
				{#if collapsed}
					<ChevronRight class="h-4 w-4" />
				{:else}
					<ChevronLeft class="h-4 w-4" />
				{/if}
			</button>
			<button
				onclick={closeMobile}
				class="lg:hidden h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
				aria-label="Close sidebar"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto py-3 px-2" aria-label="Sidebar navigation">
		<ul class="space-y-1">
			{#each navItems as item}
				<li>
					<a
						href={item.href}
						onclick={closeMobile}
						class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-11
							{isActive(item.href, item.exact)
							? 'bg-sidebar-accent text-sidebar-accent-foreground'
							: 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
							{collapsed ? 'justify-center' : ''}"
						title={collapsed ? item.label : undefined}
						aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
					>
						<item.icon class="h-4 w-4 shrink-0" />
						{#if !collapsed}
							<span class="truncate">{item.label}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="border-t border-sidebar-border p-2">
		<a
			href="/admin/logout"
			class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors min-h-11
				{collapsed ? 'justify-center' : ''}"
			title={collapsed ? 'Logout' : undefined}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="shrink-0"
			>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" y1="12" x2="9" y2="12" />
			</svg>
			{#if !collapsed}
				<span>Logout</span>
			{/if}
		</a>
	</div>
</aside>
