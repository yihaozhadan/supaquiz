<script lang="ts">
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
	import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import QuestionEditorSheet from '$lib/components/admin/QuestionEditorSheet.svelte';
	import { toasts } from '$lib/components/admin/toast';
	import {
		ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
		Save, X, Rocket, AlertTriangle, ListChecks, Settings,
		FileInput, GripVertical, Pencil
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

	let title = $state(quiz.title);
	let description = $state(quiz.description);
	let password = $state(quiz.password || '');
	let timeLimitSeconds = $state(quiz.timeLimitSeconds?.toString() || '');
	let maxAttempts = $state(quiz.maxAttempts?.toString() || '1');
	let maxParticipants = $state(quiz.maxParticipants?.toString() || '');
	let shuffleQuestions = $state(quiz.shuffleQuestions);
	let allowBackNavigation = $state(quiz.allowBackNavigation);
	let isVisibleAfterExpiry = $state(quiz.isVisibleAfterExpiry ?? true);
	let questionDisplayMode = $state(quiz.questionDisplayMode);
	let revealAnswersAfter = $state(quiz.revealAnswersAfter);
	let activateAt = $state(
		quiz.activateAt ? new Date(quiz.activateAt).toISOString().slice(0, 16) : ''
	);
	let expireAt = $state(
		quiz.expireAt ? new Date(quiz.expireAt).toISOString().slice(0, 16) : ''
	);

	interface IntakeField {
		name: string;
		type: 'text' | 'email' | 'number' | 'select';
		required: boolean;
	}

	let intakeFields = $state<IntakeField[]>([]);

	$effect(() => {
		const parsed = typeof quiz.intakeFormSchema === 'string'
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
	let questionSheetOpen = $state(false);
	let editingQuestion = $state<any>(null);

	function openAddQuestion() {
		editingQuestion = null;
		questionSheetOpen = true;
	}

	function openEditQuestion(q: any) {
		editingQuestion = {
			id: q.id,
			type: q.type,
			text: q.text,
			explanation: q.explanation || '',
			codeSnippet: q.codeSnippet || '',
			mediaUrl: q.mediaUrl || null,
			options: q.options
				? (Array.isArray(q.options) ? q.options : JSON.parse(q.options)).map((o: any) => ({
					id: o.id || crypto.randomUUID(),
					text: o.text,
					isCorrect: o.isCorrect
				}))
				: [],
			correctAnswer: q.correctAnswer,
			orderIndex: q.orderIndex
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

	const questionTypeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
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
	<Button href="/admin/quizzes" variant="outline" size="sm">
		<ArrowLeft class="size-4" />
		Back
	</Button>
</PageHeader>

{#if hasUnsavedChanges}
	<div class="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-lg text-sm">
		<AlertTriangle class="size-4 shrink-0" />
		<span>You have unsaved changes.</span>
		{#if lastSavedAt}
			<span class="text-muted-foreground">Last saved: {lastSavedAt.toLocaleTimeString()}</span>
		{/if}
	</div>
{/if}

<form bind:this={mainForm} method="POST" action="?/update" use:enhance={() => {
		isSaving = true;
		return async ({ update }) => {
			await update();
			isSaving = false;
			hasUnsavedChanges = false;
			lastSavedAt = new Date();
		};
	}}>
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
						<Input type="text" name="title" id="title" bind:value={title} required oninput={markChanged} />
					</div>

					<div class="space-y-2">
						<label for="description" class="text-sm font-medium text-foreground">Description</label>
						<Textarea name="description" id="description" rows={3} bind:value={description} required oninput={markChanged} />
					</div>

					<div class="space-y-2">
						<label for="password" class="text-sm font-medium text-foreground">Password (optional)</label>
						<Input type="text" name="password" id="password" bind:value={password} oninput={markChanged} placeholder="Leave empty for no password" />
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
							{quiz.questions.length} / 50
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
						<div class="space-y-3">
							{#each quiz.questions as q, index (q.id)}
								<div class="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
									<div class="flex flex-col gap-1">
										<form method="POST" action="?/moveQuestion" use:enhance={() => {
											return async ({ update }) => { await update(); };
										}}>
											<input type="hidden" name="questionId" value={q.id} />
											<input type="hidden" name="direction" value="up" />
											<button type="submit" disabled={index === 0} class="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
												<ChevronUp class="size-4" />
											</button>
										</form>
										<form method="POST" action="?/moveQuestion" use:enhance={() => {
											return async ({ update }) => { await update(); };
										}}>
											<input type="hidden" name="questionId" value={q.id} />
											<input type="hidden" name="direction" value="down" />
											<button type="submit" disabled={index === quiz.questions.length - 1} class="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
												<ChevronDown class="size-4" />
											</button>
										</form>
									</div>

									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1">
											<span class="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
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
										<p class="text-sm text-foreground line-clamp-2">{q.text}</p>
									</div>

									<div class="flex items-center gap-1 shrink-0">
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
							{/each}
						</div>
						<Separator class="my-4" />
						<Button onclick={openAddQuestion} variant="outline" class="w-full" disabled={quiz.questions.length >= 50}>
							<Plus class="size-4" />
							Add Question
						</Button>
					{/if}
				</CardContent>
			</Card>
		</Tabs.Content>

		<!-- Intake Form Tab -->
		<Tabs.Content value="intake">
			<Card>
				<CardHeader>
					<CardTitle>Intake Form</CardTitle>
					<CardDescription>Fields to collect from participants before starting the quiz.</CardDescription>
				</CardHeader>
				<CardContent>
					{#if intakeFields.length === 0}
						<EmptyState
							title="No intake fields"
							description="Add fields to collect participant information before the quiz."
						/>
					{:else}
						<div class="space-y-3">
							{#each intakeFields as field, index}
								<div class="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
									<div class="flex flex-col gap-1">
										<button
											type="button"
											disabled={index === 0}
											onclick={() => moveIntakeField(index, 'up')}
											class="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<ChevronUp class="size-4" />
										</button>
										<button
											type="button"
											disabled={index === intakeFields.length - 1}
											onclick={() => moveIntakeField(index, 'down')}
											class="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<ChevronDown class="size-4" />
										</button>
									</div>

									<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
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
													{field.type === 'text' ? 'Text' : field.type === 'email' ? 'Email' : field.type === 'number' ? 'Number' : 'Select'}
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

									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => removeIntakeField(index)}
									>
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
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-2">
							<label for="timeLimitSeconds" class="text-sm font-medium text-foreground">Time Limit (seconds)</label>
							<Input type="number" name="timeLimitSeconds" id="timeLimitSeconds" bind:value={timeLimitSeconds} min="0" placeholder="No limit" oninput={markChanged} />
						</div>
						<div class="space-y-2">
							<label for="maxAttempts" class="text-sm font-medium text-foreground">Max Attempts</label>
							<Input type="number" name="maxAttempts" id="maxAttempts" bind:value={maxAttempts} min="1" required oninput={markChanged} />
						</div>
						<div class="space-y-2">
							<label for="maxParticipants" class="text-sm font-medium text-foreground">Max Participants</label>
							<Input type="number" name="maxParticipants" id="maxParticipants" bind:value={maxParticipants} min="1" required oninput={markChanged} />
						</div>
						<div class="space-y-2">
							<label for="revealAnswersAfter" class="text-sm font-medium text-foreground">Reveal Answers</label>
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
							<label for="questionDisplayMode" class="text-sm font-medium text-foreground">Question Display</label>
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

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-2">
							<label for="activateAt" class="text-sm font-medium text-foreground">Activation Date (optional)</label>
							<Input type="datetime-local" name="activateAt" id="activateAt" bind:value={activateAt} oninput={markChanged} />
						</div>
						<div class="space-y-2">
							<label for="expireAt" class="text-sm font-medium text-foreground">Expiration Date (optional)</label>
							<Input type="datetime-local" name="expireAt" id="expireAt" bind:value={expireAt} oninput={markChanged} />
						</div>
					</div>

					<Separator />

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Shuffle Questions</p>
								<p class="text-xs text-muted-foreground">Randomize question order for each participant</p>
							</div>
							<Switch bind:checked={shuffleQuestions} onCheckedChange={markChanged} name="shuffleQuestions" />
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Allow Back Navigation</p>
								<p class="text-xs text-muted-foreground">Let participants go back to previous questions</p>
							</div>
							<Switch bind:checked={allowBackNavigation} onCheckedChange={markChanged} name="allowBackNavigation" />
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-foreground">Visible After Expiry</p>
								<p class="text-xs text-muted-foreground">Allow public browsing of questions and answers after the quiz expires</p>
							</div>
							<Switch bind:checked={isVisibleAfterExpiry} onCheckedChange={markChanged} name="isVisibleAfterExpiry" />
						</div>
					</div>
				</CardContent>
			</Card>
		</Tabs.Content>
	</Tabs.Root>

	<!-- Sticky Footer -->
	<div class="sticky bottom-0 -mx-4 sm:-mx-6 mt-6 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6 py-3">
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
				<Button type="submit" size="sm" disabled={isSaving}>
					<Save class="size-4" />
					Save
				</Button>
				<Button type="submit" formaction="?/publish" size="sm" variant="default" disabled={isSaving}>
					<Rocket class="size-4" />
					Publish
				</Button>
			</div>
		</div>
	</div>
</form>

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
				<form method="POST" action="?/deleteQuestion" use:enhance={() => {
					return async ({ update }) => {
						await update();
						deleteDialogOpen = false;
						questionToDelete = null;
					};
				}}>
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
/>
