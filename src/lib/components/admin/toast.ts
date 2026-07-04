import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function push(message: string, type: Toast['type'] = 'info', duration = 4000) {
		const id = crypto.randomUUID();
		update((toasts) => [...toasts, { id, message, type, duration }]);
		if (duration > 0) {
			setTimeout(() => dismiss(id), duration);
		}
		return id;
	}

	function dismiss(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => push(message, 'success', duration),
		error: (message: string, duration?: number) => push(message, 'error', duration ?? 6000),
		info: (message: string, duration?: number) => push(message, 'info', duration),
		dismiss
	};
}

export const toasts = createToastStore();
