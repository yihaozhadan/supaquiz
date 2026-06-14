import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { admin } from '$lib/server/db/schema';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Bootstrap admin on first startup
	const existingAdmin = await db.query.admin.findFirst();
	if (!existingAdmin) {
		const adminUser = env.ADMIN_USER;
		const adminPassHash = env.ADMIN_PASS_HASH;

		if (!adminUser || !adminPassHash) {
			throw new Error('ADMIN_USER and ADMIN_PASS_HASH must be set for initial admin setup');
		}

		// Decode base64 if the hash is base64 encoded (to avoid shell variable expansion issues)
		let passwordHash = adminPassHash;
		try {
			// Try to decode as base64, if it fails use as-is
			const decoded = Buffer.from(adminPassHash, 'base64').toString('utf-8');
			if (decoded.startsWith('$argon2id$')) {
				passwordHash = decoded;
			}
		} catch {
			// Not base64, use as-is
		}

		await db.insert(admin).values({
			username: adminUser,
			passwordHash
		});
		console.log('Admin account created from environment variables');
	}

	return resolve(event);
}
