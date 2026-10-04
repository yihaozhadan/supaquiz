<script lang="ts">
	import { toasts } from './toast';
	import { X, CheckCircle2, AlertCircle, Info } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	const icons = {
		success: CheckCircle2,
		error: AlertCircle,
		info: Info
	};

	const styles = {
		success:
			'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
		error: 'border-destructive/20 bg-destructive/10 text-destructive dark:text-destructive',
		info: 'border-border bg-background text-foreground'
	};
</script>

<div
	class="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:w-96"
	role="region"
	aria-label="Notifications"
	aria-live="polite"
>
	{#each $toasts as toast (toast.id)}
		{@const Icon = icons[toast.type]}
		<div
			animate:flip
			in:fly={{ y: 20, duration: 200 }}
			out:fade={{ duration: 150 }}
			class="pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg {styles[
				toast.type
			]}"
			role="alert"
		>
			<Icon class="mt-0.5 size-5 shrink-0" />
			<p class="flex-1 text-sm font-medium">{toast.message}</p>
			<button
				onclick={() => toasts.dismiss(toast.id)}
				class="shrink-0 rounded-md p-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
				aria-label="Dismiss notification"
			>
				<X class="size-4" />
			</button>
		</div>
	{/each}
</div>
