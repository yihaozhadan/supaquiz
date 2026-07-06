<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { toasts } from '$lib/components/admin/toast';
	import { ArrowLeft, Loader2, Upload } from 'lucide-svelte';

	let { form } = $props();

	let isSubmitting = $state(false);
	let fileName = $state<string | null>(null);

	$effect(() => {
		if (form?.error) toasts.error(form.error);
	});

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		fileName = input.files?.[0]?.name ?? null;
	}
</script>

<PageHeader title="Import Quiz" description="Import a quiz from a previously exported JSON file">
	<Button href="/admin/quizzes" variant="outline" size="sm">
		<ArrowLeft class="size-4" />
		Back
	</Button>
</PageHeader>

<form
	method="POST"
	enctype="multipart/form-data"
	class="space-y-6"
	use:enhance={() => {
		isSubmitting = true;
		return async ({ result }) => {
			if (result.type !== 'redirect') isSubmitting = false;
		};
	}}
>
	<Card>
		<CardHeader>
			<CardTitle>Quiz JSON File</CardTitle>
			<CardDescription>
				Select a quiz export file (.json). The quiz will be imported as a draft with new IDs;
				referenced media files will be copied if available.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="file">File</Label>
				<input
					type="file"
					name="file"
					id="file"
					accept="application/json,.json"
					required
					disabled={isSubmitting}
					onchange={handleFileChange}
					class="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
				/>
				{#if fileName}
					<p class="text-sm text-muted-foreground">Selected: {fileName}</p>
				{/if}
			</div>
		</CardContent>
	</Card>

	<div class="flex justify-end gap-2">
		<Button href="/admin/quizzes" variant="outline" disabled={isSubmitting}>Cancel</Button>
		<Button type="submit" disabled={isSubmitting}>
			{#if isSubmitting}
				<Loader2 class="size-4 mr-2 animate-spin" />
			{:else}
				<Upload class="size-4 mr-2" />
			{/if}
			Import Quiz
		</Button>
	</div>
</form>
