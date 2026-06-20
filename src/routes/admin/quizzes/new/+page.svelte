<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { form } = $props();
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

			<h1 class="text-2xl font-bold text-gray-900 mb-6">Create New Quiz</h1>

			{#if form?.errors}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{#each Object.entries(form.errors as Record<string, string[]>) as [field, errors]}
						{#each errors as error}
							<div>{field}: {error}</div>
						{/each}
					{/each}
				</div>
			{/if}

			<form method="POST" class="space-y-6">
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
								></textarea>
							</div>

							<div>
								<label for="password" class="block text-sm font-medium text-gray-700">
									Password (optional)
								</label>
								<input
									type="text"
									name="password"
									id="password"
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
									value="1"
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
									checked
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
									<option value="immediate">Immediate</option>
									<option value="never">Never</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
					>
						Create Quiz
					</button>
				</div>
			</form>
		</div>
	</main>
</div>
