import { defineScopes as defineCoreScopes, ScopeError } from './scopes'
import type {
	FileLike,
	ScopeConfig as CoreScopeConfig,
	ScopeRegistry,
} from './types'
/**
 * What an upload does to what the entity already had.
 *
 * - `'entity'` — after the put, every other object under the entity's prefix
 *   is deleted. The scope holds exactly one file and leaves no history.
 * - `'key'` — only the object at the same key is replaced, siblings stay.
 * - `false` — nothing is removed; the bucket keeps every version.
 */
export type ReplaceMode = 'entity' | 'key' | false

export type ScopeConfig = CoreScopeConfig & {
	/**
	 * How many files one entity may hold here — on the scope, not on the
	 * uploader, so the server knows the arity too.
	 *
	 * @defaultValue 1
	 * @see AGENTS.md §3 — "Arity lives on the scope"
	 */
	maxFiles?: number
	/**
	 * Overrides {@link resolveReplaceMode}. Rarely needed: the derived default
	 * already leaves no orphans.
	 */
	replace?: ReplaceMode
	/**
	 * Objects an `'entity'` replace may delete. Defaults to the folder of the
	 * resolved key. Set it when that folder is shared with another scope.
	 */
	prefix?: (entityId: string) => string
	/**
	 * This scope keeps its objects as HISTORY: the server refuses the DELETE
	 * route for it, so no client — buggy or malicious — can destroy the trail.
	 * The default is the opposite: removals are expected to delete from
	 * storage, because a scope with stable keys can never reclaim an orphan.
	 */
	keepOnRemove?: boolean
}

/** Same registry, narrowed so `get` returns the extended config. */
export type ExtendedScopeRegistry<T extends Record<string, ScopeConfig>> = Omit<
	ScopeRegistry<T>,
	'get'
> & { get(name: string): ScopeConfig }

const PROBE_ENTITY = '__entity__'
const probeFile = (name: string): FileLike => ({
	name,
	size: 0,
	type: '',
	arrayBuffer: async () => new ArrayBuffer(0),
})

/** True when `path` returns the same key whatever the file is called. */
export const hasStableKey = (scope: ScopeConfig): boolean =>
	scope.path(PROBE_ENTITY, probeFile('a.png')) ===
	scope.path(PROBE_ENTITY, probeFile('b.png'))

/**
 * The mode a scope runs in when it does not name one.
 *
 * @see AGENTS.md §3 — why a stable key needs no sweep and a name-carrying one does
 */
export const resolveReplaceMode = (scope: ScopeConfig): ReplaceMode => {
	if (scope.replace !== undefined) return scope.replace
	if ((scope.maxFiles ?? 1) > 1) return 'key'
	return hasStableKey(scope) ? 'key' : 'entity'
}

const dirname = (key: string) => {
	const cut = key.lastIndexOf('/')
	return cut === -1 ? '' : key.slice(0, cut)
}

/** Folder an `'entity'` replace is allowed to sweep. */
export const resolveScopePrefix = (
	scope: ScopeConfig,
	entityId: string
): string =>
	scope.prefix?.(entityId) ??
	dirname(scope.path(entityId, probeFile('probe.bin')))

/** `a` contains `b`, counting only whole path segments. */
const containsPath = (a: string, b: string) => b === a || b.startsWith(`${a}/`)

const assertExtendedDefinition = (name: string, scope: ScopeConfig): void => {
	if (scope.maxFiles !== undefined) {
		if (!Number.isInteger(scope.maxFiles) || scope.maxFiles < 1) {
			throw new ScopeError(
				`Scope "${name}": "maxFiles" must be a positive integer, received ${String(scope.maxFiles)}`
			)
		}
	}

	// The contradiction the derived default exists to prevent: a scope that
	// holds a collection cannot also erase the collection on every upload.
	if (scope.replace === 'entity' && (scope.maxFiles ?? 1) > 1) {
		throw new ScopeError(
			`Scope "${name}": replace "entity" contradicts maxFiles ${scope.maxFiles} — ` +
				'an entity-wide replace would delete the other files on the next upload. ' +
				"Use 'key' to overwrite one slot, or false to keep every version."
		)
	}

	if (
		resolveReplaceMode(scope) === 'entity' &&
		resolveScopePrefix(scope, PROBE_ENTITY) === ''
	) {
		throw new ScopeError(
			`Scope "${name}": replace "entity" needs a folder to sweep, but "path" resolves to a ` +
				'bucket-root key. Nest the key under a folder, or declare "prefix".'
		)
	}
}

/**
 * Rejects a registry where sweeping one scope would reach another's objects.
 *
 * `path` shapes are compared through a placeholder entity, so this catches the
 * real hazard — two scopes sharing a folder for the SAME entity — while two
 * scopes rooted at different entity folders stay independent. A false positive
 * is answered with an explicit `prefix`, and the message says so.
 */
const assertNoSweepCollision = (scopes: Record<string, ScopeConfig>): void => {
	const entries = Object.entries(scopes)

	for (const [name, scope] of entries) {
		if (resolveReplaceMode(scope) !== 'entity') continue
		const prefix = resolveScopePrefix(scope, PROBE_ENTITY)

		for (const [otherName, other] of entries) {
			if (otherName === name) continue
			const otherKey = other.path(PROBE_ENTITY, probeFile('probe.bin'))
			if (!containsPath(prefix, otherKey)) continue

			throw new ScopeError(
				`Scope "${name}" replaces per entity and would sweep "${prefix}", which also holds ` +
					`scope "${otherName}" — an upload to one would delete the other's files. ` +
					'Give each its own folder, or declare a narrower "prefix".'
			)
		}
	}
}

/**
 * `defineScopes` with the replace semantics layered on. Delegates to the core
 * for everything it already validates (path, maxBytes, accept, category,
 * compress) and adds only what the extra fields make possible to get wrong.
 */
export const defineScopes = <T extends Record<string, ScopeConfig>>(
	scopes: T
): ExtendedScopeRegistry<T> => {
	for (const [name, scope] of Object.entries(scopes)) {
		assertExtendedDefinition(name, scope)
	}
	assertNoSweepCollision(scopes)

	return defineCoreScopes(scopes) as ExtendedScopeRegistry<T>
}
