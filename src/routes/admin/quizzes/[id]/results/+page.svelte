<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { DataTable } from '$lib/components/ui/data-table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import AttemptDetailSheet from '$lib/components/admin/AttemptDetailSheet.svelte';
	import {
		ArrowLeft,
		Search,
		Download,
		FileText,
		FileJson,
		Trash2,
		Users,
		TrendingUp,
		Trophy,
		TrendingDown,
		Eye
	} from 'lucide-svelte';
	import { attemptsToCsv, attemptsToJson } from '$lib/results-format';

	let { data, form } = $props();

	type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'fitb';

	interface AttemptSummary {
		id: string;
		quizId: string;
		participantName: string;
		participantEmail: string;
		intakeFormData: unknown;
		answers: unknown;
		score: number;
		totalQuestions: number;
		timeTakenSeconds: number;
		submittedAt: Date | string;
		percentage?: number;
	}

	interface QuizQuestion {
		id: string;
		type: QuestionType;
		text: string;
		options: unknown;
		correctAnswer: unknown;
		explanation: string | null;
		orderIndex: number;
	}

	let searchQuery = $state('');
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc' | null>(null);
	let currentPage = $state(1);
	let pageSize = $state(10);

	let selectedIds = $state<Set<string>>(new Set());
	let bulkDeleteOpen = $state(false);

	let detailOpen = $state(false);
	let activeAttempt = $state<AttemptSummary | null>(null);

	const revealAnswers = $derived(data.quiz.revealAnswersAfter === 'immediate');

	const metrics = $derived([
		{
			label: 'Total Attempts',
			value: data.metrics.totalAttempts,
			icon: Users
		},
		{
			label: 'Average Score',
			value: data.metrics.averageScore,
			icon: TrendingUp
		},
		{
			label: 'Highest Score',
			value: data.metrics.highestScore,
			icon: Trophy
		},
		{
			label: 'Lowest Score',
			value: data.metrics.lowestScore,
			icon: TrendingDown
		}
	]);

	let filteredAttempts = $derived(
		data.attempts
			.filter((a) => {
				const q = searchQuery.toLowerCase();
				if (!q) return true;
				return (
					a.participantName.toLowerCase().includes(q) ||
					a.participantEmail.toLowerCase().includes(q)
				);
			})
			.map((a) => ({
				...a,
				percentage: percentage(a.score, a.totalQuestions)
			}))
	);

	let columns = [
		{ id: 'select', header: '', class: 'w-10', headerClass: 'w-10' },
		{ id: 'participantName', header: 'Participant', sortable: true },
		{ id: 'score', header: 'Score', sortable: true, class: 'w-24' },
		{ id: 'percentage', header: 'Percentage', sortable: true, class: 'w-28' },
		{ id: 'timeTakenSeconds', header: 'Time Taken', sortable: true, class: 'w-28' },
		{ id: 'submittedAt', header: 'Submitted', sortable: true, class: 'w-36' },
		{ id: 'actions', header: '', class: 'w-16 text-right', headerClass: 'text-right' }
	];

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
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

	function percentage(score: number, total: number): number {
		return total > 0 ? Math.round((score / total) * 100) : 0;
	}

	function scoreVariant(pct: number): 'default' | 'secondary' | 'destructive' {
		if (pct >= 80) return 'default';
		if (pct >= 50) return 'secondary';
		return 'destructive';
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function openDetail(attempt: AttemptSummary) {
		activeAttempt = attempt;
		detailOpen = true;
	}

	function buildDetail(attempt: AttemptSummary) {
		const questions = (data.quiz.questions ?? []) as QuizQuestion[];
		return {
			...attempt,
			questions: questions.map((q) => ({
				id: q.id,
				type: q.type,
				text: q.text,
				options: Array.isArray(q.options)
					? (q.options as { id?: string; text: string; isCorrect: boolean }[])
					: null,
				correctAnswer: q.correctAnswer,
				explanation: q.explanation,
				orderIndex: q.orderIndex
			}))
		};
	}

	function downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function exportCsv() {
		const csv = attemptsToCsv(filteredAttempts);
		const slug = data.quiz.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
		downloadFile(csv, `results-${slug}.csv`, 'text/csv;charset=utf-8;');
	}

	function exportJson() {
		const json = attemptsToJson(filteredAttempts);
		const slug = data.quiz.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
		downloadFile(json, `results-${slug}.json`, 'application/json');
	}

	function handleBulkDeleteClick() {
		if (selectedIds.size === 0) return;
		bulkDeleteOpen = true;
	}
</script>

<PageHeader title="Results" description="{data.quiz.title} — participant attempts and scores">
	<Button href="/admin/quizzes/{data.quiz.id}/edit" variant="outline">
		<ArrowLeft class="size-4 mr-2" />
		Back to Quiz
	</Button>
</PageHeader>

{#if form?.error}
	<div class="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
		{form.error}
	</div>
{/if}

{#if form?.success}
	<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
		{form.success}
	</div>
{/if}

<!-- Metrics bar (6.6.3) -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
	{#each metrics as metric}
		<Card class="transition-shadow duration-200 hover:shadow-md">
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							{metric.label}
						</p>
						<p class="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
					</div>
					<div class="rounded-lg bg-muted p-2">
						<metric.icon class="h-5 w-5 text-muted-foreground" />
					</div>
				</div>
			</CardContent>
		</Card>
	{/each}
</div>

<!-- Toolbar (6.6.2) + Export (6.6.4) -->
<div class="flex flex-wrap items-center gap-3 mb-6">
	<div class="relative flex-1 min-w-[200px] max-w-sm">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Search participants..."
			class="pl-9"
			bind:value={searchQuery}
			oninput={() => {
				currentPage = 1;
			}}
		/>
	</div>

	<div class="ml-auto flex items-center gap-2">
		{#if selectedIds.size > 0}
			<Button variant="destructive" size="sm" onclick={handleBulkDeleteClick}>
				<Trash2 class="size-4 mr-2" />
				Delete {selectedIds.size} selected
			</Button>
		{/if}

		<!-- Export dropdown (6.6.4) -->
		<DropdownMenu.DropdownMenu>
			<DropdownMenu.Trigger>
				<Button variant="outline" size="sm" class="cursor-pointer">
					<Download class="size-4 mr-2" />
					Export
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Item onSelect={exportCsv} disabled={filteredAttempts.length === 0}>
					<FileText class="size-4 mr-2" />
					Export as CSV
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={exportJson} disabled={filteredAttempts.length === 0}>
					<FileJson class="size-4 mr-2" />
					Export as JSON
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.DropdownMenu>
	</div>
</div>

{#if filteredAttempts.length === 0}
	<EmptyState
		title={searchQuery ? 'No attempts match your search' : 'No attempts yet'}
		description={searchQuery
			? 'Try adjusting your search criteria.'
			: 'Participant submissions will appear here once the quiz is taken.'}
	/>
{:else}
	<DataTable
		{columns}
		data={filteredAttempts}
		bind:sortColumn
		bind:sortDirection
		bind:pageSize
		bind:currentPage
	>
		{#snippet cell({ row: attempt, column })}
			{#if column.id === 'select'}
				<input
					type="checkbox"
					class="size-4 cursor-pointer rounded border-border text-primary focus:ring-ring"
					checked={selectedIds.has(attempt.id)}
					onchange={() => toggleSelect(attempt.id)}
					aria-label="Select attempt"
					onclick={(e) => e.stopPropagation()}
				/>
			{:else if column.id === 'participantName'}
				<button
					type="button"
					class="text-left cursor-pointer hover:text-primary transition-colors"
					onclick={() => openDetail(attempt)}
				>
					<div class="font-medium text-foreground">{attempt.participantName}</div>
					{#if attempt.participantEmail}
						<div class="text-muted-foreground text-xs truncate max-w-xs">
							{attempt.participantEmail}
						</div>
					{/if}
				</button>
			{:else if column.id === 'score'}
				<span class="font-mono text-sm">{attempt.score}/{attempt.totalQuestions}</span>
			{:else if column.id === 'percentage'}
				<Badge variant={scoreVariant(attempt.percentage)}>{attempt.percentage}%</Badge>
			{:else if column.id === 'timeTakenSeconds'}
				{formatTime(attempt.timeTakenSeconds)}
			{:else if column.id === 'submittedAt'}
				{formatDate(attempt.submittedAt)}
			{:else if column.id === 'actions'}
				<div class="flex justify-end">
					<Button
						variant="ghost"
						size="icon-sm"
						class="cursor-pointer"
						onclick={() => openDetail(attempt)}
						aria-label="View attempt details"
					>
						<Eye class="size-4" />
					</Button>
				</div>
			{/if}
		{/snippet}
	</DataTable>
{/if}

<!-- Bulk delete confirmation (6.6.6) -->
<AlertDialog.Root bind:open={bulkDeleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Selected Attempts</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete {selectedIds.size} selected attempt(s)?
				This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action>
				<form
					method="POST"
					action="?/bulkDelete"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								selectedIds = new Set();
								await invalidateAll();
							}
						};
					}}
				>
					{#each [...selectedIds] as id}
						<input type="hidden" name="ids" value={id} />
					{/each}
					<button type="submit" class="w-full">Delete</button>
				</form>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Attempt detail sheet (6.6.5) -->
<AttemptDetailSheet bind:open={detailOpen} attempt={activeAttempt ? buildDetail(activeAttempt) : null} {revealAnswers} />
