import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('Example test', () => {
	it('should pass a simple test', () => {
		expect(true).toBe(true);
	});

	it('should have jest-dom matchers available', () => {
		const div = document.createElement('div');
		div.innerHTML = '<button>Click me</button>';
		document.body.appendChild(div);
		expect(div.querySelector('button')).toBeInTheDocument();
		document.body.removeChild(div);
	});
});
