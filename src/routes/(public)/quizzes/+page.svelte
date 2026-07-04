<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbList,
		BreadcrumbPage,
		BreadcrumbSeparator
	} from '$lib/components/ui/breadcrumb';
</script>

<svelte:head>
	<title>Browse Quizzes — SupaQuiz</title>
	<meta name="description" content="Browse available public quizzes on SupaQuiz." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
	<Breadcrumb>
		<BreadcrumbList>
			<BreadcrumbItem>
				<BreadcrumbLink href="/">Home</BreadcrumbLink>
			</BreadcrumbItem>
			<BreadcrumbSeparator />
			<BreadcrumbItem>
				<BreadcrumbPage>Browse Quizzes</BreadcrumbPage>
			</BreadcrumbItem>
		</BreadcrumbList>
	</Breadcrumb>

	<div class="mt-6 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Browse Quizzes</h1>
		<p class="text-muted-foreground">Find and take available quizzes.</p>
	</div>

	<div
		class="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center"
	>
		<p class="text-muted-foreground">The quiz directory will appear here.</p>
	</div>
</div>
