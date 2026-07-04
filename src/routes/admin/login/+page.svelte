<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2, LogIn } from 'lucide-svelte';

	let isSubmitting = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1 text-center">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
				<LogIn class="size-6 text-primary-foreground" />
			</div>
			<CardTitle class="text-2xl">Admin Login</CardTitle>
			<CardDescription>Sign in to manage your quizzes</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" class="space-y-4" use:enhance={() => {
				isSubmitting = true;
				return async () => {
					isSubmitting = false;
				};
			}}>
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<Input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						placeholder="Enter your username"
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
						disabled={isSubmitting}
					/>
				</div>

				{#if $page.form?.error}
					<div role="alert" class="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm text-center">
						{$page.form.error}
					</div>
				{/if}

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
