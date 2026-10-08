<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { DataTable } from '$lib/components/ui/data-table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Select from '$lib/components/ui/select';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import { toasts } from '$lib/components/admin/toast';
	import {
		MoreHorizontal,
		Pencil,
		Copy,
		Trash2,
		BarChart3,
		Download,
		Plus,
		Search,
		Upload,
		FileJson,
		Eye,
		Archive,
		ArchiveRestore,
		CalendarClock
	} from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.error) toasts.error(form.error);
		if (form?.success) toasts.success(String(form.success));
	});

	let searchQuery = $state('');
	let statusFilter = $state('all');
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc' | null>(null);
	let currentPage = $state(1);
	let pageSize = $state(10);
	let deleteDialogOpen = $state(false);
	let quizToDelete = $state<{ id: string; title: string } | null>(null);

	interface Quiz {
		id: string;
		title: string;
		description: string | null;
		status: string;
		effectiveStatus: string;
		activateAt: Date | string | null;
		expireAt: Date | string | null;
		questionCount: number;
		attemptCount: number;
		createdAt: Date | string;
	}

	const statusConfig: Record<
		string,
		{ label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; class?: string }
	> = {
		draft: { label: 'Draft', variant: 'secondary' },
		scheduled: {
			label: 'Scheduled',
			variant: 'outline',
			class:
				'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300'
		},
		active: { label: 'Active', variant: 'default' },
		expired: { label: 'Expired', variant: 'destructive' },
		archived: { label: 'Archived', variant: 'outline', class: 'text-muted-foreground' }
	};

	function statusHint(quiz: Quiz): string | null {
		if (quiz.effectiveStatus === 'scheduled' && quiz.activateAt) {
			return `Starts ${new Date(quiz.activateAt).toLocaleString()}`;
		}
		if (quiz.effectiveStatus === 'expired' && quiz.expireAt) {
			return `Ended ${new Date(quiz.expireAt).toLocaleString()}`;
		}
		if (quiz.effectiveStatus === 'active' && quiz.expireAt) {
			return `Ends ${new Date(quiz.expireAt).toLocaleString()}`;
		}
		return null;
	}

	let filteredQuizzes = $derived(
		data.quizzes.filter((quiz) => {
			const matchesSearch =
				quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesStatus = statusFilter === 'all' || quiz.effectiveStatus === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	let columns = [
		{ id: 'title', header: 'Title', sortable: true },
		{ id: 'status', header: 'Status', sortable: true, class: 'w-32' },
		{ id: 'questionCount', header: 'Questions', sortable: true, class: 'w-24' },
		{ id: 'attemptCount', header: 'Attempts', sortable: true, class: 'w-24' },
		{ id: 'createdAt', header: 'Created', sortable: true, class: 'w-32' },
		{ id: 'actions', header: '', class: 'w-16 text-right', headerClass: 'text-right' }
	];

	function handleDeleteClick(quiz: { id: string; title: string }) {
		quizToDelete = quiz;
		deleteDialogOpen = true;
	}
</script>

<PageHeader title="Quizzes" description="Manage your quizzes and track participant engagement">
	<Button href="/admin/quizzes/import" variant="outline">
		<Upload class="mr-2 size-4" />
		Import
	</Button>
	<Button href="/admin/quizzes/new">
		<Plus class="mr-2 size-4" />
		New Quiz
	</Button>
</PageHeader>

<!-- Toolbar -->
<div class="mb-6 flex items-center gap-4">
	<div class="relative max-w-sm flex-1">
		<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Search quizzes..."
			class="pl-9"
			bind:value={searchQuery}
			oninput={() => {
				currentPage = 1;
			}}
		/>
	</div>

	<Select.Root
		type="single"
		bind:value={statusFilter}
		onValueChange={() => {
			currentPage = 1;
		}}
	>
		<Select.Trigger class="w-40">
			{statusFilter === 'all' ? 'All Status' : statusConfig[statusFilter]?.label}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All Status</Select.Item>
			<Select.Item value="draft">Draft</Select.Item>
			<Select.Item value="scheduled">Scheduled</Select.Item>
			<Select.Item value="active">Active</Select.Item>
			<Select.Item value="expired">Expired</Select.Item>
			<Select.Item value="archived">Archived</Select.Item>
		</Select.Content>
	</Select.Root>
</div>

{#if filteredQuizzes.length === 0}
	<EmptyState
		title={searchQuery || statusFilter !== 'all'
			? 'No quizzes match your filters'
			: 'No quizzes yet'}
		description={searchQuery || statusFilter !== 'all'
			? 'Try adjusting your search or filter criteria.'
			: 'Create your first quiz to get started.'}
		actionLabel={!searchQuery && statusFilter === 'all' ? 'Create Quiz' : undefined}
		actionHref={!searchQuery && statusFilter === 'all' ? '/admin/quizzes/new' : undefined}
	/>
{:else}
	<DataTable
		{columns}
		data={filteredQuizzes}
		bind:sortColumn
		bind:sortDirection
		bind:pageSize
		bind:currentPage
	>
		{#snippet cell({ row: quiz, column })}
			{#if column.id === 'title'}
				<div>
					<div class="font-medium text-foreground">{quiz.title}</div>
					{#if quiz.description}
						<div class="max-w-xs truncate text-xs text-muted-foreground">{quiz.description}</div>
					{/if}
				</div>
			{:else if column.id === 'status'}
				{@const config = statusConfig[quiz.effectiveStatus] ?? statusConfig.draft}
				{@const hint = statusHint(quiz)}
				<div class="space-y-1">
					<Badge variant={config.variant} class={config.class}>
						{#if quiz.effectiveStatus === 'scheduled'}
							<CalendarClock class="size-3" />
						{/if}
						{config.label}
					</Badge>
					{#if hint}
						<div class="text-xs whitespace-nowrap text-muted-foreground">{hint}</div>
					{/if}
				</div>
			{:else if column.id === 'questionCount'}
				{quiz.questionCount}
			{:else if column.id === 'attemptCount'}
				{quiz.attemptCount}
			{:else if column.id === 'createdAt'}
				{new Date(quiz.createdAt).toLocaleDateString()}
			{:else if column.id === 'actions'}
				<div class="flex justify-end">
					<DropdownMenu.DropdownMenu>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="icon-sm">
								<MoreHorizontal class="size-4" />
								<span class="sr-only">Actions</span>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<a href="/admin/quizzes/{quiz.id}/edit" class="contents">
								<DropdownMenu.Item>
									<Pencil class="mr-2 size-4" />
									Edit
								</DropdownMenu.Item>
							</a>
							<a href="/admin/quizzes/{quiz.id}/results" class="contents">
								<DropdownMenu.Item>
									<BarChart3 class="mr-2 size-4" />
									View Results
								</DropdownMenu.Item>
							</a>
							<DropdownMenu.Item
								onSelect={() =>
									window.open(`${resolve('/quiz/[id]', { id: quiz.id })}?preview=1`, '_blank')}
							>
								<Eye class="mr-2 size-4" />
								Preview
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<a href="/admin/quizzes/{quiz.id}/export" class="contents">
								<DropdownMenu.Item>
									<FileJson class="mr-2 size-4" />
									Export
								</DropdownMenu.Item>
							</a>
							<DropdownMenu.Item>
								<form method="POST" action="?/duplicate" class="w-full">
									<input type="hidden" name="id" value={quiz.id} />
									<button type="submit" class="flex w-full items-center">
										<Copy class="mr-2 size-4" />
										Duplicate
									</button>
								</form>
							</DropdownMenu.Item>
							{#if quiz.status === 'archived'}
								<DropdownMenu.Item>
									<form method="POST" action="?/toggleStatus" class="w-full">
										<input type="hidden" name="id" value={quiz.id} />
										<input type="hidden" name="status" value="draft" />
										<button type="submit" class="flex w-full items-center">
											<ArchiveRestore class="mr-2 size-4" />
											Restore to Draft
										</button>
									</form>
								</DropdownMenu.Item>
							{:else}
								<DropdownMenu.Item>
									<form method="POST" action="?/toggleStatus" class="w-full">
										<input type="hidden" name="id" value={quiz.id} />
										<input
											type="hidden"
											name="status"
											value={quiz.status === 'draft' ? 'active' : 'draft'}
										/>
										<button type="submit" class="flex w-full items-center">
											<Download class="mr-2 size-4" />
											{quiz.status === 'draft' ? 'Activate' : 'Deactivate'}
										</button>
									</form>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<form method="POST" action="?/toggleStatus" class="w-full">
										<input type="hidden" name="id" value={quiz.id} />
										<input type="hidden" name="status" value="archived" />
										<button type="submit" class="flex w-full items-center">
											<Archive class="mr-2 size-4" />
											Archive
										</button>
									</form>
								</DropdownMenu.Item>
							{/if}
							<DropdownMenu.Separator />
							<DropdownMenu.Item variant="destructive" onSelect={() => handleDeleteClick(quiz)}>
								<Trash2 class="mr-2 size-4" />
								Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.DropdownMenu>
				</div>
			{/if}
		{/snippet}
	</DataTable>
{/if}

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Quiz</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone. All
				questions and attempts for this quiz will be permanently deleted.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (quizToDelete = null)}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action>
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						deleteDialogOpen = false;
						quizToDelete = null;
						return async ({ update }) => {
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={quizToDelete?.id} />
					<button type="submit" class="w-full">Delete</button>
				</form>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
