import { FILE_CATEGORY_CONFIG } from './constants'
import { toAcceptAttribute } from './file'
import type { UploaderLabels } from './labels'
import type {
	FileLike,
	ReplaceMode,
	ScopeConfig,
	ScopeRegistry,
	StorageProvider,
	ValidationResult,
} from './types'
import { validateFile } from './validation'

/** Thrown for a definition or wiring mistake — never for a user's bad file. */
export class ScopeError extends Error {
	override name = 'ScopeError'
}

/** Stand-in entity used to compare the SHAPE of two `path` callbacks. */
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

const assertDefinition = (name: string, scope: ScopeConfig): void => {
	if (typeof scope.path !== 'function') {
		throw new ScopeError(`Scope "${name}": "path" must be a function`)
	}
	if (!Number.isFinite(scope.maxBytes) || scope.maxBytes <= 0) {
		throw new ScopeError(
			`Scope "${name}": "maxBytes" must be a positive number`
		)
	}
	if (scope.accept.length === 0) {
		throw new ScopeError(
			`Scope "${name}": "accept" cannot be empty — list the extensions this scope takes`
		)
	}

	// A scope narrows its category, never widens it. Otherwise a 'pdf' scope
	// could quietly start taking executables.
	if (scope.category && scope.category !== 'any') {
		const allowed = FILE_CATEGORY_CONFIG[scope.category].extensions
		const outside = scope.accept.filter(
			extension => !allowed.includes(extension)
		)
		if (outside.length > 0) {
			throw new ScopeError(
				`Scope "${name}": ${outside.join(', ')} not allowed by category "${scope.category}"`
			)
		}
	}

	if (scope.compress) {
		const imageOnly = FILE_CATEGORY_CONFIG.image.extensions
		const notImages = scope.accept.filter(
			extension => !imageOnly.includes(extension)
		)
		if (notImages.length > 0) {
			throw new ScopeError(
				`Scope "${name}": "compress" only applies to images, but it accepts ${notImages.join(', ')}`
			)
		}
	}

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
 * Declares every destination an app can write to. The returned registry is
 * imported by the client (to configure inputs and pre-validate) and by the
 * server (to authorize and re-validate), which is what keeps the two in sync.
 *
 * Definitions are checked eagerly: a malformed scope throws at import time,
 * not on the first upload. That includes the two replace mistakes no runtime
 * check could recover from — an entity-wide replace on a collection, and two
 * scopes whose folders overlap, where an avatar upload would delete the same
 * user's documents.
 */
export const defineScopes = <T extends Record<string, ScopeConfig>>(
	scopes: T
): ScopeRegistry<T> => {
	for (const [name, scope] of Object.entries(scopes)) {
		assertDefinition(name, scope)
	}
	assertNoSweepCollision(scopes)

	const names = Object.keys(scopes) as (keyof T & string)[]

	const get = (name: string): ScopeConfig => {
		const scope = scopes[name as keyof T]
		if (!scope) {
			throw new ScopeError(
				`Unknown scope "${name}". Declared: ${names.join(', ')}`
			)
		}
		return scope
	}

	return {
		scopes,
		names,
		get,
		has: name => name in scopes,
		accept: name => toAcceptAttribute(get(name).accept),
	}
}

/**
 * The one validation call. Client runs it for feedback, server runs it for
 * safety, both against the same scope.
 *
 * `labels` is what keeps the two answers identical in wording as well as in
 * verdict: the hook passes the copy it renders with, `createStorage` passes
 * the copy it was configured with.
 */
export const validateForScope = async <T extends Record<string, ScopeConfig>>(
	registry: ScopeRegistry<T>,
	name: string,
	file: FileLike,
	labels?: Partial<UploaderLabels>
): Promise<ValidationResult> => {
	const scope = registry.get(name)
	const category = scope.category
		? FILE_CATEGORY_CONFIG[scope.category]
		: undefined

	return validateFile(file, {
		maxBytes: scope.maxBytes,
		allowedExtensions: scope.accept,
		validateMagicNumbers: category?.validateMagicNumbers ?? true,
		labels,
	})
}

/**
 * Fails fast when a provider cannot honour what the scopes promise — a private
 * scope on a provider that cannot sign URLs is a runtime 403 waiting to happen.
 */
export const assertProviderSupports = <T extends Record<string, ScopeConfig>>(
	registry: ScopeRegistry<T>,
	provider: StorageProvider
): void => {
	const needsSigning = registry.names.filter(
		name => registry.get(name).visibility === 'private'
	)

	if (needsSigning.length > 0 && !provider.capabilities.signedUrl) {
		throw new ScopeError(
			`Provider "${provider.name}" cannot sign URLs, but these scopes are private: ${needsSigning.join(', ')}`
		)
	}
}

/**
 * Whether a key would escape its own prefix.
 *
 * Judged per SEGMENT. A `key.includes('..')` test reads as the same check and
 * is not: `report..pdf` and `Screenshot at 4.18.54 p.m..png` carry two dots
 * without ever being traversal, and a macOS screenshot is the common case, not
 * a corner one. Traversal needs a segment that IS `..`, so that is what this
 * asks.
 */
const escapesPrefix = (key: string): boolean =>
	key.startsWith('/') ||
	key.split('/').some(segment => segment === '..' || segment === '.')

/**
 * Resolves the storage key for an upload.
 *
 * The guard is a backstop, not a sanitizer: it refuses a key rather than
 * rewriting one, because a client computing the same key to decide replace
 * mode would then disagree with the server. Run {@link sanitizeFileName}
 * inside the scope's `path()` and both sides stay identical.
 */
export const resolveKey = <T extends Record<string, ScopeConfig>>(
	registry: ScopeRegistry<T>,
	name: string,
	entityId: string,
	file: FileLike
): string => {
	const key = registry.get(name).path(entityId, file)
	if (escapesPrefix(key)) {
		throw new ScopeError(`Scope "${name}" produced an unsafe key: ${key}`)
	}
	return key
}
