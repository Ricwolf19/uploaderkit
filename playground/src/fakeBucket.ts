import type { ScopeConfig, StoredFile } from 'uploaderkit'
import { resolveReplaceMode, resolveScopePrefix } from 'uploaderkit'

/**
 * The server's storage, minus the network.
 *
 * The demos run without a backend, but a strategy that invents its own key
 * teaches the wrong thing: it cannot show a sweep, and its keys do not match
 * the scope's `path`. This mirrors what `createStorage.upload` does — resolve
 * the key from the registry, then apply the scope's replace mode — so what the
 * playground displays is what a real bucket would hold.
 */
export type FakeBucket = {
	put(
		scope: ScopeConfig,
		name: string,
		entityId: string,
		file: File
	): {
		key: string
		replaced: string[]
	}
	keys(prefix?: string): string[]
	remove(key: string): void
}

export const createFakeBucket = (): FakeBucket => {
	// key -> a content token, so a re-upload of the same name with different
	// bytes is visible in the demo exactly as it is in the real url.
	const objects = new Map<string, string>()

	const contentToken = (file: File) =>
		`${file.size.toString(16)}${file.lastModified.toString(16)}`.slice(0, 16)

	return {
		put: (scope, name, entityId, file) => {
			const key = scope.path(entityId, {
				name: file.name,
				size: file.size,
				type: file.type,
				arrayBuffer: () => file.arrayBuffer(),
			})
			objects.set(key, contentToken(file))

			const replaced: string[] = []
			if (resolveReplaceMode(scope) === 'entity') {
				const prefix = resolveScopePrefix(scope, entityId)
				for (const existing of [...objects.keys()]) {
					if (existing === key) continue
					if (existing === prefix || existing.startsWith(`${prefix}/`)) {
						objects.delete(existing)
						replaced.push(existing)
					}
				}
			}
			return { key, replaced }
		},
		keys: prefix =>
			[...objects.keys()].filter(key => !prefix || key.startsWith(prefix)),
		remove: key => {
			objects.delete(key)
		},
	}
}

/** Merges an upload into a persisted list the way a real app must. */
export const reconcile = (
	saved: StoredFile[],
	stored: StoredFile[],
	replaced: string[]
): StoredFile[] => {
	const gone = new Set(replaced)
	const incoming = new Map(stored.map(file => [file.key, file]))
	// Drop what the sweep removed, then upsert by key — appending blindly is
	// what makes a list show the same file three times.
	const kept = saved.filter(
		file => !gone.has(file.key) && !incoming.has(file.key)
	)
	return [...kept, ...stored]
}
