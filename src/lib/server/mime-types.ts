export type FileKind = 'image' | 'audio' | 'video' | 'other';

export interface MimeTypeInfo {
	mime: string;
	kind: FileKind;
}

export const EXT_TO_MIME: Record<string, MimeTypeInfo> = {
	jpg: { mime: 'image/jpeg', kind: 'image' },
	jpeg: { mime: 'image/jpeg', kind: 'image' },
	png: { mime: 'image/png', kind: 'image' },
	gif: { mime: 'image/gif', kind: 'image' },
	webp: { mime: 'image/webp', kind: 'image' },
	mp3: { mime: 'audio/mpeg', kind: 'audio' },
	wav: { mime: 'audio/wav', kind: 'audio' },
	ogg: { mime: 'audio/ogg', kind: 'audio' },
	mp4: { mime: 'video/mp4', kind: 'video' },
	webm: { mime: 'video/webm', kind: 'video' },
	ogv: { mime: 'video/ogg', kind: 'video' }
};

export const MIME_MAP: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	ogg: 'audio/ogg',
	mp4: 'video/mp4',
	webm: 'video/webm',
	ogv: 'video/ogg'
};
