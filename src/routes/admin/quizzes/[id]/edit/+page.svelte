<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const quiz = data.quiz;
	let intakeFormSchema = $state(typeof quiz.intakeFormSchema === 'string'
		? JSON.parse(quiz.intakeFormSchema)
		: quiz.intakeFormSchema);

	function addField() {
		intakeFormSchema = [...intakeFormSchema, { name: '', type: 'text', required: false }];
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
				<a href="/admin/quizzes" class="text-blue-600 hover:text-blue-800">← Back to Quizzes</a>
			</div>

			<h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Quiz: {quiz.title}</h1>

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

			<form method="POST" action="?/update" class="space-y-6">
				<input type="hidden" name="id" value={quiz.id} />
				<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
					<div class="md:grid md:grid-cols-3 md:gap-6">
						<div class="md:col-span-1">
							<h3 class="text-lg font-medium leading-6 text-gray-900">Basic Information</h3>
							<p class="mt-1 text-sm text-gray-500">
								Basic details about your quiz.
							</p>
						</div>
						<div class="mt-5 md:mt-0 md:col-span-2 space-y-4">
							<div>
								<label for="title" class="block text-sm font-medium text-gray-700">
									Title
								</label>
								<input
									type="text"
									name="title"
									id="title"
									value={quiz.title}
									required
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label for="description" class="block text-sm font-medium text-gray-700">
									Description
								</label>
								<textarea
									name="description"
									id="description"
									rows="3"
									required
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								>
									{quiz.description}
								</textarea>
							</div>

							<div>
								<label for="password" class="block text-sm font-medium text-gray-700">
									Password (optional)
								</label>
								<input
									type="text"
									name="password"
									id="password"
									value={quiz.password || ''}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
					<div class="md:grid md:grid-cols-3 md:gap-6">
						<div class="md:col-span-1">
							<h3 class="text-lg font-medium leading-6 text-gray-900">Quiz Settings</h3>
							<p class="mt-1 text-sm text-gray-500">
								Configure how the quiz behaves.
							</p>
						</div>
						<div class="mt-5 md:mt-0 md:col-span-2 space-y-4">
							<div>
								<label for="timeLimitSeconds" class="block text-sm font-medium text-gray-700">
									Time Limit (seconds, optional)
								</label>
								<input
									type="number"
									name="timeLimitSeconds"
									id="timeLimitSeconds"
									value={quiz.timeLimitSeconds || ''}
									min="0"
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label for="maxAttempts" class="block text-sm font-medium text-gray-700">
									Max Attempts
								</label>
								<input
									type="number"
									name="maxAttempts"
									id="maxAttempts"
									value={quiz.maxAttempts}
									min="1"
									required
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label for="maxParticipants" class="block text-sm font-medium text-gray-700">
									Max Participants
								</label>
								<input
									type="number"
									name="maxParticipants"
									id="maxParticipants"
									value={quiz.maxParticipants}
									min="1"
									required
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div class="flex items-center">
								<input
									type="checkbox"
									name="shuffleQuestions"
									id="shuffleQuestions"
									checked={quiz.shuffleQuestions}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label for="shuffleQuestions" class="ml-2 block text-sm text-gray-900">
									Shuffle Questions
								</label>
							</div>

							<div class="flex items-center">
								<input
									type="checkbox"
									name="allowBackNavigation"
									id="allowBackNavigation"
									checked={quiz.allowBackNavigation}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label for="allowBackNavigation" class="ml-2 block text-sm text-gray-900">
									Allow Back Navigation
								</label>
							</div>

							<div>
								<label for="revealAnswersAfter" class="block text-sm font-medium text-gray-700">
									Reveal Answers After
								</label>
								<select
									name="revealAnswersAfter"
									id="revealAnswersAfter"
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								>
									<option value="immediate" selected={quiz.revealAnswersAfter === 'immediate'}
										>Immediate</option
									>
									<option value="never" selected={quiz.revealAnswersAfter === 'never'}
										>Never</option
									>
								</select>
							</div>

							<div>
								<label for="activateAt" class="block text-sm font-medium text-gray-700">
									Activation Date (optional)
								</label>
								<input
									type="datetime-local"
									name="activateAt"
									id="activateAt"
									value={quiz.activateAt ? new Date(quiz.activateAt).toISOString().slice(0, 16) : ''}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>

							<div>
								<label for="expireAt" class="block text-sm font-medium text-gray-700">
									Expiration Date (optional)
								</label>
								<input
									type="datetime-local"
									name="expireAt"
									id="expireAt"
									value={quiz.expireAt ? new Date(quiz.expireAt).toISOString().slice(0, 16) : ''}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
					<div class="md:grid md:grid-cols-3 md:gap-6">
						<div class="md:col-span-1">
							<h3 class="text-lg font-medium leading-6 text-gray-900">Intake Form</h3>
							<p class="mt-1 text-sm text-gray-500">
								Fields to collect from participants before starting the quiz.
							</p>
						</div>
						<div class="mt-5 md:mt-0 md:col-span-2">
							<div class="space-y-4">
								{#each intakeFormSchema as field, index}
									<div class="border rounded-lg p-4 bg-gray-50">
										<div class="grid grid-cols-3 gap-4">
											<div>
												<label class="block text-sm font-medium text-gray-700">
													Field Name
												</label>
												<input
													type="text"
													name={`intakeFormSchema[${index}].name`}
													value={field.name}
													class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
												/>
											</div>
											<div>
												<label class="block text-sm font-medium text-gray-700">
													Type
												</label>
												<select
													name={`intakeFormSchema[${index}].type`}
													class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
												>
													<option value="text" selected={field.type === 'text'}>Text</option>
													<option value="email" selected={field.type === 'email'}
														>Email</option
													>
													<option value="number" selected={field.type === 'number'}
														>Number</option
													>
												</select>
											</div>
											<div>
												<label class="block text-sm font-medium text-gray-700">
													Required
												</label>
												<input
													type="checkbox"
													name={`intakeFormSchema[${index}].required`}
													checked={field.required}
													class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
												/>
											</div>
										</div>
									</div>
								{/each}
								<button
									type="button"
									onclick={addField}
									class="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
								>
									+ Add Field
								</button>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
					<div class="md:grid md:grid-cols-3 md:gap-6">
						<div class="md:col-span-1">
							<h3 class="text-lg font-medium leading-6 text-gray-900">Questions</h3>
							<p class="mt-1 text-sm text-gray-500">
								{quiz.questions.length}/50 questions
							</p>
						</div>
						<div class="mt-5 md:mt-0 md:col-span-2">
							<div class="space-y-4">
								{#each quiz.questions as q, index}
									<div class="border rounded-lg p-4 bg-gray-50">
										<div class="flex justify-between items-start mb-2">
											<span class="text-sm font-medium text-gray-900">
												{index + 1}. {q.type.toUpperCase()}
											</span>
											<span class="text-sm text-gray-500">{q.text}</span>
										</div>
										<div class="flex space-x-2">
											<button
												type="button"
												class="text-blue-600 hover:text-blue-800 text-sm"
											>
												Edit
											</button>
											<button
												type="button"
												class="text-red-600 hover:text-red-800 text-sm"
											>
												Delete
											</button>
										</div>
									</div>
								{/each}
								<a
									href="/admin/quizzes/{quiz.id}/questions"
									class="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
								>
									+ Add Question
								</a>
							</div>
						</div>
					</div>
				</div>

				<div class="flex justify-end space-x-3">
					<a
						href="/admin/quizzes"
						class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
					>
						Cancel
					</a>
					<button
						type="submit"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
					>
						Save Changes
					</button>
				</div>
			</form>
		</div>
	</main>
</div>
