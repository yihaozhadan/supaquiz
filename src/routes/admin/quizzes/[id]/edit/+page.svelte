<script lang="ts">
	import { flushSync } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		CardDescription
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import QuestionEditorSheet from '$lib/components/admin/QuestionEditorSheet.svelte';
	import { toasts } from '$lib/components/admin/toast';
	import { getEffectiveStatus, validateSchedule, QUIZ_STATUS_LABELS } from '$lib/quiz-status';
	import { MAX_QUESTIONS_PER_QUIZ, MAX_QUESTION_GROUPS_PER_QUIZ } from '$lib/constants';
	import {
		ArrowLeft,
		Plus,
		Trash2,
		ChevronUp,
		ChevronDown,
		Save,
		X,
		Rocket,
		AlertTriangle,
		ListChecks,
		Settings,
		FileInput,
		GripVertical,
		Pencil,
		Eye,
		ChevronRight,
		Folder,
		FolderOpen
	} from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.error) toasts.error(form.error);
		if (form?.success) toasts.success(form?.message ?? 'Saved successfully');
	});

	$effect(() => {
		if (page.url.searchParams.get('imported') === '1') {
			const warningCount = Number(page.url.searchParams.get('warnings') || 0);
			toasts.success(
				warningCount > 0
					? `Quiz imported with ${warningCount} warning(s) — some media files were missing`
					: 'Quiz imported successfully'
			);
		}
	});

	const quiz = $derived(data.quiz);

	const groupQuestionCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const q of quiz.questions) {
			if (q.groupId) counts[q.groupId] = (counts[q.groupId] ?? 0) + 1;
		}
		return counts;
	});

	type QuizQuestion = (typeof quiz.questions)[number];
	type QuizGroup = NonNullable<typeof quiz.groups>[number];
	type TreeItem =
		| { type: 'group'; group: QuizGroup; questions: QuizQuestion[] }
		| { type: 'question'; question: QuizQuestion };

	// File-explorer style tree: a group renders where its first member sits in
	// the flat question order; empty groups collect at the end so they stay
	// reachable as drop targets.
	function buildQuestionTree(questions: QuizQuestion[], groups: QuizGroup[]): TreeItem[] {
		const items: TreeItem[] = [];
		const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));
		const itemByGroupId: Record<string, Extract<TreeItem, { type: 'group' }>> = {};
		for (const q of questions) {
			const group = q.groupId ? groupById[q.groupId] : undefined;
			if (!group) {
				items.push({ type: 'question', question: q });
				continue;
			}
			let item = itemByGroupId[group.id];
			if (!item) {
				item = { type: 'group', group, questions: [] };
				itemByGroupId[group.id] = item;
				items.push(item);
			}
			item.questions.push(q);
		}
		for (const g of groups) {
			if (!itemByGroupId[g.id]) items.push({ type: 'group', group: g, questions: [] });
		}
		return items;
	}

	// Writable derived: the tree recomputes when server data reloads, but local
	// reassignment (drag-and-drop) overrides it until the next reload.
	let questionTree = $derived.by(() => buildQuestionTree(quiz.questions, quiz.groups ?? []));

	// Every visible question slot, top to bottom, ignoring group headers.
	const flatQuestionSlots = $derived.by(() => {
		const slots: { id: string; itemIndex: number; memberIndex: number | null }[] = [];
		questionTree.forEach((item, i) => {
			if (item.type === 'question') {
				slots.push({ id: item.question.id, itemIndex: i, memberIndex: null });
			} else {
				item.questions.forEach((q, j) => slots.push({ id: q.id, itemIndex: i, memberIndex: j }));
			}
		});
		return slots;
	});
	const flatIndexById = $derived<Record<string, number>>(
		Object.fromEntries(flatQuestionSlots.map((s, i) => [s.id, i]))
	);

	const collapsedGroups = new SvelteSet<string>();

	function toggleGroupCollapsed(groupId: string) {
		if (collapsedGroups.has(groupId)) collapsedGroups.delete(groupId);
		else collapsedGroups.add(groupId);
	}

	type DropLocation =
		{ kind: 'root'; index: number } | { kind: 'group'; itemIndex: number; memberIndex: number };

	let draggingQuestionId = $state<string | null>(null);
	let dropLocation = $state<DropLocation | null>(null);
	let questionTreeEl = $state<HTMLDivElement | null>(null);

	function locateQuestion(id: string): { itemIndex: number; memberIndex: number | null } | null {
		for (let i = 0; i < questionTree.length; i++) {
			const item = questionTree[i];
			if (item.type === 'question') {
				if (item.question.id === id) return { itemIndex: i, memberIndex: null };
			} else {
				const memberIndex = item.questions.findIndex((q) => q.id === id);
				if (memberIndex !== -1) return { itemIndex: i, memberIndex };
			}
		}
		return null;
	}

	// Moves a question to a drop location in the tree. A root location inserts
	// an ungrouped entry; a group location inserts among that group's members.
	function moveQuestionTo(id: string, loc: DropLocation) {
		const src = locateQuestion(id);
		if (!src) return;

		// Clone the tree shallowly so reassignment is the only state update.
		const tree = questionTree.map((item) =>
			item.type === 'group' ? { ...item, questions: [...item.questions] } : { ...item }
		);

		let moved: QuizQuestion;
		if (src.memberIndex == null) {
			const item = tree[src.itemIndex];
			if (item.type !== 'question') return;
			moved = item.question;
			tree.splice(src.itemIndex, 1);
		} else {
			const item = tree[src.itemIndex];
			if (item.type !== 'group') return;
			moved = item.questions.splice(src.memberIndex, 1)[0];
		}

		if (loc.kind === 'root') {
			let index = loc.index;
			if (src.memberIndex == null && src.itemIndex < index) index--;
			tree.splice(index, 0, { type: 'question', question: moved });
		} else {
			let itemIndex = loc.itemIndex;
			if (src.memberIndex == null && src.itemIndex < itemIndex) itemIndex--;
			const target = tree[itemIndex];
			if (!target || target.type !== 'group') return;
			let memberIndex = loc.memberIndex;
			if (src.memberIndex != null && src.itemIndex === itemIndex && src.memberIndex < memberIndex) {
				memberIndex--;
			}
			target.questions.splice(memberIndex, 0, moved);
		}

		questionTree = tree;
	}

	// Chevron buttons move a question one visible slot up/down within its own
	// container — group members stay in their group, ungrouped questions at root.
	function moveQuestionInTree(id: string, direction: 'up' | 'down') {
		const index = flatIndexById[id];
		if (index == null) return;
		const target = flatQuestionSlots[direction === 'up' ? index - 1 : index + 1];
		const src = flatQuestionSlots[index];
		if (!target || !src || (src.memberIndex == null) !== (target.memberIndex == null)) return;
		const offset = direction === 'down' ? 1 : 0;
		moveQuestionTo(
			id,
			target.memberIndex == null
				? { kind: 'root', index: target.itemIndex + offset }
				: {
						kind: 'group',
						itemIndex: target.itemIndex,
						memberIndex: target.memberIndex + offset
					}
		);
		persistQuestionOrder();
	}

	let persistOrderChain: Promise<void> = Promise.resolve();

	// Serializes order writes so rapid drags can't interleave server-side.
	function persistQuestionOrder() {
		const payload: { id: string; groupId: string | null }[] = [];
		for (const item of questionTree) {
			if (item.type === 'question') {
				payload.push({ id: item.question.id, groupId: null });
			} else {
				for (const q of item.questions) payload.push({ id: q.id, groupId: item.group.id });
			}
		}
		persistOrderChain = persistOrderChain.then(() => sendQuestionOrder(payload));
	}

	async function sendQuestionOrder(payload: { id: string; groupId: string | null }[]) {
		try {
			const body = new FormData();
			body.set('quizId', quiz.id);
			body.set('items', JSON.stringify(payload));
			const res = await fetch('?/reorderQuestions', {
				method: 'POST',
				headers: { 'x-sveltekit-action': 'true' },
				body
			});
			const result = await res.json().catch(() => null);
			if (!res.ok || result?.type === 'failure') {
				toasts.error(result?.data?.error ?? 'Failed to save question order');
			}
			await invalidateAll();
		} catch {
			toasts.error('Failed to save question order');
		}
	}

	function handleQuestionDragStart(e: DragEvent, id: string) {
		e.dataTransfer?.setData('text/plain', id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
		draggingQuestionId = id;
	}

	function handleQuestionDragOver(e: DragEvent, itemIndex: number, memberIndex: number | null) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientY < rect.top + rect.height / 2;
		if (memberIndex == null) {
			dropLocation = { kind: 'root', index: itemIndex + (before ? 0 : 1) };
		} else {
			dropLocation = { kind: 'group', itemIndex, memberIndex: memberIndex + (before ? 0 : 1) };
		}
	}

	function handleGroupDragOver(e: DragEvent, itemIndex: number, memberCount: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropLocation = { kind: 'group', itemIndex, memberIndex: memberCount };
	}

	function handleEdgeDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropLocation = { kind: 'root', index };
	}

	function handleQuestionDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		const id = e.dataTransfer?.getData('text/plain') ?? draggingQuestionId;
		if (id && dropLocation) {
			moveQuestionTo(id, dropLocation);
			persistQuestionOrder();
		}
		clearDragState();
	}

	function handleTreeDragLeave(e: DragEvent) {
		if (!questionTreeEl?.contains(e.relatedTarget as Node)) dropLocation = null;
	}

	function clearDragState() {
		draggingQuestionId = null;
		dropLocation = null;
	}

	const isRootDropAt = (index: number) =>
		dropLocation?.kind === 'root' && dropLocation.index === index;
	const isGroupDropAt = (itemIndex: number, memberIndex: number) =>
		dropLocation?.kind === 'group' &&
		dropLocation.itemIndex === itemIndex &&
		dropLocation.memberIndex === memberIndex;

	let title = $state(quiz.title);
	let description = $state(quiz.description);
	let password = $state(quiz.password || '');
	let timeLimitMinutes = $state(
		quiz.timeLimitSeconds != null
			? String(Math.round((quiz.timeLimitSeconds / 60) * 100) / 100)
			: ''
	);
	const timeLimitSecondsValue = $derived(
		timeLimitMinutes !== '' && Number.isFinite(Number(timeLimitMinutes))
			? String(Math.round(Number(timeLimitMinutes) * 60))
			: ''
	);
	let maxAttempts = $state(quiz.maxAttempts?.toString() || '1');
	let unlimitedAttempts = $state(quiz.maxAttempts == null);
	let maxParticipants = $state(quiz.maxParticipants?.toString() || '');
	let questionsPerAttempt = $state(quiz.questionsPerAttempt?.toString() || '');
	let shuffleQuestions = $state(quiz.shuffleQuestions);
	let allowBackNavigation = $state(quiz.allowBackNavigation);
	let isVisibleAfterExpiry = $state(quiz.isVisibleAfterExpiry ?? true);
	let questionDisplayMode = $state(quiz.questionDisplayMode);
	let revealAnswersAfter = $state(quiz.revealAnswersAfter);
	// datetime-local inputs work in local time; toISOString() would show UTC.
	function toLocalInputValue(value: Date | string | null): string {
		if (!value) return '';
		const d = new Date(value);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
	let activateAt = $state(toLocalInputValue(quiz.activateAt));
	let expireAt = $state(toLocalInputValue(quiz.expireAt));

	const scheduleError = $derived(validateSchedule(activateAt || null, expireAt || null));

	// Live preview of the lifecycle status the current form values produce.
	const effectiveStatus = $derived(
		getEffectiveStatus({ status: quiz.status, activateAt, expireAt })
	);

	// Status the quiz would have if published with the current schedule.
	const publishStatus = $derived(getEffectiveStatus({ status: 'active', activateAt, expireAt }));

	const statusBadgeConfig: Record<
		string,
		{ variant: 'default' | 'secondary' | 'destructive' | 'outline'; class?: string }
	> = {
		draft: { variant: 'secondary' },
		scheduled: {
			variant: 'outline',
			class:
				'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300'
		},
		active: { variant: 'default' },
		expired: { variant: 'destructive' },
		archived: { variant: 'outline', class: 'text-muted-foreground' }
	};

	const scheduleHint = $derived.by(() => {
		if (quiz.status === 'draft') {
			return activateAt || expireAt
				? 'The activation window applies once the quiz is published.'
				: null;
		}
		if (quiz.status === 'archived') return null;
		if (effectiveStatus === 'scheduled' && activateAt) {
			return `Scheduled — the quiz becomes active on ${new Date(activateAt).toLocaleString()}.`;
		}
		if (effectiveStatus === 'expired') {
			return 'This window has passed — the quiz is expired and view-only for the public.';
		}
		if (activateAt && expireAt) {
			return `Active from ${new Date(activateAt).toLocaleString()} until ${new Date(
				expireAt
			).toLocaleString()}.`;
		}
		if (expireAt) return `Active until ${new Date(expireAt).toLocaleString()}.`;
		if (activateAt) return `Active since ${new Date(activateAt).toLocaleString()}.`;
		return null;
	});

	interface IntakeField {
		name: string;
		type: 'text' | 'email' | 'number' | 'select';
		required: boolean;
	}

	let intakeFields = $state<IntakeField[]>([]);

	$effect(() => {
		const parsed =
			typeof quiz.intakeFormSchema === 'string'
				? JSON.parse(quiz.intakeFormSchema)
				: quiz.intakeFormSchema;
		intakeFields = Array.isArray(parsed) ? parsed : [];
	});

	let activeTab = $state('details');
	let hasUnsavedChanges = $state(false);
	let isSaving = $state(false);
	let lastSavedAt = $state<Date | null>(null);
	let deleteDialogOpen = $state(false);
	let questionToDelete = $state<{ id: string; text: string } | null>(null);

	// Question editor sheet state
	interface EditingQuestion {
		id?: string;
		type: QuizQuestion['type'];
		text: string;
		explanation: string;
		codeSnippet: string;
		mediaUrl: string | null;
		options: { id: string; text: string; isCorrect: boolean }[];
		correctAnswer?: string | string[];
		orderIndex: number;
		groupId: string | null;
	}

	let questionSheetOpen = $state(false);
	let editingQuestion = $state<EditingQuestion | null>(null);

	function openAddQuestion() {
		editingQuestion = null;
		questionSheetOpen = true;
	}

	function openEditQuestion(q: QuizQuestion) {
		editingQuestion = {
			id: q.id,
			type: q.type,
			text: q.text,
			explanation: q.explanation || '',
			codeSnippet: q.codeSnippet || '',
			mediaUrl: q.mediaUrl || null,
			options: q.options
				? (Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)).map(
						(o: { id?: string; text: string; isCorrect: boolean }) => ({
							id: o.id || crypto.randomUUID(),
							text: o.text,
							isCorrect: o.isCorrect
						})
					)
				: [],
			correctAnswer: q.correctAnswer as string | string[],
			orderIndex: q.orderIndex,
			groupId: q.groupId ?? null
		};
		questionSheetOpen = true;
	}

	function markChanged() {
		hasUnsavedChanges = true;
	}

	function addIntakeField() {
		intakeFields = [...intakeFields, { name: '', type: 'text', required: false }];
		markChanged();
	}

	function removeIntakeField(index: number) {
		intakeFields = intakeFields.filter((_, i) => i !== index);
		markChanged();
	}

	function moveIntakeField(index: number, direction: 'up' | 'down') {
		if (direction === 'up' && index > 0) {
			const fields = [...intakeFields];
			[fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
			intakeFields = fields;
		} else if (direction === 'down' && index < intakeFields.length - 1) {
			const fields = [...intakeFields];
			[fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
			intakeFields = fields;
		}
		markChanged();
	}

	const intakeFormJson = $derived(JSON.stringify(intakeFields));

	const questionTypeConfig: Record<
		string,
		{ label: string; variant: 'default' | 'secondary' | 'outline' }
	> = {
		mcq_single: { label: 'Single Choice', variant: 'default' },
		mcq_multi: { label: 'Multiple Choice', variant: 'secondary' },
		true_false: { label: 'True/False', variant: 'outline' },
		fitb: { label: 'Fill in the Blank', variant: 'default' }
	};

	function handleDeleteClick(q: { id: string; text: string }) {
		questionToDelete = q;
		deleteDialogOpen = true;
	}

	let mainForm = $state<HTMLFormElement | null>(null);

	const fieldToTab: Record<string, string> = {
		title: 'details',
		description: 'details',
		timeLimitMinutes: 'settings',
		maxAttempts: 'settings',
		maxParticipants: 'settings',
		activateAt: 'settings',
		expireAt: 'settings'
	};

	function revealInvalidField(e: Event) {
		const name = (e.target as HTMLInputElement).name;
		const tab = fieldToTab[name];
		if (tab && tab !== activeTab) {
			flushSync(() => (activeTab = tab));
		}
	}

	$effect(() => {
		if (!hasUnsavedChanges) return;
		const interval = setInterval(() => {
			if (hasUnsavedChanges && !isSaving && mainForm) {
				mainForm.requestSubmit();
			}
		}, 60000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (!hasUnsavedChanges) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});

	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges) {
			if (!confirm('You have unsaved changes. Leave anyway?')) {
				cancel();
			}
		}
	});
</script>

<PageHeader title="Edit Quiz" description={quiz.title}>
	<Badge
		variant={statusBadgeConfig[effectiveStatus]?.variant}
		class={statusBadgeConfig[effectiveStatus]?.class}
	>
		{QUIZ_STATUS_LABELS[effectiveStatus]}
	</Badge>
	<Button href="/quiz/{quiz.id}?preview=1" target="_blank" variant="outline" size="sm">
		<Eye class="size-4" />
		Preview
	</Button>
	<Button href="/admin/quizzes" variant="outline" size="sm">
		<ArrowLeft class="size-4" />
		Back
	</Button>
</PageHeader>

{#if hasUnsavedChanges}
	<div
		class="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
	>
		<AlertTriangle class="size-4 shrink-0" />
		<span>You have unsaved changes.</span>
		{#if lastSavedAt}
			<span class="text-muted-foreground">Last saved: {lastSavedAt.toLocaleTimeString()}</span>
		{/if}
	</div>
{/if}

<form
	bind:this={mainForm}
	method="POST"
	action="?/update"
	oninvalidcapture={revealInvalidField}
	use:enhance={({ cancel }) => {
		if (scheduleError) {
			toasts.error(scheduleError);
			cancel();
			return;
		}
		isSaving = true;
		return async ({ update }) => {
			await update();
			isSaving = false;
			hasUnsavedChanges = false;
			lastSavedAt = new Date();
		};
	}}
>
	<input type="hidden" name="id" value={quiz.id} />
	<input type="hidden" name="intakeFormSchema" value={intakeFormJson} />
	<input type="hidden" name="shuffleQuestions" value={shuffleQuestions ? 'on' : ''} />
	<input type="hidden" name="allowBackNavigation" value={allowBackNavigation ? 'on' : ''} />
	<input type="hidden" name="isVisibleAfterExpiry" value={isVisibleAfterExpiry ? 'on' : ''} />

	<Tabs.Root bind:value={activeTab} class="gap-4">
		<Tabs.List>
			<Tabs.Trigger value="details">Details</Tabs.Trigger>
			<Tabs.Trigger value="questions">
				<ListChecks class="size-4" />
				Questions
			</Tabs.Trigger>
			<Tabs.Trigger value="intake">
				<FileInput class="size-4" />
				Intake Form
			</Tabs.Trigger>
			<Tabs.Trigger value="settings">
				<Settings class="size-4" />
				Settings
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Details Tab -->
		<Tabs.Content value="details">
			<Card>
				<CardHeader>
					<CardTitle>Basic Information</CardTitle>
					<CardDescription>Basic details about your quiz.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<label for="title" class="text-sm font-medium text-foreground">Title</label>
						<Input
							type="text"
							name="title"
							id="title"
							bind:value={title}
							required
							oninput={markChanged}
						/>
					</div>

					<div class="space-y-2">
						<label for="description" class="text-sm font-medium text-foreground">Description</label>
						<Textarea
							name="description"
							id="description"
							rows={3}
							bind:value={description}
							required
							oninput={markChanged}
						/>
					</div>

					<div class="space-y-2">
						<label for="password" class="text-sm font-medium text-foreground"
							>Password (optional)</label
						>
						<Input
							type="text"
							name="password"
							id="password"
							bind:value={password}
							oninput={markChanged}
							placeholder="Leave empty for no password"
						/>
					</div>
				</CardContent>
			</Card>
		</Tabs.Content>

		<!-- Questions Tab -->
		<Tabs.Content value="questions">
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Questions</CardTitle>
							<CardDescription>Add and reorder questions for this quiz.</CardDescription>
						</div>
						<Badge variant="secondary" class="font-mono">
							{quiz.questions.length} / {MAX_QUESTIONS_PER_QUIZ}
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					{#if quiz.questions.length === 0}
						<EmptyState
							title="No questions yet"
							description="Add your first question to get started."
							actionLabel="Add Question"
						>
							<Button onclick={openAddQuestion} variant="default">
								<Plus class="size-4" />
								Add Question
							</Button>
						</EmptyState>
					{:else}
						<div
							class="space-y-2"
							role="list"
							bind:this={questionTreeEl}
							ondragleave={handleTreeDragLeave}
						>
							{#if draggingQuestionId}
								<div
									role="region"
									aria-label="Move question to the top"
									class="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-center text-xs text-primary"
									ondragover={(e) => handleEdgeDragOver(e, 0)}
									ondrop={handleQuestionDrop}
								>
									Drop here to move to the top
								</div>
							{/if}
							{#each questionTree as item, i (item.type === 'group' ? `g-${item.group.id}` : item.question.id)}
								{#if isRootDropAt(i)}
									<div class="pointer-events-none h-0.5 rounded-full bg-primary"></div>
								{/if}
								{#if item.type === 'question'}
									{@render questionRow(item.question, i, null, null)}
								{:else}
									{@render groupSection(item, i)}
								{/if}
							{/each}
							{#if isRootDropAt(questionTree.length)}
								<div class="pointer-events-none h-0.5 rounded-full bg-primary"></div>
							{/if}
							{#if draggingQuestionId}
								<div
									role="region"
									aria-label="Ungroup question and move to the end"
									class="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-center text-xs text-primary"
									ondragover={(e) => handleEdgeDragOver(e, questionTree.length)}
									ondrop={handleQuestionDrop}
								>
									Drop here to ungroup / move to the end
								</div>
							{/if}
						</div>
						<Separator class="my-4" />
						<Button
							onclick={openAddQuestion}
							variant="outline"
							class="w-full"
							disabled={quiz.questions.length >= MAX_QUESTIONS_PER_QUIZ}
						>
							<Plus class="size-4" />
							Add Question
						</Button>
					{/if}
				</CardContent>
			</Card>

			<!-- Question Groups Card -->
			<Card class="mt-4">
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Question Groups</CardTitle>
							<CardDescription>
								Organize questions into sections. Set a pick count to serve a random subset from a
								group each attempt — ungrouped questions are always served.
							</CardDescription>
						</div>
						<Badge variant="secondary" class="font-mono">
							{quiz.groups?.length ?? 0} / {MAX_QUESTION_GROUPS_PER_QUIZ}
						</Badge>
					</div>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each quiz.groups ?? [] as group (group.id)}
						<form
							method="POST"
							action="?/updateGroup"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
								};
							}}
							class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3"
						>
							<input type="hidden" name="id" value={group.id} />
							<Input
								type="text"
								name="name"
								value={group.name}
								required
								class="min-w-40 flex-1"
								aria-label="Group name"
							/>
							<div class="flex items-center gap-1.5">
								<Input
									type="number"
									name="pickCount"
									min="1"
									max={groupQuestionCounts[group.id] ?? undefined}
									value={group.pickCount ?? ''}
									placeholder="All"
									class="w-20"
									aria-label="Questions picked per attempt"
								/>
								<span class="text-xs whitespace-nowrap text-muted-foreground">
									of {groupQuestionCounts[group.id] ?? 0} picked
								</span>
							</div>
							<div class="ml-auto flex items-center gap-1">
								<Button type="submit" variant="ghost" size="sm">Save</Button>
								<Button
									type="submit"
									formaction="?/deleteGroup"
									variant="ghost"
									size="icon-sm"
									onclick={(e) => {
										if (!confirm('Delete this group? Its questions will become ungrouped.')) {
											e.preventDefault();
										}
									}}
								>
									<Trash2 class="size-4 text-destructive" />
									<span class="sr-only">Delete group</span>
								</Button>
							</div>
						</form>
					{:else}
						<p class="text-sm text-muted-foreground">
							No groups yet. Create one to organize questions or serve random subsets.
						</p>
					{/each}
					<Separator />
					<form
						method="POST"
						action="?/createGroup"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
						class="flex flex-wrap items-center gap-2"
					>
						<input type="hidden" name="quizId" value={quiz.id} />
						<Input
							type="text"
							name="name"
							placeholder="New group name (e.g. Geography)"
							required
							class="min-w-40 flex-1"
							aria-label="New group name"
						/>
						<Input
							type="number"
							name="pickCount"
							min="1"
							placeholder="Pick all"
							class="w-28"
							aria-label="Questions picked per attempt"
						/>
						<Button
							type="submit"
							variant="outline"
							size="sm"
							disabled={(quiz.groups?.length ?? 0) >= MAX_QUESTION_GROUPS_PER_QUIZ}
						>
							<Plus class="size-4" />
							Add Group
						</Button>
					</form>
					{#if (quiz.groups?.length ?? 0) >= MAX_QUESTION_GROUPS_PER_QUIZ}
						<p class="text-xs text-muted-foreground">
							Group limit reached — a quiz can have at most {MAX_QUESTION_GROUPS_PER_QUIZ} groups.
						</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						Pick count: randomly serve that many of the group's questions per attempt. Leave empty
						to serve every question in the group.
					</p>
				</CardContent>
			</Card>
		</Tabs.Content>

		<!-- Intake Form Tab -->
		<Tabs.Content value="intake">
			<Card>
				<CardHeader>
					<CardTitle>Intake Form</CardTitle>
					<CardDescription
						>Fields to collect from participants before starting the quiz.</CardDescription
					>
				</CardHeader>
				<CardContent>
					{#if intakeFields.length === 0}
						<EmptyState
							title="No intake fields"
							description="Add fields to collect participant information before the quiz."
						/>
					{:else}
						<div class="space-y-3">
							{#each intakeFields as field, index (index)}
								<div class="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
									<div class="flex flex-col gap-1">
										<button
											type="button"
											disabled={index === 0}
											onclick={() => moveIntakeField(index, 'up')}
											class="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
										>
											<ChevronUp class="size-4" />
										</button>
										<button
											type="button"
											disabled={index === intakeFields.length - 1}
											onclick={() => moveIntakeField(index, 'down')}
											class="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
										>
											<ChevronDown class="size-4" />
										</button>
									</div>

									<div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
										<div class="space-y-1.5">
											<label class="text-xs font-medium text-muted-foreground">Field Name</label>
											<Input
												type="text"
												value={field.name}
												placeholder="e.g. Full Name"
												oninput={(e) => {
													intakeFields[index].name = (e.currentTarget as HTMLInputElement).value;
													intakeFields = [...intakeFields];
													markChanged();
												}}
											/>
										</div>
										<div class="space-y-1.5">
											<label class="text-xs font-medium text-muted-foreground">Type</label>
											<Select.Root
												type="single"
												value={field.type}
												onValueChange={(v: string) => {
													intakeFields[index].type = v as IntakeField['type'];
													intakeFields = [...intakeFields];
													markChanged();
												}}
											>
												<Select.Trigger class="w-full">
													{field.type === 'text'
														? 'Text'
														: field.type === 'email'
															? 'Email'
															: field.type === 'number'
																? 'Number'
																: 'Select'}
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="text">Text</Select.Item>
													<Select.Item value="email">Email</Select.Item>
													<Select.Item value="number">Number</Select.Item>
													<Select.Item value="select">Select</Select.Item>
												</Select.Content>
											</Select.Root>
										</div>
										<div class="flex items-center gap-2 pt-6">
											<Switch
												checked={field.required}
												onCheckedChange={(v: boolean) => {
													intakeFields[index].required = v;
													intakeFields = [...intakeFields];
													markChanged();
												}}
											/>
											<label class="text-sm text-foreground">Required</label>
										</div>
									</div>

									<Button variant="ghost" size="icon-sm" onclick={() => removeIntakeField(index)}>
										<Trash2 class="size-4 text-destructive" />
										<span class="sr-only">Remove field</span>
									</Button>
								</div>
							{/each}
						</div>
						<Separator class="my-4" />
					{/if}
					<Button variant="outline" onclick={addIntakeField} class="w-full">
						<Plus class="size-4" />
						Add Field
					</Button>
				</CardContent>
			</Card>
		</Tabs.Content>

		<!-- Settings Tab -->
		<Tabs.Content value="settings">
			<Card>
				<CardHeader>
					<CardTitle>Quiz Settings</CardTitle>
					<CardDescription>Configure how the quiz behaves.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-5">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<label for="timeLimitMinutes" class="text-sm font-medium text-foreground"
								>Time Limit (minutes)</label
							>
							<Input
								type="number"
								name="timeLimitMinutes"
								id="timeLimitMinutes"
								bind:value={timeLimitMinutes}
								min="0"
								step="any"
								placeholder="No limit"
								oninput={markChanged}
							/>
							<input type="hidden" name="timeLimitSeconds" value={timeLimitSecondsValue} />
						</div>
						<div class="space-y-2">
							<label for="maxAttempts" class="text-sm font-medium text-foreground"
								>Max Attempts</label
							>
							<Input
								type="number"
								name="maxAttempts"
								id="maxAttempts"
								bind:value={maxAttempts}
								min="1"
								required
								disabled={unlimitedAttempts}
								placeholder={unlimitedAttempts ? 'Unlimited' : ''}
								oninput={markChanged}
							/>
							{#if unlimitedAttempts}
								<input type="hidden" name="maxAttempts" value="" />
							{/if}
						</div>
						<div class="space-y-2">
							<label for="maxParticipants" class="text-sm font-medium text-foreground"
								>Max Participants</label
							>
							<Input
								type="number"
								name="maxParticipants"
								id="maxParticipants"
								bind:value={maxParticipants}
								min="1"
								placeholder="No limit"
								oninput={markChanged}
							/>
						</div>
						<div class="space-y-2">
							<label for="questionsPerAttempt" class="text-sm font-medium text-foreground"
								>Questions per Attempt</label
							>
							<Input
								type="number"
								name="questionsPerAttempt"
								id="questionsPerAttempt"
								bind:value={questionsPerAttempt}
								min="1"
								max={quiz.questions.length || undefined}
								placeholder="All questions"
								oninput={markChanged}
							/>
							<p class="text-xs text-muted-foreground">
								Randomly select this many questions from the pool for each attempt. Leave empty to
								serve all {quiz.questions.length || ''} questions.
							</p>
						</div>
						<div class="space-y-2">
							<label for="revealAnswersAfter" class="text-sm font-medium text-foreground"
								>Reveal Answers</label
							>
							<Select.Root type="single" bind:value={revealAnswersAfter}>
								<Select.Trigger class="w-full">
									{revealAnswersAfter === 'immediate' ? 'Immediate' : 'Never'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="immediate">Immediate</Select.Item>
									<Select.Item value="never">Never</Select.Item>
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="revealAnswersAfter" value={revealAnswersAfter} />
						</div>
						<div class="space-y-2">
							<label for="questionDisplayMode" class="text-sm font-medium text-foreground"
								>Question Display</label
							>
							<Select.Root type="single" bind:value={questionDisplayMode}>
								<Select.Trigger class="w-full">
									{questionDisplayMode === 'all_on_one_page' ? 'All on one page' : 'One at a time'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="one_at_a_time">One at a time</Select.Item>
									<Select.Item value="all_on_one_page">All on one page</Select.Item>
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="questionDisplayMode" value={questionDisplayMode} />
						</div>
					</div>

					<Separator />

					<div class="space-y-2">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<label for="activateAt" class="text-sm font-medium text-foreground"
									>Activation Date (optional)</label
								>
								<Input
									type="datetime-local"
									name="activateAt"
									id="activateAt"
									bind:value={activateAt}
									max={expireAt || undefined}
									oninput={markChanged}
								/>
								<p class="text-xs text-muted-foreground">
									A future date publishes the quiz as Scheduled.
								</p>
							</div>
							<div class="space-y-2">
								<label for="expireAt" class="text-sm font-medium text-foreground"
									>Expiration Date (optional)</label
								>
								<Input
									type="datetime-local"
									name="expireAt"
									id="expireAt"
									bind:value={expireAt}
									min={activateAt || undefined}
									oninput={markChanged}
								/>
								<p class="text-xs text-muted-foreground">
									Once passed, the quiz becomes Expired and view-only.
								</p>
							</div>
						</div>
						{#if scheduleError}
							<p class="text-sm font-medium text-destructive">{scheduleError}</p>
						{:else if scheduleHint}
							<p class="text-xs text-muted-foreground">{scheduleHint}</p>
						{/if}
					</div>

					<Separator />

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Shuffle Questions</p>
								<p class="text-xs text-muted-foreground">
									Randomize question order for each participant
								</p>
							</div>
							<Switch
								bind:checked={shuffleQuestions}
								onCheckedChange={markChanged}
								name="shuffleQuestions"
							/>
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Allow Back Navigation</p>
								<p class="text-xs text-muted-foreground">
									Let participants go back to previous questions
								</p>
							</div>
							<Switch
								bind:checked={allowBackNavigation}
								onCheckedChange={markChanged}
								name="allowBackNavigation"
							/>
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Unlimited Attempts</p>
								<p class="text-xs text-muted-foreground">
									Let participants retake the quiz without an attempt limit
								</p>
							</div>
							<Switch bind:checked={unlimitedAttempts} onCheckedChange={markChanged} />
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Visible After Expiry</p>
								<p class="text-xs text-muted-foreground">
									Allow public browsing of questions and answers after the quiz expires
								</p>
							</div>
							<Switch
								bind:checked={isVisibleAfterExpiry}
								onCheckedChange={markChanged}
								name="isVisibleAfterExpiry"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</Tabs.Content>
	</Tabs.Root>

	<!-- Sticky Footer -->
	<div
		class="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6"
	>
		<div class="flex items-center justify-between gap-3">
			<div class="text-sm text-muted-foreground">
				{#if isSaving}
					<span class="flex items-center gap-1.5">
						<Save class="size-4 animate-pulse" />
						Saving...
					</span>
				{:else if hasUnsavedChanges}
					<span class="text-amber-600">Unsaved changes</span>
				{:else if lastSavedAt}
					<span class="text-emerald-600">All changes saved</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Button href="/admin/quizzes" variant="outline" size="sm">
					<X class="size-4" />
					Cancel
				</Button>
				<Button type="submit" size="sm" disabled={isSaving || Boolean(scheduleError)}>
					<Save class="size-4" />
					Save
				</Button>
				<span
					title={quiz.questions.length === 0
						? 'Add at least one question before publishing'
						: scheduleError
							? scheduleError
							: publishStatus === 'scheduled'
								? 'Publish now — the quiz stays Scheduled until the activation date'
								: publishStatus === 'expired'
									? 'Publish now — the window has already passed, so the quiz will be Expired'
									: undefined}
				>
					<Button
						type="submit"
						formaction="?/publish"
						size="sm"
						variant="default"
						disabled={isSaving || quiz.questions.length === 0 || Boolean(scheduleError)}
					>
						<Rocket class="size-4" />
						{publishStatus === 'scheduled' ? 'Schedule' : 'Publish'}
					</Button>
				</span>
			</div>
		</div>
	</div>
</form>

{#snippet questionRow(
	q: QuizQuestion,
	itemIndex: number,
	memberIndex: number | null,
	groupSize: number | null
)}
	{@const flatIndex = flatIndexById[q.id] ?? 0}
	{@const prevSlot = flatQuestionSlots[flatIndex - 1]}
	{@const nextSlot = flatQuestionSlots[flatIndex + 1]}
	{@const canMoveUp =
		memberIndex == null ? prevSlot?.memberIndex === null : memberIndex > 0}
	{@const canMoveDown =
		memberIndex == null ? nextSlot?.memberIndex === null : memberIndex < (groupSize ?? 0) - 1}
	<div
		role="listitem"
		draggable="true"
		ondragstart={(e) => handleQuestionDragStart(e, q.id)}
		ondragover={(e) => handleQuestionDragOver(e, itemIndex, memberIndex)}
		ondrop={handleQuestionDrop}
		ondragend={clearDragState}
		class="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50 {draggingQuestionId ===
		q.id
			? 'opacity-40'
			: ''}"
	>
		<GripVertical class="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground" />
		<div class="flex flex-col gap-1">
			<button
				type="button"
				disabled={!canMoveUp}
				onclick={() => moveQuestionInTree(q.id, 'up')}
				class="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
			>
				<ChevronUp class="size-4" />
				<span class="sr-only">Move question up</span>
			</button>
			<button
				type="button"
				disabled={!canMoveDown}
				onclick={() => moveQuestionInTree(q.id, 'down')}
				class="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
			>
				<ChevronDown class="size-4" />
				<span class="sr-only">Move question down</span>
			</button>
		</div>

		<div class="min-w-0 flex-1">
			<div class="mb-1 flex items-center gap-2">
				<span class="text-sm font-medium text-muted-foreground">Q{flatIndex + 1}</span>
				<Badge variant={questionTypeConfig[q.type]?.variant || 'default'}>
					{questionTypeConfig[q.type]?.label || q.type}
				</Badge>
				{#if q.mediaUrl}
					<Badge variant="outline" class="text-xs">Media</Badge>
				{/if}
				{#if q.codeSnippet}
					<Badge variant="outline" class="text-xs">Code</Badge>
				{/if}
			</div>
			<p class="line-clamp-2 text-sm text-foreground">{q.text}</p>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<Button variant="ghost" size="icon-sm" onclick={() => openEditQuestion(q)}>
				<Pencil class="size-4" />
				<span class="sr-only">Edit question</span>
			</Button>
			<Button variant="ghost" size="icon-sm" onclick={() => handleDeleteClick(q)}>
				<Trash2 class="size-4 text-destructive" />
				<span class="sr-only">Delete question</span>
			</Button>
		</div>
	</div>
{/snippet}

{#snippet groupSection(item: Extract<TreeItem, { type: 'group' }>, itemIndex: number)}
	{@const count = item.questions.length}
	{@const collapsed = collapsedGroups.has(item.group.id)}
	<div
		role="listitem"
		class="rounded-lg border border-border bg-muted/40 transition-shadow {dropLocation?.kind ===
			'group' && dropLocation.itemIndex === itemIndex
			? 'ring-2 ring-primary'
			: ''}"
		ondragover={(e) => handleGroupDragOver(e, itemIndex, count)}
		ondrop={handleQuestionDrop}
	>
		<div class="flex items-center gap-2 px-3 py-2.5">
			<button
				type="button"
				onclick={() => toggleGroupCollapsed(item.group.id)}
				aria-expanded={!collapsed}
				aria-label="{collapsed ? 'Expand' : 'Collapse'} group {item.group.name}"
				class="cursor-pointer text-muted-foreground hover:text-foreground"
			>
				{#if collapsed}
					<ChevronRight class="size-4" />
				{:else}
					<ChevronDown class="size-4" />
				{/if}
			</button>
			{#if collapsed}
				<Folder class="size-4 shrink-0 text-muted-foreground" />
			{:else}
				<FolderOpen class="size-4 shrink-0 text-muted-foreground" />
			{/if}
			<span class="truncate text-sm font-medium text-foreground">{item.group.name}</span>
			<Badge variant="secondary" class="text-xs">
				{count}
				{count === 1 ? 'question' : 'questions'}
			</Badge>
			{#if item.group.pickCount}
				<Badge variant="outline" class="text-xs">picks {item.group.pickCount}</Badge>
			{/if}
		</div>
		{#if !collapsed}
			<div class="space-y-2 pr-3 pb-3 pl-10" role="group">
				{#each item.questions as q, j (q.id)}
					{#if isGroupDropAt(itemIndex, j)}
						<div class="pointer-events-none h-0.5 rounded-full bg-primary"></div>
					{/if}
					{@render questionRow(q, itemIndex, j, item.questions.length)}
				{/each}
				{#if count > 0 && isGroupDropAt(itemIndex, count)}
					<div class="pointer-events-none h-0.5 rounded-full bg-primary"></div>
				{/if}
				{#if count === 0}
					<p class="text-xs text-muted-foreground">
						Drag questions here to add them to this group.
					</p>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

<!-- Delete Question Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Question</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete this question? This action cannot be undone.
				<br /><br />
				<span class="font-medium text-foreground">"{questionToDelete?.text}"</span>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (questionToDelete = null)}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action>
				<form
					method="POST"
					action="?/deleteQuestion"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							deleteDialogOpen = false;
							questionToDelete = null;
						};
					}}
				>
					<input type="hidden" name="id" value={questionToDelete?.id} />
					<button type="submit" class="w-full text-destructive">Delete</button>
				</form>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Question Editor Sheet -->
<QuestionEditorSheet
	bind:open={questionSheetOpen}
	quizId={quiz.id}
	question={editingQuestion}
	orderIndex={quiz.questions.length}
	groups={quiz.groups ?? []}
/>
