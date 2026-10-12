export type MediaKind = 'image' | 'audio' | 'video' | 'other';

/** Classify a media URL by its file extension, ignoring query/hash. */
export function mediaKind(url: string): MediaKind {
	const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
	if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
	if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
	if (['mp4', 'webm', 'ogv'].includes(ext)) return 'video';
	return 'other';
}
