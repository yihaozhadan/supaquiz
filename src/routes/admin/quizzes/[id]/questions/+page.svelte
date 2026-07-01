<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

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

<h1 class="text-2xl font-bold text-foreground mb-6">Add Question to: {quiz.title}</h1>

{#if form?.errors}
	<div class="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
		{#each Object.entries(form.errors as Record<string, string[]>) as [field, errors]}
			{#each errors as error}
				<div>{field}: {error}</div>
			{/each}
		{/each}
	</div>
{/if}

{#if form?.success}
	<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
		{form.message}
	</div>
{/if}

<form method="POST" action="?/create" class="space-y-6">
	<input type="hidden" name="quizId" value={quiz.id} />
	<input type="hidden" name="orderIndex" value={quiz.questions.length} />

	<div class="bg-card shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-border">
		<div class="space-y-4">
			<div>
				<label for="type" class="block text-sm font-medium text-foreground">Question Type</label>
				<select
					bind:value={questionType}
					name="type"
					id="type"
					class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
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
					class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
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
					class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
				></textarea>
			</div>

			{#if questionType === 'mcq_single' || questionType === 'mcq_multi'}
				<div>
					<label class="block text-sm font-medium text-foreground mb-2">Options</label>
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
										class="h-4 w-4 text-primary focus:ring-ring border-border"
									/>
								{:else}
									<input
										type="checkbox"
										checked={option.isCorrect}
										onchange={(e) =>
											updateOption(index, 'isCorrect', (e.currentTarget as HTMLInputElement).checked)}
										class="h-4 w-4 text-primary focus:ring-ring border-border rounded"
									/>
								{/if}
								<input
									type="text"
									name={`options[${index}].text`}
									value={option.text}
									oninput={(e) =>
										updateOption(index, 'text', (e.currentTarget as HTMLInputElement).value)}
									placeholder="Option text"
									class="flex-1 border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
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
						class="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
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
					<label class="block text-sm font-medium text-foreground mb-2">Correct Answer</label>
					<div class="flex space-x-4">
						<label class="flex items-center">
							<input
								type="radio"
								name="correctAnswer"
								value="true"
								class="h-4 w-4 text-primary focus:ring-ring border-border"
							/>
							<span class="ml-2 text-foreground">True</span>
						</label>
						<label class="flex items-center">
							<input
								type="radio"
								name="correctAnswer"
								value="false"
								class="h-4 w-4 text-primary focus:ring-ring border-border"
							/>
							<span class="ml-2 text-foreground">False</span>
						</label>
					</div>
				</div>
			{:else if questionType === 'fitb'}
				<div>
					<label for="fitbAnswer" class="block text-sm font-medium text-foreground">Correct Answer</label>
					<input
						type="text"
						name="correctAnswer"
						id="fitbAnswer"
						required
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex justify-end space-x-3">
		<a
			href="/admin/quizzes/{quiz.id}/edit"
			class="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-md text-sm font-medium transition-colors"
		>
			Cancel
		</a>
		<button
			type="submit"
			class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
		>
			Add Question
		</button>
	</div>
</form>
