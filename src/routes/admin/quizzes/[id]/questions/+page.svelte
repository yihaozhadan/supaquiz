<script lang="ts">
	import { page } from '$app/stores';
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

	// For single choice, ensure only one option is correct
	function setSingleCorrect(index: number) {
		options = options.map((opt, i) => ({ ...opt, isCorrect: i === index }));
	}
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex">
					<div class="flex-shrink-0 flex items-center">
						<a href="/admin" class="text-xl font-bold text-gray-900 hover:text-gray-700">
							Admin Dashboard
						</a>
					</div>
				</div>
				<div class="flex items-center">
					<span class="mr-4 text-sm text-gray-700">
						Logged in as: {$page.data.admin?.username}
					</span>
					<form method="POST" action="/admin/logout">
						<button
							type="submit"
							class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
						>
							Logout
						</button>
					</form>
				</div>
			</div>
		</div>
	</nav>

	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<div class="px-4 py-6 sm:px-0">
			<div class="mb-6">
				<a href="/admin/quizzes/{quiz.id}/edit" class="text-blue-600 hover:text-blue-800"
					>← Back to Quiz Editor</a
				>
			</div>

			<h1 class="text-2xl font-bold text-gray-900 mb-6">Add Question to: {quiz.title}</h1>

			{#if form?.errors}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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

				<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
					<div class="space-y-4">
						<div>
							<label for="type" class="block text-sm font-medium text-gray-700">
								Question Type
							</label>
							<select
								bind:value={questionType}
								name="type"
								id="type"
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							>
								<option value="mcq_single">Multiple Choice (Single Answer)</option>
								<option value="mcq_multi">Multiple Choice (Multiple Answers)</option>
								<option value="true_false">True/False</option>
								<option value="fitb">Fill in the Blank</option>
							</select>
						</div>

						<div>
							<label for="text" class="block text-sm font-medium text-gray-700">
								Question Text
							</label>
							<textarea
								name="text"
								id="text"
								rows="3"
								required
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							></textarea>
						</div>

						<div>
							<label for="explanation" class="block text-sm font-medium text-gray-700">
								Explanation (optional)
							</label>
							<textarea
								name="explanation"
								id="explanation"
								rows="2"
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							></textarea>
						</div>

						{#if questionType === 'mcq_single' || questionType === 'mcq_multi'}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Options</label>
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
													class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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
													class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
												/>
											{/if}
											<input
												type="text"
												name={`options[${index}].text`}
												value={option.text}
												oninput={(e) =>
													updateOption(
														index,
														'text',
														(e.currentTarget as HTMLInputElement).value
													)}
												placeholder="Option text"
												class="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
									value={JSON.stringify(
										options.filter((o) => o.isCorrect).map((o) => o.id)
									)}
								/>
							</div>
						{:else if questionType === 'true_false'}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
								<div class="flex space-x-4">
									<label class="flex items-center">
										<input
											type="radio"
											name="correctAnswer"
											value="true"
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
										/>
										<span class="ml-2">True</span>
									</label>
									<label class="flex items-center">
										<input
											type="radio"
											name="correctAnswer"
											value="false"
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
										/>
										<span class="ml-2">False</span>
									</label>
								</div>
							</div>
						{:else if questionType === 'fitb'}
							<div>
								<label for="fitbAnswer" class="block text-sm font-medium text-gray-700">
									Correct Answer
								</label>
								<input
									type="text"
									name="correctAnswer"
									id="fitbAnswer"
									required
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
						{/if}
					</div>
				</div>

				<div class="flex justify-end space-x-3">
					<a
						href="/admin/quizzes/{quiz.id}/edit"
						class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
					>
						Cancel
					</a>
					<button
						type="submit"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
					>
						Add Question
					</button>
				</div>
			</form>
		</div>
	</main>
</div>
