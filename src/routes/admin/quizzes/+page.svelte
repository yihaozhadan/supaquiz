<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	const statusColors: Record<string, string> = {
		draft: 'bg-gray-100 text-gray-800',
		active: 'bg-green-100 text-green-800',
		expired: 'bg-red-100 text-red-800'
	};

	async function handleAction(event: Event, action: string) {
		event.preventDefault();
	}
</script>

<div class="flex justify-between items-center mb-6">
	<h1 class="text-2xl font-bold text-foreground">Quizzes</h1>
	<a
		href="/admin/quizzes/new"
		class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
	>
		Create Quiz
	</a>
</div>

{#if form?.error}
	<div class="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
		{form.error}
	</div>
{/if}

{#if form?.success}
	<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
		{form.success}
	</div>
{/if}

<div class="bg-card shadow overflow-hidden border border-border rounded-lg">
	<table class="min-w-full divide-y divide-border">
		<thead class="bg-muted">
			<tr>
				<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Title
				</th>
				<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Status
				</th>
				<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Questions
				</th>
				<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Attempts
				</th>
				<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Participants
				</th>
				<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Created
				</th>
				<th scope="col" class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Actions
				</th>
			</tr>
		</thead>
		<tbody class="bg-card divide-y divide-border">
			{#each data.quizzes as quiz}
				<tr>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm font-medium text-foreground">{quiz.title}</div>
						<div class="text-sm text-muted-foreground">{quiz.description}</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {statusColors[quiz.status]}">
							{quiz.status}
						</span>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
						{quiz.questionCount}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
						{quiz.attemptCount}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
						{quiz.activeParticipantCount}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
						{new Date(quiz.createdAt).toLocaleDateString()}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
						<div class="flex justify-end space-x-2">
							<a href="/admin/quizzes/{quiz.id}/edit" class="text-blue-600 hover:text-blue-900">
								Edit
							</a>
							{#if quiz.status === 'draft'}
								<form method="POST" action="?/toggleStatus" class="inline">
									<input type="hidden" name="id" value={quiz.id} />
									<input type="hidden" name="status" value="active" />
									<button type="submit" class="text-green-600 hover:text-green-900">
										Activate
									</button>
								</form>
							{:else if quiz.status === 'active'}
								<form method="POST" action="?/toggleStatus" class="inline">
									<input type="hidden" name="id" value={quiz.id} />
									<input type="hidden" name="status" value="draft" />
									<button type="submit" class="text-yellow-600 hover:text-yellow-900">
										Deactivate
									</button>
								</form>
							{/if}
							<form method="POST" action="?/duplicate" class="inline">
								<input type="hidden" name="id" value={quiz.id} />
								<button type="submit" class="text-purple-600 hover:text-purple-900">
									Duplicate
								</button>
							</form>
							<form method="POST" action="?/delete" class="inline">
								<input type="hidden" name="id" value={quiz.id} />
								<button
									type="submit"
									class="text-red-600 hover:text-red-900"
									onclick={(e) => {
										if (!confirm('Are you sure you want to delete this quiz?')) {
											e.preventDefault();
										}
									}}
								>
									Delete
								</button>
							</form>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if data.quizzes.length === 0}
		<div class="text-center py-12">
			<p class="text-muted-foreground">No quizzes found. Create your first quiz!</p>
		</div>
	{/if}
</div>
