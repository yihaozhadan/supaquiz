<script lang="ts">
	import { ListChecks, Zap, FileCheck, Users, ArrowRight } from 'lucide-svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { data } = $props();

	const stats = $derived([
		{
			label: 'Total Quizzes',
			value: data.totalQuizzes,
			icon: ListChecks
		},
		{
			label: 'Active Quizzes',
			value: data.activeQuizzes,
			icon: Zap
		},
		{
			label: 'Total Attempts',
			value: data.totalAttempts,
			icon: FileCheck
		},
		{
			label: 'Participants',
			value: data.totalAttempts,
			icon: Users
		}
	]);

	const statusConfig = [
		{ key: 'draft' as const, label: 'Draft', color: 'bg-secondary text-secondary-foreground' },
		{ key: 'active' as const, label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
		{ key: 'expired' as const, label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
	];

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
	}

	function relativeTime(date: Date | string): string {
		const now = new Date();
		const then = new Date(date);
		const diffMs = now.getTime() - then.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDay = Math.floor(diffHr / 24);
		return `${diffDay}d ago`;
	}
</script>

<div class="space-y-6">
	<!-- Stats Cards Row (6.2.1) -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<Card class="transition-shadow duration-200 hover:shadow-md">
				<CardContent class="p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{stat.label}
							</p>
							<p class="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
						</div>
						<div class="rounded-lg bg-muted p-2">
							<stat.icon class="h-5 w-5 text-muted-foreground" />
						</div>
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Content Grid: Activity (2/3) + Sidebar (1/3) -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Recent Activity Feed (6.2.2) -->
		<div class="lg:col-span-2">
			<Card>
				<CardHeader class="pb-3">
					<div class="flex items-center justify-between">
						<CardTitle class="text-base">Recent Activity</CardTitle>
						<Button href="/admin/quizzes" variant="ghost" size="sm" class="cursor-pointer gap-1 text-xs">
							View all
							<ArrowRight class="h-3 w-3" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{#if data.recentAttempts.length === 0}
						<div class="py-8 text-center">
							<p class="text-sm text-muted-foreground">No activity yet</p>
						</div>
					{:else}
						<div class="space-y-1">
							{#each data.recentAttempts as attempt, i}
								<div class="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-muted/50">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="truncate text-sm font-medium text-foreground">
												{attempt.participantName}
											</span>
											<span class="text-xs text-muted-foreground">took</span>
											<span class="truncate text-sm text-muted-foreground">
												{attempt.quizTitle}
											</span>
										</div>
										<p class="mt-0.5 text-xs text-muted-foreground">
											{formatTime(attempt.timeTakenSeconds)} &middot; {relativeTime(attempt.submittedAt)}
										</p>
									</div>
									<div class="ml-4 shrink-0">
										<Badge variant="secondary" class="font-mono text-xs">
											{attempt.score}/{attempt.totalQuestions}
										</Badge>
									</div>
								</div>
								{#if i < data.recentAttempts.length - 1}
									<Separator class="my-0" />
								{/if}
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Right Column: Quick Actions + Status -->
		<div class="space-y-6">
			<!-- Quick Actions (6.2.3) -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base">Quick Actions</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<Button href="/admin/quizzes/new" class="w-full cursor-pointer" size="lg">
						Create Quiz
					</Button>
					<Button href="/admin/quizzes" variant="outline" class="w-full cursor-pointer" size="lg">
						Import Quiz
					</Button>
				</CardContent>
			</Card>

			<!-- Quiz Status Overview (6.2.4) -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base">Quiz Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#each statusConfig as s}
							{@const total = data.totalQuizzes || 1}
							{@const pct = Math.round((data.statusCounts[s.key] / total) * 100)}
							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<span class="text-sm text-foreground">{s.label}</span>
									<span class="text-sm font-medium text-muted-foreground">
										{data.statusCounts[s.key]}
									</span>
								</div>
								<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full transition-all duration-500 ease-out {s.key === 'active'
											? 'bg-emerald-500'
											: s.key === 'expired'
												? 'bg-red-400'
												: 'bg-muted-foreground/30'}"
										style="width: {pct}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
