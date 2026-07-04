<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';

	const year = new Date().getFullYear();

	const linkColumns = [
		{
			title: 'Explore',
			links: [
				{ href: '/quizzes', label: 'Browse Quizzes' },
				{ href: '/docs', label: 'Documentation' },
				{ href: '/about', label: 'About' }
			]
		},
		{
			title: 'Account',
			links: [
				{ href: '/admin/login', label: 'Admin Login' },
				{ href: '/quizzes', label: 'Participant Login' }
			]
		}
	];
</script>

<footer class="border-t bg-background">
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<span
						class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold"
					>
						S
					</span>
					<span class="text-lg font-semibold tracking-tight">SupaQuiz</span>
				</div>
				<p class="text-sm text-muted-foreground max-w-xs">
					An open-source, self-hosted quiz platform. Build quizzes, collect responses, and grade
					automatically — all on your own server.
				</p>
				<span
					class="inline-flex items-center rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
				>
					v0.0.1
				</span>
			</div>

			{#each linkColumns as column}
				<div class="space-y-3">
					<h2 class="text-sm font-semibold text-foreground">{column.title}</h2>
					<ul class="space-y-2">
						{#each column.links as link}
							<li>
								<a
									href={link.href}
									class="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
								>
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div
			class="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row"
		>
			<p class="text-sm text-muted-foreground">
				© {year} SupaQuiz. Licensed under the MIT License.
			</p>
			<div class="flex items-center gap-4">
				<span
					class="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
				>
					Self-hosted with SupaQuiz
				</span>
				<a
					href="https://github.com/yihaozhadan/supaquiz"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="GitHub repository"
				>
					<ExternalLink class="h-5 w-5" />
				</a>
			</div>
		</div>
	</div>
</footer>
