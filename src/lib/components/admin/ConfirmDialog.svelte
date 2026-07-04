<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Loader2 } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title = 'Confirm Action',
		description = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default',
		onConfirm,
		children
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'default' | 'destructive';
		onConfirm?: () => Promise<void> | void;
		children?: Snippet;
	} = $props();

	let isProcessing = $state(false);

	async function handleConfirm() {
		if (onConfirm) {
			isProcessing = true;
			try {
				await onConfirm();
			} finally {
				isProcessing = false;
			}
		}
		open = false;
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>
				{#if children}
					{@render children()}
				{:else}
					{description}
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isProcessing}>{cancelLabel}</AlertDialog.Cancel>
			<AlertDialog.Action>
				<Button
					variant={variant === 'destructive' ? 'destructive' : 'default'}
					class="w-full"
					onclick={handleConfirm}
					disabled={isProcessing}
				>
					{#if isProcessing}
						<Loader2 class="size-4 animate-spin" />
					{/if}
					{confirmLabel}
				</Button>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
