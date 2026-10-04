<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2, LogIn, TriangleAlert } from 'lucide-svelte';

	let { form } = $props();

	let isSubmitting = $state(false);
	let password = $state('');
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-4"
>
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1 text-center">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
				<LogIn class="size-6 text-primary-foreground" />
			</div>
			<CardTitle class="text-2xl">Admin Login</CardTitle>
			<CardDescription>Sign in to manage your quizzes</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				class="space-y-4"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						await update();
						if (result.type === 'redirect') return;
						if (result.type === 'failure') password = '';
						isSubmitting = false;
					};
				}}
			>
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<Input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						placeholder="Enter your username"
						value={form?.username ?? ''}
						aria-invalid={!!form?.error}
						disabled={isSubmitting}
					/>
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
						placeholder="Enter your password"
						bind:value={password}
						aria-invalid={!!form?.error}
						disabled={isSubmitting}
					/>
				</div>

				<div aria-live="polite">
					{#if form?.error}
						<div
							role="alert"
							class="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
						>
							<TriangleAlert class="mt-0.5 size-4 shrink-0" />
							<span>{form.error}</span>
						</div>
					{/if}
				</div>

				<Button type="submit" class="w-full" size="lg" disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="size-4 animate-spin" />
					{/if}
					Sign in
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
