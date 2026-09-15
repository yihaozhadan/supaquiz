<script lang="ts">
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/components/admin/toast';

	let { data, form } = $props();

	$effect(() => {
		if (form?.error) toasts.error(form.error);
		if (form?.success) toasts.success('Question saved');
	});

	const quiz = data.quiz;
	let questionType = $state('mcq_single');
	let options = $state([{ id: crypto.randomUUID(), text: '', isCorrect: false }]);
	let correctAnswer = $state('');

	function addOption() {
		options = [...options, { id: crypto.randomUUID(), text: '', isCorrect: false }];
	}

	function removeOption(index: number) {
		options = options.filter((_, i) => i !== index);
	}

	function updateOption(index: number, field: 'text' | 'isCorrect', value: string | boolean) {
		options = options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt));
	}

	function setSingleCorrect(index: number) {
		options = options.map((opt, i) => ({ ...opt, isCorrect: i === index }));
	}
</script>

<div class="mb-6">
	<a href="/admin/quizzes/{quiz.id}/edit" class="text-blue-600 hover:text-blue-800">
		← Back to Quiz Editor
	</a>
</div>

<h1 class="mb-6 text-2xl font-bold text-foreground">Add Question to: {quiz.title}</h1>

<form method="POST" action="?/create" class="space-y-6">
	<input type="hidden" name="quizId" value={quiz.id} />
	<input type="hidden" name="orderIndex" value={quiz.questions.length} />

	<div class="border border-border bg-card px-4 py-5 shadow sm:rounded-lg sm:p-6">
		<div class="space-y-4">
			<div>
				<label for="type" class="block text-sm font-medium text-foreground">Question Type</label>
				<select
					bind:value={questionType}
					name="type"
					id="type"
					class="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
				>
					<option value="mcq_single">Multiple Choice (Single Answer)</option>
					<option value="mcq_multi">Multiple Choice (Multiple Answers)</option>
					<option value="true_false">True/False</option>
					<option value="fitb">Fill in the Blank</option>
				</select>
			</div>

			<div>
				<label for="text" class="block text-sm font-medium text-foreground">Question Text</label>
				<textarea
					name="text"
					id="text"
					rows="3"
					required
					class="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
				></textarea>
			</div>

			<div>
				<label for="explanation" class="block text-sm font-medium text-foreground">
					Explanation (optional)
				</label>
				<textarea
					name="explanation"
					id="explanation"
					rows="2"
					class="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
				></textarea>
			</div>

			{#if questionType === 'mcq_single' || questionType === 'mcq_multi'}
				<div>
					<label class="mb-2 block text-sm font-medium text-foreground">Options</label>
					<div class="space-y-2">
						{#each options as option, index}
							<div class="flex items-center space-x-2">
								{#if questionType === 'mcq_single'}
									<input
										type="radio"
										name="correctAnswer"
										value={option.id}
										checked={option.isCorrect}
										onchange={() => setSingleCorrect(index)}
										class="h-4 w-4 border-border text-primary focus:ring-ring"
									/>
								{:else}
									<input
										type="checkbox"
										checked={option.isCorrect}
										onchange={(e) =>
											updateOption(
												index,
												'isCorrect',
												(e.currentTarget as HTMLInputElement).checked
											)}
										class="h-4 w-4 rounded border-border text-primary focus:ring-ring"
									/>
								{/if}
								<input
									type="text"
									name={`options[${index}].text`}
									value={option.text}
									oninput={(e) =>
										updateOption(index, 'text', (e.currentTarget as HTMLInputElement).value)}
									placeholder="Option text"
									class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
								/>
								<input type="hidden" name={`options[${index}].id`} value={option.id} />
								{#if options.length > 2}
									<button
										type="button"
										onclick={() => removeOption(index)}
										class="text-red-600 hover:text-red-800"
									>
										Remove
									</button>
								{/if}
							</div>
						{/each}
					</div>
					<button
						type="button"
						onclick={addOption}
						class="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
					>
						+ Add Option
					</button>
					<input
						type="hidden"
						name="correctAnswer"
						value={JSON.stringify(options.filter((o) => o.isCorrect).map((o) => o.id))}
					/>
				</div>
			{:else if questionType === 'true_false'}
				<div>
					<label class="mb-2 block text-sm font-medium text-foreground">Correct Answer</label>
					<div class="flex space-x-4">
						<label class="flex items-center">
							<input
								type="radio"
								name="correctAnswer"
								value="true"
								class="h-4 w-4 border-border text-primary focus:ring-ring"
							/>
							<span class="ml-2 text-foreground">True</span>
						</label>
						<label class="flex items-center">
							<input
								type="radio"
								name="correctAnswer"
								value="false"
								class="h-4 w-4 border-border text-primary focus:ring-ring"
							/>
							<span class="ml-2 text-foreground">False</span>
						</label>
					</div>
				</div>
			{:else if questionType === 'fitb'}
				<div>
					<label for="fitbAnswer" class="block text-sm font-medium text-foreground"
						>Correct Answer</label
					>
					<input
						type="text"
						name="correctAnswer"
						id="fitbAnswer"
						required
						class="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex justify-end space-x-3">
		<a
			href="/admin/quizzes/{quiz.id}/edit"
			class="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
		>
			Cancel
		</a>
		<button
			type="submit"
			class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
		>
			Add Question
		</button>
	</div>
</form>
