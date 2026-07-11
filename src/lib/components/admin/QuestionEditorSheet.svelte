<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import {
		Plus,
		Trash2,
		Upload,
		FileImage,
		X,
		Loader2,
		Code
	} from 'lucide-svelte';

	type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'fitb';

	interface Option {
		id: string;
		text: string;
		isCorrect: boolean;
	}

	interface QuestionData {
		id?: string;
		type: QuestionType;
		text: string;
		explanation?: string;
		codeSnippet?: string;
		mediaUrl?: string | null;
		options?: Option[];
		correctAnswer?: string | string[];
		orderIndex?: number;
	}

	let {
		open = $bindable(false),
		quizId,
		question = null,
		orderIndex = 0
	}: {
		open?: boolean;
		quizId: string;
		question?: QuestionData | null;
		orderIndex?: number;
	} = $props();

	const isEdit = $derived(!!question?.id);

	// Form state
	let type = $state<QuestionType>('mcq_single');
	let text = $state('');
	let explanation = $state('');
	let codeSnippet = $state('');
	let options = $state<Option[]>([]);
	let trueFalseAnswer = $state<'true' | 'false'>('true');
	let fitbAnswer = $state('');
	let mediaUrl = $state<string | null>(null);
	let mediaFileName = $state<string | null>(null);
	let mediaFile = $state<File | null>(null);
	let removeMedia = $state(false);
	let isDragging = $state(false);
	let mediaError = $state<string | null>(null);
	let imageLoadError = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	const ALLOWED_MIME_TYPES = [
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
		'audio/mpeg',
		'audio/wav',
		'audio/ogg',
		'video/mp4',
		'video/webm',
		'video/ogg'
	];

	const typeOptions: { value: QuestionType; label: string }[] = [
		{ value: 'mcq_single', label: 'Single Choice' },
		{ value: 'mcq_multi', label: 'Multiple Choice' },
		{ value: 'true_false', label: 'True / False' },
		{ value: 'fitb', label: 'Fill in the Blank' }
	];

	const typeBadgeVariant: Record<QuestionType, 'default' | 'secondary' | 'outline'> = {
		mcq_single: 'default',
		mcq_multi: 'secondary',
		true_false: 'outline',
		fitb: 'default'
	};

	// Reset form when sheet opens or question changes
	$effect(() => {
		if (open) {
			if (question) {
				type = question.type;
				text = question.text;
				explanation = question.explanation || '';
				codeSnippet = question.codeSnippet || '';
				mediaUrl = question.mediaUrl || null;
				mediaFileName = question.mediaUrl ? question.mediaUrl.split('/').pop() || null : null;
				mediaFile = null;
				removeMedia = false;
				mediaError = null;
				imageLoadError = false;
				if (fileInput) {
					fileInput.value = '';
				}

				if (question.type === 'mcq_single' || question.type === 'mcq_multi') {
					const baseOptions = question.options?.length
						? question.options.map((o) => ({ ...o }))
						: [
							{ id: crypto.randomUUID(), text: '', isCorrect: false },
							{ id: crypto.randomUUID(), text: '', isCorrect: false }
						];
					const correct = question.correctAnswer;
					const correctIds = new Set(
						Array.isArray(correct) ? correct.map(String) : correct != null ? [String(correct)] : []
					);
					options = baseOptions.map((o) => ({
						...o,
						isCorrect:
							correctIds.has(String(o.id)) || correctIds.has(String(o.text))
					}));
				} else if (question.type === 'true_false') {
					trueFalseAnswer =
						question.correctAnswer != null && String(question.correctAnswer) === 'false'
							? 'false'
							: 'true';
				} else if (question.type === 'fitb') {
					fitbAnswer = question.correctAnswer == null ? '' : String(question.correctAnswer);
				}
			} else {
				resetForm();
			}
			submitError = null;
		}
	});

	// When type changes, ensure proper default fields
	$effect(() => {
		if (open && (type === 'mcq_single' || type === 'mcq_multi') && options.length === 0) {
			options = [
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false }
			];
		}
	});

	function resetForm() {
		type = 'mcq_single';
		text = '';
		explanation = '';
		codeSnippet = '';
		options = [
			{ id: crypto.randomUUID(), text: '', isCorrect: false },
			{ id: crypto.randomUUID(), text: '', isCorrect: false }
		];
		trueFalseAnswer = 'true';
		fitbAnswer = '';
		mediaUrl = null;
		mediaFileName = null;
		mediaFile = null;
		removeMedia = false;
		mediaError = null;
		imageLoadError = false;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function addOption() {
		options = [...options, { id: crypto.randomUUID(), text: '', isCorrect: false }];
	}

	function removeOption(index: number) {
		if (options.length <= 2) return;
		options = options.filter((_, i) => i !== index);
	}

	function updateOptionText(index: number, value: string) {
		options = options.map((opt, i) => (i === index ? { ...opt, text: value } : opt));
	}

	function setSingleCorrect(index: number) {
		options = options.map((opt, i) => ({ ...opt, isCorrect: i === index }));
	}

	function toggleMultiCorrect(index: number) {
		options = options.map((opt, i) =>
			i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt
		);
	}

	function handleFileSelect(file: File | null) {
		mediaError = null;
		if (!file) return;

		if (file.size > MAX_FILE_SIZE) {
			mediaError = `File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
			return;
		}

		if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
			mediaError = `File type ${file.type || 'unknown'} is not allowed. Supported: images, audio, video.`;
			return;
		}

		mediaFile = file;
		mediaFileName = file.name;
		mediaUrl = null; // preview will be replaced
		removeMedia = false;
		imageLoadError = false;
	}

	function handleFileInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		handleFileSelect(input.files?.[0] ?? null);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0] ?? null;
		handleFileSelect(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function clearMedia() {
		mediaFile = null;
		mediaFileName = null;
		mediaUrl = null;
		mediaError = null;
		imageLoadError = false;
		if (fileInput) {
			fileInput.value = '';
		}
		if (question?.mediaUrl) {
			removeMedia = true;
		}
	}

	const mediaIsImage = $derived(
		(mediaFile && mediaFile.type.startsWith('image/')) ||
		(mediaUrl && !mediaFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl))
	);

	const correctAnswerValue = $derived.by(() => {
		if (type === 'mcq_single' || type === 'mcq_multi') {
			return JSON.stringify(options.filter((o) => o.isCorrect).map((o) => o.id));
		} else if (type === 'true_false') {
			return trueFalseAnswer;
		} else {
			return fitbAnswer;
		}
	});

	const optionsJson = $derived.by(() => {
		if (type !== 'mcq_single' && type !== 'mcq_multi') return '';
		return JSON.stringify(options.map(({ id, text, isCorrect }) => ({ id, text, isCorrect })));
	});

	const canSubmit = $derived.by(() => {
		if (!text.trim()) return false;
		if (type === 'mcq_single' || type === 'mcq_multi') {
			if (options.length < 2) return false;
			if (options.some((o) => !o.text.trim())) return false;
			if (!options.some((o) => o.isCorrect)) return false;
		} else if (type === 'fitb') {
			if (!fitbAnswer.trim()) return false;
		}
		return true;
	});

	function handleSubmitSuccess() {
		isSubmitting = false;
		open = false;
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full sm:max-w-xl overflow-y-auto p-0">
		<Sheet.Header class="border-b sticky top-0 bg-background z-10">
			<div class="flex items-center gap-2">
				<Sheet.Title>{isEdit ? 'Edit Question' : 'Add Question'}</Sheet.Title>
				{#if isEdit}
					<Badge variant={typeBadgeVariant[type]}>
						{typeOptions.find((t) => t.value === type)?.label}
					</Badge>
				{/if}
			</div>
			<Sheet.Description>
				{isEdit ? 'Update the question details below.' : 'Create a new question for this quiz.'}
			</Sheet.Description>
		</Sheet.Header>

		{#if submitError}
			<div
				role="alert"
				class="mx-4 mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm"
			>
				{submitError}
			</div>
		{/if}

		<form
			method="POST"
			action={isEdit ? '?/updateQuestion' : '?/createQuestion'}
			enctype="multipart/form-data"
			use:enhance={() => {
				isSubmitting = true;
				submitError = null;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'failure') {
						const data = await result.data;
						submitError = (data as any)?.error || 'Failed to save question';
					} else {
						await update();
						await invalidateAll();
						handleSubmitSuccess();
					}
				};
			}}
			class="flex flex-col gap-5 p-4"
		>
			<input type="hidden" name="quizId" value={quizId} />
			{#if question?.id}
				<input type="hidden" name="id" value={question.id} />
			{/if}
			<input type="hidden" name="orderIndex" value={orderIndex} />
			<input type="hidden" name="options" value={optionsJson} />
			<input type="hidden" name="correctAnswer" value={correctAnswerValue} />
			{#if removeMedia}
				<input type="hidden" name="removeMedia" value="on" />
			{/if}

			<!-- Type Selector -->
			<div class="space-y-2">
				<Label for="question-type">Question Type</Label>
				<Select.Root
					type="single"
					name="type"
					value={type}
					onValueChange={(v) => (type = v as QuestionType)}
				>
					<Select.Trigger id="question-type" class="w-full">
						{typeOptions.find((t) => t.value === type)?.label}
					</Select.Trigger>
					<Select.Content>
						{#each typeOptions as opt}
							<Select.Item value={opt.value}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Question Text -->
			<div class="space-y-2">
				<Label for="question-text">Question Text <span class="text-destructive">*</span></Label>
				<Textarea
					id="question-text"
					name="text"
					bind:value={text}
					rows={3}
					required
					placeholder="Enter your question..."
				/>
			</div>

			<!-- Type-specific answer section -->
			{#if type === 'mcq_single' || type === 'mcq_multi'}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label>Options <span class="text-destructive">*</span></Label>
						<span class="text-xs text-muted-foreground">
							{type === 'mcq_single' ? 'Select one correct answer' : 'Check all correct answers'}
						</span>
					</div>
					<div class="space-y-2">
						{#each options as option, index (option.id)}
							<div class="flex items-center gap-2">
								{#if type === 'mcq_single'}
									<button
										type="button"
										role="radio"
										aria-checked={option.isCorrect}
										aria-label={`Mark option ${index + 1} as correct`}
										onclick={() => setSingleCorrect(index)}
										class="size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer {option.isCorrect
											? 'border-primary bg-primary'
											: 'border-input hover:border-primary/50'}"
									>
										{#if option.isCorrect}
											<span class="size-2 rounded-full bg-primary-foreground"></span>
										{/if}
									</button>
								{:else}
									<button
										type="button"
										role="checkbox"
										aria-checked={option.isCorrect}
										aria-label={`Mark option ${index + 1} as correct`}
										onclick={() => toggleMultiCorrect(index)}
										class="size-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer {option.isCorrect
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input hover:border-primary/50'}"
									>
										{#if option.isCorrect}
											<svg class="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M2 6l3 3 5-6" stroke-linecap="round" stroke-linejoin="round" />
											</svg>
										{/if}
									</button>
								{/if}
								<Input
									type="text"
									value={option.text}
									oninput={(e) => updateOptionText(index, (e.currentTarget as HTMLInputElement).value)}
									placeholder={`Option ${index + 1}`}
									class="flex-1"
									required
								/>
								{#if options.length > 2}
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onclick={() => removeOption(index)}
										aria-label={`Remove option ${index + 1}`}
									>
										<Trash2 class="size-4 text-destructive" />
									</Button>
								{/if}
							</div>
						{/each}
					</div>
					<Button type="button" variant="outline" size="sm" onclick={addOption} class="w-full">
						<Plus class="size-4" />
						Add Option
					</Button>
				</div>
			{:else if type === 'true_false'}
				<div class="space-y-2">
					<Label>Correct Answer <span class="text-destructive">*</span></Label>
					<div class="flex gap-3">
						<button
							type="button"
							role="radio"
							aria-checked={trueFalseAnswer === 'true'}
							onclick={() => (trueFalseAnswer = 'true')}
							class="flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer {trueFalseAnswer ===
							'true'
								? 'border-primary bg-primary/5 text-primary'
								: 'border-input hover:border-primary/50'}"
						>
							True
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={trueFalseAnswer === 'false'}
							onclick={() => (trueFalseAnswer = 'false')}
							class="flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer {trueFalseAnswer ===
							'false'
								? 'border-primary bg-primary/5 text-primary'
								: 'border-input hover:border-primary/50'}"
						>
							False
						</button>
					</div>
				</div>
			{:else if type === 'fitb'}
				<div class="space-y-2">
					<Label for="fitb-answer">Correct Answer <span class="text-destructive">*</span></Label>
					<Input
						id="fitb-answer"
						name="correctAnswer"
						bind:value={fitbAnswer}
						placeholder="Enter the correct answer"
						required
					/>
					<p class="text-xs text-muted-foreground">
						Answer matching is case-insensitive and trims whitespace.
					</p>
				</div>
			{/if}

			<!-- Explanation -->
			<div class="space-y-2">
				<Label for="question-explanation">Explanation (optional)</Label>
				<Textarea
					id="question-explanation"
					name="explanation"
					bind:value={explanation}
					rows={2}
					placeholder="Shown to participants after answering (if reveal is enabled)"
				/>
			</div>

			<!-- Media Upload -->
			<div class="space-y-2">
				<Label>Media Attachment (optional)</Label>
				<!-- The file input is always rendered so the selected file stays
				     attached to the form even after the preview replaces the drop zone. -->
				<input
					bind:this={fileInput}
					type="file"
					name="media"
					class="sr-only"
					accept="image/*,audio/*,video/*"
					onchange={handleFileInput}
				/>
				{#if mediaIsImage && !imageLoadError}
					<div class="relative rounded-lg border border-border overflow-hidden bg-muted/30">
						<img
							src={mediaFile ? URL.createObjectURL(mediaFile) : mediaUrl!}
							alt="Media preview"
							class="w-full max-h-48 object-contain"
							onerror={() => { if (!mediaFile) imageLoadError = true; }}
						/>
						<button
							type="button"
							onclick={clearMedia}
							class="absolute top-2 right-2 rounded-md bg-background/80 backdrop-blur-sm p-1 hover:bg-background cursor-pointer"
							aria-label="Remove media"
						>
							<X class="size-4" />
						</button>
					</div>
				{:else if mediaFile || mediaUrl}
					<div class="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
						<FileImage class="size-8 text-muted-foreground shrink-0" />
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-foreground truncate">
								{mediaFileName || mediaUrl?.split('/').pop()}
							</p>
							<p class="text-xs text-muted-foreground">
								{#if imageLoadError}
									Image failed to load — re-upload to restore
								{:else}
									Current media file
								{/if}
							</p>
						</div>
						<button
							type="button"
							onclick={clearMedia}
							class="text-muted-foreground hover:text-destructive cursor-pointer"
							aria-label="Remove media"
						>
							<X class="size-4" />
						</button>
					</div>
				{:else}
					<div
						role="button"
						tabindex="0"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						onclick={() => fileInput?.click()}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								fileInput?.click();
							}
						}}
						class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer {isDragging
							? 'border-primary bg-primary/5'
							: 'border-input hover:border-primary/50 hover:bg-muted/30'}"
					>
						<Upload class="size-6 text-muted-foreground" />
						<p class="text-sm text-foreground">
							<span class="font-medium">Click to upload</span> or drag and drop
						</p>
						<p class="text-xs text-muted-foreground">
							Images, audio, or video (max 50MB)
						</p>
					</div>
				{/if}
				{#if mediaError}
					<p role="alert" class="text-xs text-destructive">{mediaError}</p>
				{/if}
			</div>

			<!-- Code Snippet -->
			<div class="space-y-2">
				<Label for="code-snippet" class="flex items-center gap-1.5">
					<Code class="size-3.5" />
					Code Snippet (optional)
				</Label>
				<Textarea
					id="code-snippet"
					name="codeSnippet"
					bind:value={codeSnippet}
					rows={4}
					placeholder="Paste code here..."
					class="font-mono text-sm"
				/>
				{#if codeSnippet.trim()}
					<div class="rounded-lg border border-border bg-muted/30 p-3">
						<p class="text-xs font-medium text-muted-foreground mb-2">Preview</p>
						<pre class="font-mono text-xs text-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{codeSnippet}</pre>
					</div>
				{/if}
			</div>

			<Sheet.Footer class="sticky bottom-0 bg-background border-t mt-auto -mx-4 -mb-4">
				<Button
					type="button"
					variant="outline"
					onclick={() => (open = false)}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={!canSubmit || isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="size-4 animate-spin" />
					{/if}
					{isEdit ? 'Save Changes' : 'Add Question'}
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
