<script lang="ts">
	import { page } from '$app/state';
	import { Menu, X } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';

	const navItems = [
		{ href: '/quizzes', label: 'Browse Quizzes', exact: false },
		{ href: '/docs', label: 'Docs', exact: false },
		{ href: '/about', label: 'About', exact: false }
	];

	let mobileOpen = $state(false);
	let scrolled = $state(false);

	function isActive(href: string, exact: boolean) {
		if (exact) return page.url.pathname === href;
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	$effect(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 8;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	$effect(() => {
		if (!mobileOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') mobileOpen = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<header
	class="sticky top-0 z-40 w-full border-b transition-colors duration-200
		{scrolled ? 'border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60' : 'border-transparent bg-background'}"
>
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<a href="/" class="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
			<span class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
				S
			</span>
			<span class="text-lg font-semibold tracking-tight">SupaQuiz</span>
		</a>

		<nav class="hidden items-center gap-1 md:flex" aria-label="Primary">
			{#each navItems as item}
				<a
					href={item.href}
					class="rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-11 flex items-center
						{isActive(item.href, item.exact)
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
					aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-2 md:flex">
			<a
				href="/admin/login"
				class="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11"
			>
				Admin Login
			</a>
			<a href="/quizzes" class={buttonVariants({ size: 'default' }) + ' min-h-11'}>
				Login
			</a>
		</div>

		<button
			onclick={() => (mobileOpen = true)}
			class="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
			aria-label="Open menu"
			aria-expanded={mobileOpen}
		>
			<Menu class="h-5 w-5" />
		</button>
	</div>
</header>

<Sheet.Root bind:open={mobileOpen}>
	<Sheet.Content side="right" class="w-full max-w-xs p-0">
		<div class="flex h-16 items-center justify-between border-b px-4">
			<a href="/" onclick={() => (mobileOpen = false)} class="flex items-center gap-2">
				<span
					class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold"
				>
					S
				</span>
				<span class="text-lg font-semibold tracking-tight">SupaQuiz</span>
			</a>
		</div>
		<nav class="flex flex-col gap-1 p-4" aria-label="Mobile">
			{#each navItems as item}
				<a
					href={item.href}
					onclick={() => (mobileOpen = false)}
					class="rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-11 flex items-center
						{isActive(item.href, item.exact)
						? 'bg-accent text-accent-foreground'
						: 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
					aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mt-auto flex flex-col gap-2 border-t p-4">
			<a
				href="/admin/login"
				onclick={() => (mobileOpen = false)}
				class="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
			>
				Admin Login
			</a>
			<a
				href="/quizzes"
				onclick={() => (mobileOpen = false)}
				class={buttonVariants({ class: 'h-11 w-full' })}
			>
				Login
			</a>
		</div>
	</Sheet.Content>
</Sheet.Root>
