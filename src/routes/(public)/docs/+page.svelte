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
	<title>Documentation — SupaQuiz</title>
	<meta name="description" content="Learn how to take part in a quiz on SupaQuiz." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
	<Breadcrumb>
		<BreadcrumbList>
			<BreadcrumbItem>
				<BreadcrumbLink href="/">Home</BreadcrumbLink>
			</BreadcrumbItem>
			<BreadcrumbSeparator />
			<BreadcrumbItem>
				<BreadcrumbPage>Documentation</BreadcrumbPage>
			</BreadcrumbItem>
		</BreadcrumbList>
	</Breadcrumb>

	<div class="mt-6 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Documentation</h1>
		<p class="text-muted-foreground">Guides on taking quizzes and using SupaQuiz.</p>
	</div>

	<div
		class="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center"
	>
		<p class="text-muted-foreground">Documentation content will appear here.</p>
	</div>
</div>
