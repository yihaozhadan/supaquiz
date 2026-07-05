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
	<title>About — SupaQuiz</title>
	<meta name="description" content="About SupaQuiz, an open-source self-hosted quiz platform." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
	<Breadcrumb>
		<BreadcrumbList>
			<BreadcrumbItem>
				<BreadcrumbLink href="/">Home</BreadcrumbLink>
			</BreadcrumbItem>
			<BreadcrumbSeparator />
			<BreadcrumbItem>
				<BreadcrumbPage>About</BreadcrumbPage>
			</BreadcrumbItem>
		</BreadcrumbList>
	</Breadcrumb>
</div>

<div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
	<h1 class="text-3xl font-bold tracking-tight">About SupaQuiz</h1>
	<p class="mt-4 text-muted-foreground leading-relaxed">
		SupaQuiz is an open-source, self-hosted quiz platform. This page will describe the project, its
		technology stack, and how to contribute.
	</p>
</div>
