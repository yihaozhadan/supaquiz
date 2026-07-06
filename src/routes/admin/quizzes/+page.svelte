<script lang="ts">
	import { enhance } from '$app/forms';
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
		FileJson
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
		questionCount: number;
		attemptCount: number;
		createdAt: string;
	}

	const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
		draft: 'secondary',
		active: 'default',
		expired: 'destructive'
	};

	const statusLabels: Record<string, string> = {
		draft: 'Draft',
		active: 'Active',
		expired: 'Expired'
	};

	let filteredQuizzes = $derived(
		data.quizzes.filter((quiz) => {
			const matchesSearch =
				quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesStatus = statusFilter === 'all' || quiz.status === statusFilter;
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
		<Upload class="size-4 mr-2" />
		Import
	</Button>
	<Button href="/admin/quizzes/new">
		<Plus class="size-4 mr-2" />
		New Quiz
	</Button>
</PageHeader>

<!-- Toolbar -->
<div class="flex items-center gap-4 mb-6">
	<div class="relative flex-1 max-w-sm">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
			{statusFilter === 'all' ? 'All Status' : statusLabels[statusFilter]}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All Status</Select.Item>
			<Select.Item value="draft">Draft</Select.Item>
			<Select.Item value="active">Active</Select.Item>
			<Select.Item value="expired">Expired</Select.Item>
		</Select.Content>
	</Select.Root>
</div>

{#if filteredQuizzes.length === 0}
	<EmptyState
		title={searchQuery || statusFilter !== 'all' ? 'No quizzes match your filters' : 'No quizzes yet'}
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
						<div class="text-muted-foreground text-xs truncate max-w-xs">{quiz.description}</div>
					{/if}
				</div>
			{:else if column.id === 'status'}
				<Badge variant={statusColors[quiz.status]}>
					{statusLabels[quiz.status]}
				</Badge>
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
									<Pencil class="size-4 mr-2" />
									Edit
								</DropdownMenu.Item>
							</a>
							<a href="/admin/quizzes/{quiz.id}/results" class="contents">
								<DropdownMenu.Item>
									<BarChart3 class="size-4 mr-2" />
									View Results
								</DropdownMenu.Item>
							</a>
							<DropdownMenu.Separator />
							<a href="/admin/quizzes/{quiz.id}/export" class="contents">
								<DropdownMenu.Item>
									<FileJson class="size-4 mr-2" />
									Export
								</DropdownMenu.Item>
							</a>
							<DropdownMenu.Item>
								<form method="POST" action="?/duplicate" class="w-full">
									<input type="hidden" name="id" value={quiz.id} />
									<button type="submit" class="flex items-center w-full">
										<Copy class="size-4 mr-2" />
										Duplicate
									</button>
								</form>
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								<form method="POST" action="?/toggleStatus" class="w-full">
									<input type="hidden" name="id" value={quiz.id} />
									<input
										type="hidden"
										name="status"
										value={quiz.status === 'draft' ? 'active' : 'draft'}
									/>
									<button type="submit" class="flex items-center w-full">
										{#if quiz.status === 'draft'}
											<Download class="size-4 mr-2" />
											Activate
										{:else}
											<Download class="size-4 mr-2" />
											Deactivate
										{/if}
									</button>
								</form>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								variant="destructive"
								onSelect={() => handleDeleteClick(quiz)}
							>
								<Trash2 class="size-4 mr-2" />
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
				Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone.
				All questions and attempts for this quiz will be permanently deleted.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (quizToDelete = null)}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={quizToDelete?.id} />
					<button type="submit" class="w-full">Delete</button>
				</form>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
