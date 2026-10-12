import { describe, it, expect } from 'vitest';
import { mediaKind } from './media';

describe('mediaKind', () => {
	it('classifies image extensions', () => {
		for (const url of [
			'/uploads/a.jpg',
			'/uploads/b.jpeg',
			'/uploads/c.PNG',
			'/uploads/d.gif',
			'https://cdn.example.com/e.webp'
		]) {
			expect(mediaKind(url)).toBe('image');
		}
	});

	it('classifies audio and video extensions', () => {
		expect(mediaKind('/uploads/a.mp3')).toBe('audio');
		expect(mediaKind('/uploads/b.wav')).toBe('audio');
		expect(mediaKind('/uploads/c.ogg')).toBe('audio');
		expect(mediaKind('/uploads/d.mp4')).toBe('video');
		expect(mediaKind('/uploads/e.webm')).toBe('video');
		expect(mediaKind('/uploads/f.ogv')).toBe('video');
	});

	it('ignores query strings and fragments', () => {
		expect(mediaKind('/uploads/a.jpg?v=2#frag')).toBe('image');
		expect(mediaKind('/uploads/b.mp4?token=xyz')).toBe('video');
	});

	it('falls back to other for unknown or missing extensions', () => {
		expect(mediaKind('/uploads/a.pdf')).toBe('other');
		expect(mediaKind('/uploads/noext')).toBe('other');
		expect(mediaKind('')).toBe('other');
	});
});
