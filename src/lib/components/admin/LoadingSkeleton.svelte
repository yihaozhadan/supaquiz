<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';

	let {
		variant = 'table',
		rows = 5,
		cards = 4
	}: {
		variant?: 'table' | 'cards' | 'stats' | 'detail';
		rows?: number;
		cards?: number;
	} = $props();
</script>

{#if variant === 'stats'}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each Array(cards) as _}
			<div class="rounded-lg border border-border p-4">
				<div class="flex items-center justify-between">
					<div class="space-y-2">
						<Skeleton class="h-3 w-20" />
						<Skeleton class="h-7 w-16" />
					</div>
					<Skeleton class="h-9 w-9 rounded-lg" />
				</div>
			</div>
		{/each}
	</div>
{:else if variant === 'table'}
	<div class="rounded-lg border border-border overflow-hidden">
		<div class="bg-muted px-4 py-3">
			<div class="flex items-center gap-4">
				{#each [40, 20, 15, 15] as w}
					<Skeleton class="h-3" style="width: {w}%" />
				{/each}
			</div>
		</div>
		<div class="divide-y divide-border">
			{#each Array(rows) as _}
				<div class="px-4 py-3.5">
					<div class="flex items-center gap-4">
						{#each [35, 18, 12, 15] as w}
							<Skeleton class="h-4" style="width: {w}%" />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
	<div class="mt-4 flex items-center justify-between">
		<Skeleton class="h-4 w-32" />
		<div class="flex gap-1">
			{#each Array(4) as _}
				<Skeleton class="size-7" />
			{/each}
		</div>
	</div>
{:else if variant === 'cards'}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each Array(cards) as _}
			<div class="rounded-lg border border-border overflow-hidden">
				<Skeleton class="aspect-video w-full" />
				<div class="p-3 space-y-2">
					<Skeleton class="h-4 w-3/4" />
					<div class="flex justify-between">
						<Skeleton class="h-3 w-16" />
						<Skeleton class="h-3 w-16" />
					</div>
					<Skeleton class="h-3 w-1/2" />
				</div>
			</div>
		{/each}
	</div>
{:else if variant === 'detail'}
	<div class="space-y-6">
		<div class="grid grid-cols-3 gap-3">
			{#each Array(3) as _}
				<div class="rounded-lg border border-border p-3 text-center space-y-2">
					<Skeleton class="mx-auto h-4 w-4" />
					<Skeleton class="mx-auto h-3 w-12" />
					<Skeleton class="mx-auto h-6 w-16" />
				</div>
			{/each}
		</div>
		<div class="space-y-3">
			{#each Array(4) as _}
				<div class="rounded-lg border border-border p-3 space-y-2">
					<Skeleton class="h-4 w-2/3" />
					<Skeleton class="h-3 w-1/2" />
				</div>
			{/each}
		</div>
	</div>
{/if}
