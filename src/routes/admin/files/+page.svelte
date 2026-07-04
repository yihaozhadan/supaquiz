<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import { DataTable } from '$lib/components/ui/data-table';
	import * as Select from '$lib/components/ui/select';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import { toasts } from '$lib/components/admin/toast';
	import {
		LayoutGrid,
		List,
		Search,
		Trash2,
		FileImage,
		FileAudio,
		FileVideo,
		File as FileIcon,
		AlertTriangle,
		FolderOpen
	} from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.error) toasts.error(form.error);
		if (form?.success) toasts.success(String(form.success));
	});

	type FileKind = 'image' | 'audio' | 'video' | 'other';

	interface FileItem {
		relativePath: string;
		urlPath: string;
		name: string;
		size: number;
		uploadedAt: Date | string;
		kind: FileKind;
		mimeType: string;
		quizId: string | null;
		questionId: string | null;
		orphaned: boolean;
		quizTitle: string | null;
	}

	let searchQuery = $state('');
	let quizFilter = $state('all');
	let kindFilter = $state('all');
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc' | null>(null);
	let currentPage = $state(1);
	let pageSize = $state(10);

	let deleteDialogOpen = $state(false);
	let fileToDelete = $state<FileItem | null>(null);

	const kindIcons: Record<FileKind, typeof FileImage> = {
		image: FileImage,
		audio: FileAudio,
		video: FileVideo,
		other: FileIcon
	};

	const kindLabels: Record<FileKind, string> = {
		image: 'Image',
		audio: 'Audio',
		video: 'Video',
		other: 'File'
	};

	let filteredFiles = $derived(
		data.files.filter((f) => {
			const q = searchQuery.toLowerCase().trim();
			const matchesSearch =
				!q ||
				f.name.toLowerCase().includes(q) ||
				(f.quizTitle ?? '').toLowerCase().includes(q);
			const matchesQuiz = quizFilter === 'all' || f.quizId === quizFilter;
			const matchesKind = kindFilter === 'all' || f.kind === kindFilter;
			return matchesSearch && matchesQuiz && matchesKind;
		})
	);

	let orphanCount = $derived(data.files.filter((f) => f.orphaned).length);
	let totalSize = $derived(data.files.reduce((sum, f) => sum + f.size, 0));

	let columns = [
		{ id: 'name', header: 'Name', sortable: true },
		{ id: 'kind', header: 'Type', sortable: true, class: 'w-28' },
		{ id: 'size', header: 'Size', sortable: true, class: 'w-28' },
		{ id: 'quizTitle', header: 'Quiz', sortable: true, class: 'w-48' },
		{ id: 'uploadedAt', header: 'Uploaded', sortable: true, class: 'w-36' },
		{ id: 'actions', header: '', class: 'w-16 text-right', headerClass: 'text-right' }
	];

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function rawUrl(f: FileItem): string {
		return `/${f.urlPath}`;
	}

	function handleDeleteClick(file: FileItem) {
		fileToDelete = file;
		deleteDialogOpen = true;
	}
</script>

<PageHeader title="Files" description="Browse and manage uploaded media files across quizzes">
	<div class="flex items-center gap-3">
		<div class="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
			<span>{data.files.length} file{data.files.length === 1 ? '' : 's'}</span>
			<span aria-hidden="true">&middot;</span>
			<span>{formatSize(totalSize)}</span>
			{#if orphanCount > 0}
				<span aria-hidden="true">&middot;</span>
				<Badge variant="outline" class="gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/40">
					<AlertTriangle class="size-3" />
					{orphanCount} orphaned
				</Badge>
			{/if}
		</div>
	</div>
</PageHeader>

<!-- Toolbar: filters + view toggle (6.7.1, 6.7.4) -->
<div class="flex flex-wrap items-center gap-3 mb-6">
	<div class="relative flex-1 min-w-[200px] max-w-sm">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Search files..."
			class="pl-9"
			bind:value={searchQuery}
			oninput={() => {
				currentPage = 1;
			}}
		/>
	</div>

	<Select.Root
		type="single"
		bind:value={quizFilter}
		onValueChange={() => {
			currentPage = 1;
		}}
	>
		<Select.Trigger class="w-44">
			{quizFilter === 'all' ? 'All Quizzes' : data.quizzes.find((q) => q.id === quizFilter)?.title ?? 'All Quizzes'}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All Quizzes</Select.Item>
			{#each data.quizzes as q}
				<Select.Item value={q.id}>{q.title}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<Select.Root
		type="single"
		bind:value={kindFilter}
		onValueChange={() => {
			currentPage = 1;
		}}
	>
		<Select.Trigger class="w-36">
			{kindFilter === 'all' ? 'All Types' : kindLabels[kindFilter as FileKind]}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All Types</Select.Item>
			<Select.Item value="image">Image</Select.Item>
			<Select.Item value="audio">Audio</Select.Item>
			<Select.Item value="video">Video</Select.Item>
			<Select.Item value="other">Other</Select.Item>
		</Select.Content>
	</Select.Root>

	<!-- View toggle (6.7.1) -->
	<ToggleGroup.Root
		type="single"
		bind:value={viewMode}
		variant="outline"
		class="ml-auto"
		aria-label="View mode"
	>
		<ToggleGroup.Item value="grid" aria-label="Grid view">
			<LayoutGrid class="size-4" />
		</ToggleGroup.Item>
		<ToggleGroup.Item value="list" aria-label="List view">
			<List class="size-4" />
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</div>

{#if filteredFiles.length === 0}
	<EmptyState
		icon={FolderOpen}
		title={searchQuery || quizFilter !== 'all' || kindFilter !== 'all' ? 'No files match your filters' : 'No files uploaded yet'}
		description={searchQuery || quizFilter !== 'all' || kindFilter !== 'all'
			? 'Try adjusting your search or filter criteria.'
			: 'Media files uploaded for quiz questions will appear here.'}
	/>
{:else if viewMode === 'grid'}
	<!-- Grid view (6.7.2) -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each filteredFiles as file (file.relativePath)}
			{@const Icon = kindIcons[file.kind]}
			<Card
				class="group relative overflow-hidden transition-shadow duration-200 hover:shadow-md
					{file.orphaned ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}"
			>
				<!-- Preview area -->
				<div class="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
					{#if file.kind === 'image'}
						<img
							src={rawUrl(file)}
							alt={file.name}
							loading="lazy"
							class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
						/>
					{:else}
						<div class="flex flex-col items-center gap-2 py-6 text-muted-foreground">
							<Icon class="size-10" />
							<span class="text-xs uppercase tracking-wide">{kindLabels[file.kind]}</span>
						</div>
					{/if}

					{#if file.orphaned}
						<span
							class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-amber-700"
							title="Not referenced by any question"
						>
							<AlertTriangle class="size-3" />
							Orphaned
						</span>
					{/if}
				</div>

				<!-- File info -->
				<div class="p-3 space-y-1">
					<p class="truncate text-sm font-medium text-foreground" title={file.name}>{file.name}</p>
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>{formatSize(file.size)}</span>
						<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
					</div>
					{#if file.quizTitle}
						<p class="truncate text-xs text-muted-foreground" title={file.quizTitle}>
							{file.quizTitle}
						</p>
					{:else}
						<p class="truncate text-xs text-muted-foreground italic">No quiz</p>
					{/if}
				</div>

				<!-- Hover actions -->
				<div class="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					<Button
						variant="destructive"
						size="icon-sm"
						class="cursor-pointer shadow-sm"
						onclick={() => handleDeleteClick(file)}
						aria-label="Delete file"
					>
						<Trash2 class="size-4" />
					</Button>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<!-- List view (6.7.3) -->
	<DataTable
		{columns}
		data={filteredFiles}
		bind:sortColumn
		bind:sortDirection
		bind:pageSize
		bind:currentPage
	>
		{#snippet cell({ row: file, column })}
			{@const Icon = kindIcons[file.kind]}
			{#if column.id === 'name'}
				<div class="flex items-center gap-2 min-w-0">
					<Icon class="size-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<span class="truncate font-medium text-foreground" title={file.name}>{file.name}</span>
							{#if file.orphaned}
								<Badge variant="outline" class="shrink-0 gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/40">
									<AlertTriangle class="size-3" />
									Orphaned
								</Badge>
							{/if}
						</div>
						{#if file.kind === 'image'}
							<a
								href={rawUrl(file)}
								target="_blank"
								rel="noopener"
								class="text-xs text-muted-foreground hover:text-primary transition-colors"
							>
								View image
							</a>
						{/if}
					</div>
				</div>
			{:else if column.id === 'kind'}
				<Badge variant="secondary">{kindLabels[file.kind]}</Badge>
			{:else if column.id === 'size'}
				<span class="font-mono text-sm">{formatSize(file.size)}</span>
			{:else if column.id === 'quizTitle'}
				{#if file.quizTitle}
					<span class="truncate text-foreground" title={file.quizTitle}>{file.quizTitle}</span>
				{:else}
					<span class="text-muted-foreground italic">—</span>
				{/if}
			{:else if column.id === 'uploadedAt'}
				{formatDate(file.uploadedAt)}
			{:else if column.id === 'actions'}
				<div class="flex justify-end">
					<Button
						variant="ghost"
						size="icon-sm"
						class="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
						onclick={() => handleDeleteClick(file)}
						aria-label="Delete file"
					>
						<Trash2 class="size-4" />
					</Button>
				</div>
			{/if}
		{/snippet}
	</DataTable>
{/if}

<!-- Delete confirmation dialog (6.7.5) -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete File</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete "{fileToDelete?.name}"?
				{#if fileToDelete?.orphaned}
					This file is not referenced by any question.
				{:else}
					This file is referenced by a quiz question and will no longer display.
				{/if}
				This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (fileToDelete = null)}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action>
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								deleteDialogOpen = false;
								fileToDelete = null;
								await invalidateAll();
							}
						};
					}}
				>
					<input type="hidden" name="relativePath" value={fileToDelete?.relativePath} />
					<button type="submit" class="w-full">Delete</button>
				</form>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
