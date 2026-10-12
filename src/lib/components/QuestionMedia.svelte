<script lang="ts">
	import { mediaKind } from '$lib/media';

	let { mediaUrl }: { mediaUrl: string | null | undefined } = $props();
</script>

{#if mediaUrl}
	{#if mediaKind(mediaUrl) === 'image'}
		<img src={mediaUrl} alt="Question media" class="max-h-80 w-full rounded-md object-contain" />
	{:else if mediaKind(mediaUrl) === 'audio'}
		<audio src={mediaUrl} controls class="w-full"></audio>
	{:else if mediaKind(mediaUrl) === 'video'}
		<video src={mediaUrl} controls class="max-h-80 w-full rounded-md">
			<track kind="captions" />
		</video>
	{:else}
		<!-- mediaUrl is a dynamic upload/external URL, not an app route -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={mediaUrl} target="_blank" rel="noopener noreferrer" class="text-primary underline">
			View media
		</a>
	{/if}
{/if}
