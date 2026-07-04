<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Check, X, Clock, User, Mail, Trophy } from 'lucide-svelte';

	type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'fitb';

	interface QuestionOption {
		id?: string;
		text: string;
		isCorrect: boolean;
	}

	interface DetailQuestion {
		id: string;
		type: QuestionType;
		text: string;
		options: QuestionOption[] | null;
		correctAnswer: unknown;
		explanation: string | null;
		orderIndex: number;
	}

	interface AttemptDetailData {
		id: string;
		participantName: string;
		participantEmail: string;
		intakeFormData: unknown;
		answers: unknown;
		score: number;
		totalQuestions: number;
		timeTakenSeconds: number;
		submittedAt: Date | string;
		questions: DetailQuestion[];
	}

	let {
		open = $bindable(false),
		attempt = null,
		revealAnswers = false
	}: {
		open?: boolean;
		attempt?: AttemptDetailData | null;
		revealAnswers?: boolean;
	} = $props();

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
	}

	function formatDateTime(date: Date | string): string {
		return new Date(date).toLocaleString();
	}

	/**
	 * Normalize the stored answers payload into a map of questionId -> answer value.
	 * Tolerates object, array-of-{questionId,value}, and array-of-{questionId,answer} shapes.
	 */
	function normalizeAnswers(answers: unknown): Record<string, unknown> {
		if (answers == null) return {};
		if (typeof answers === 'object' && !Array.isArray(answers)) {
			return answers as Record<string, unknown>;
		}
		if (Array.isArray(answers)) {
			const map: Record<string, unknown> = {};
			for (const entry of answers) {
				if (entry && typeof entry === 'object') {
					const rec = entry as Record<string, unknown>;
					const qid = rec.questionId ?? rec.question_id ?? rec.id;
					const val = rec.answer ?? rec.value ?? rec.response;
					if (qid != null) map[String(qid)] = val;
				}
			}
			return map;
		}
		return {};
	}

	function optionText(options: QuestionOption[] | null, optionId: unknown): string {
		if (!options || optionId == null) return String(optionId ?? '');
		const found = options.find((o) => o.id === optionId);
		return found ? found.text : String(optionId);
	}

	function formatAnswer(question: DetailQuestion, answer: unknown): string {
		if (answer == null || answer === '') return '—';
		if (question.type === 'mcq_multi') {
			const ids = Array.isArray(answer) ? answer : [answer];
			return ids.map((id) => optionText(question.options, id)).filter(Boolean).join(', ') || '—';
		}
		if (question.type === 'mcq_single') {
			return optionText(question.options, answer);
		}
		return String(answer);
	}

	function formatCorrect(question: DetailQuestion): string {
		const correct = question.correctAnswer;
		if (correct == null) return '—';
		if (question.type === 'mcq_multi') {
			const ids = Array.isArray(correct) ? correct : [correct];
			return ids.map((id) => optionText(question.options, id)).filter(Boolean).join(', ') || '—';
		}
		if (question.type === 'mcq_single') {
			return optionText(question.options, correct);
		}
		return String(correct);
	}

	/** Best-effort guess whether the participant's answer is correct, for the breakdown. */
	function isAnswerCorrect(question: DetailQuestion, answer: unknown): boolean {
		const correct = question.correctAnswer;
		if (answer == null) return false;
		if (question.type === 'fitb') {
			return String(answer).trim().toLowerCase() === String(correct).trim().toLowerCase();
		}
		if (question.type === 'true_false') {
			return String(answer).toLowerCase() === String(correct).toLowerCase();
		}
		if (question.type === 'mcq_single') {
			return String(answer) === String(correct);
		}
		if (question.type === 'mcq_multi') {
			const a = Array.isArray(answer) ? [...answer].map(String).sort() : [String(answer)];
			const c = Array.isArray(correct) ? [...correct].map(String).sort() : [String(correct)];
			return a.length === c.length && a.every((v, i) => v === c[i]);
		}
		return false;
	}

	let intakeEntries = $derived.by(() => {
		const raw = attempt?.intakeFormData;
		if (raw == null) return [];
		if (Array.isArray(raw)) {
			return raw
				.filter(
					(e): e is { field: string; value: string } =>
						!!e && typeof e === 'object' && 'field' in e && 'value' in e
				)
				.map((e) => ({ field: e.field, value: String(e.value) }));
		}
		if (typeof raw === 'object') {
			return Object.entries(raw as Record<string, unknown>).map(([field, value]) => ({
				field,
				value: String(value)
			}));
		}
		return [];
	});

	let answersMap = $derived(normalizeAnswers(attempt?.answers));
	let sortedQuestions = $derived(
		[...(attempt?.questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
	);
	let percentage = $derived(
		attempt && attempt.totalQuestions > 0
			? Math.round((attempt.score / attempt.totalQuestions) * 100)
			: 0
	);
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="sm:max-w-xl overflow-y-auto">
		<Sheet.Header>
			<Sheet.Title>Attempt Details</Sheet.Title>
			<Sheet.Description>
				Submitted {attempt ? formatDateTime(attempt.submittedAt) : ''}
			</Sheet.Description>
		</Sheet.Header>

		{#if attempt}
			<div class="px-4 pb-6 space-y-6">
				<!-- Score summary -->
				<div class="grid grid-cols-3 gap-3">
					<div class="rounded-lg border border-border bg-muted/40 p-3 text-center">
						<Trophy class="mx-auto size-4 text-muted-foreground" />
						<p class="mt-1 text-xs text-muted-foreground">Score</p>
						<p class="text-lg font-bold text-foreground">
							{attempt.score}/{attempt.totalQuestions}
						</p>
					</div>
					<div class="rounded-lg border border-border bg-muted/40 p-3 text-center">
						<p class="text-xs text-muted-foreground">Percentage</p>
						<p class="mt-1 text-lg font-bold text-foreground">{percentage}%</p>
					</div>
					<div class="rounded-lg border border-border bg-muted/40 p-3 text-center">
						<Clock class="mx-auto size-4 text-muted-foreground" />
						<p class="mt-1 text-xs text-muted-foreground">Time</p>
						<p class="text-lg font-bold text-foreground">
							{formatTime(attempt.timeTakenSeconds)}
						</p>
					</div>
				</div>

				<!-- Participant info -->
				<div class="space-y-2">
					<h3 class="text-sm font-semibold text-foreground">Participant</h3>
					<div class="space-y-1.5 text-sm">
						<div class="flex items-center gap-2 text-foreground">
							<User class="size-4 text-muted-foreground" />
							{attempt.participantName}
						</div>
						{#if attempt.participantEmail}
							<div class="flex items-center gap-2 text-foreground">
								<Mail class="size-4 text-muted-foreground" />
								{attempt.participantEmail}
							</div>
						{/if}
					</div>
					{#if intakeEntries.length > 0}
						<dl class="mt-2 space-y-1 text-sm">
							{#each intakeEntries as entry}
								<div class="flex justify-between gap-4">
									<dt class="text-muted-foreground">{entry.field}</dt>
									<dd class="text-foreground text-right">{entry.value}</dd>
								</div>
							{/each}
						</dl>
					{/if}
				</div>

				<Separator />

				<!-- Answer breakdown -->
				<div class="space-y-4">
					<h3 class="text-sm font-semibold text-foreground">Answer Breakdown</h3>
					{#if sortedQuestions.length === 0}
						<p class="text-sm text-muted-foreground">No questions available for this quiz.</p>
					{:else}
						<ol class="space-y-4">
							{#each sortedQuestions as q, i (q.id)}
								{@const answer = answersMap[q.id]}
								{@const correct = isAnswerCorrect(q, answer)}
								<li class="rounded-lg border border-border p-3">
									<div class="flex items-start justify-between gap-2">
										<p class="text-sm font-medium text-foreground">
											<span class="text-muted-foreground">{i + 1}.</span> {q.text}
										</p>
										{#if revealAnswers}
											<Badge variant={correct ? 'default' : 'destructive'} class="shrink-0">
												{#if correct}
													<Check class="size-3 mr-1" />Correct
												{:else}
													<X class="size-3 mr-1" />Incorrect
												{/if}
											</Badge>
										{/if}
									</div>
									<div class="mt-2 space-y-1 text-sm">
										<div class="flex gap-2">
											<span class="text-muted-foreground shrink-0">Answer:</span>
											<span class="text-foreground">{formatAnswer(q, answer)}</span>
										</div>
										{#if revealAnswers}
											<div class="flex gap-2">
												<span class="text-muted-foreground shrink-0">Correct:</span>
												<span class="text-foreground font-medium">
													{formatCorrect(q)}
												</span>
											</div>
											{#if q.explanation}
												<div class="flex gap-2">
													<span class="text-muted-foreground shrink-0">Explanation:</span>
													<span class="text-foreground">{q.explanation}</span>
												</div>
											{/if}
										{/if}
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
