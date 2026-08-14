import type { StorageProvider, Visibility } from '../index'

type StoredObject = {
	body: Uint8Array
	contentType: string
	visibility: Visibility
}

/**
 * In-memory provider for tests and local development. Signed URLs are fake but
 * carry the expiry, so an assertion can check TTL wiring without a cloud
 * account.
 */
export const createMemoryProvider = (): StorageProvider & {
	/** Test hook: inspect what was stored without going through `get`. */
	objects: Map<string, StoredObject>
} => {
	const objects = new Map<string, StoredObject>()

	return {
		name: 'memory',
		capabilities: { signedUrl: true, resumable: false, rangeRead: true },
		objects,

		put: async ({ key, body, contentType, visibility }) => {
			objects.set(key, { body, contentType, visibility })
			return { key, url: `memory://${key}` }
		},

		get: async key => {
			const object = objects.get(key)
			if (!object) throw new Error(`memory provider: no object at "${key}"`)
			return object.body
		},

		delete: async key => objects.delete(key),

		signedUrl: async (key, { expiresIn }) =>
			`memory://signed/${key}?expires=${expiresIn}`,

		list: async prefix =>
			[...objects.entries()]
				.filter(([key]) => key.startsWith(prefix))
				.map(([key, object]) => ({ key, size: object.body.byteLength })),
	}
}
