<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="mb-6">
	<a href="/admin/quizzes" class="text-blue-600 hover:text-blue-800">← Back to Quizzes</a>
</div>

<h1 class="text-2xl font-bold text-foreground mb-6">Create New Quiz</h1>

{#if form?.errors}
	<div class="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
		{#each Object.entries(form.errors as Record<string, string[]>) as [field, errors]}
			{#each errors as error}
				<div>{field}: {error}</div>
			{/each}
		{/each}
	</div>
{/if}

<form method="POST" class="space-y-6">
	<div class="bg-card shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-border">
		<div class="md:grid md:grid-cols-3 md:gap-6">
			<div class="md:col-span-1">
				<h3 class="text-lg font-medium leading-6 text-foreground">Basic Information</h3>
				<p class="mt-1 text-sm text-muted-foreground">Basic details about your quiz.</p>
			</div>
			<div class="mt-5 md:mt-0 md:col-span-2 space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium text-foreground">Title</label>
					<input
						type="text"
						name="title"
						id="title"
						required
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					/>
				</div>

				<div>
					<label for="description" class="block text-sm font-medium text-foreground">Description</label>
					<textarea
						name="description"
						id="description"
						rows="3"
						required
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					></textarea>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-foreground">Password (optional)</label>
					<input
						type="text"
						name="password"
						id="password"
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-card shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-border">
		<div class="md:grid md:grid-cols-3 md:gap-6">
			<div class="md:col-span-1">
				<h3 class="text-lg font-medium leading-6 text-foreground">Quiz Settings</h3>
				<p class="mt-1 text-sm text-muted-foreground">Configure how the quiz behaves.</p>
			</div>
			<div class="mt-5 md:mt-0 md:col-span-2 space-y-4">
				<div>
					<label for="timeLimitSeconds" class="block text-sm font-medium text-foreground">
						Time Limit (seconds, optional)
					</label>
					<input
						type="number"
						name="timeLimitSeconds"
						id="timeLimitSeconds"
						min="0"
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					/>
				</div>

				<div>
					<label for="maxAttempts" class="block text-sm font-medium text-foreground">Max Attempts</label>
					<input
						type="number"
						name="maxAttempts"
						id="maxAttempts"
						value="1"
						min="1"
						required
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					/>
				</div>

				<div>
					<label for="maxParticipants" class="block text-sm font-medium text-foreground">Max Participants</label>
					<input
						type="number"
						name="maxParticipants"
						id="maxParticipants"
						min="1"
						required
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
					/>
				</div>

				<div class="flex items-center">
					<input
						type="checkbox"
						name="shuffleQuestions"
						id="shuffleQuestions"
						class="h-4 w-4 text-primary focus:ring-ring border-border rounded"
					/>
					<label for="shuffleQuestions" class="ml-2 block text-sm text-foreground">Shuffle Questions</label>
				</div>

				<div class="flex items-center">
					<input
						type="checkbox"
						name="allowBackNavigation"
						id="allowBackNavigation"
						checked
						class="h-4 w-4 text-primary focus:ring-ring border-border rounded"
					/>
					<label for="allowBackNavigation" class="ml-2 block text-sm text-foreground">
						Allow Back Navigation
					</label>
				</div>

				<div>
					<label for="revealAnswersAfter" class="block text-sm font-medium text-foreground">
						Reveal Answers After
					</label>
					<select
						name="revealAnswersAfter"
						id="revealAnswersAfter"
						class="mt-1 block w-full border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
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
			class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
		>
			Create Quiz
		</button>
	</div>
</form>
