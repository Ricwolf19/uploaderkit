import { FILE_CATEGORY_CONFIG } from './constants'
import { toAcceptAttribute } from './file'
import type {
	FileLike,
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
}

/**
 * Declares every destination an app can write to. The returned registry is
 * imported by the client (to configure inputs and pre-validate) and by the
 * server (to authorize and re-validate), which is what keeps the two in sync.
 *
 * Definitions are checked eagerly: a malformed scope throws at import time,
 * not on the first upload.
 */
export const defineScopes = <T extends Record<string, ScopeConfig>>(
	scopes: T
): ScopeRegistry<T> => {
	for (const [name, scope] of Object.entries(scopes)) {
		assertDefinition(name, scope)
	}

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
 */
export const validateForScope = async <T extends Record<string, ScopeConfig>>(
	registry: ScopeRegistry<T>,
	name: string,
	file: FileLike
): Promise<ValidationResult> => {
	const scope = registry.get(name)
	const category = scope.category
		? FILE_CATEGORY_CONFIG[scope.category]
		: undefined

	return validateFile(file, {
		maxBytes: scope.maxBytes,
		allowedExtensions: scope.accept,
		validateMagicNumbers: category?.validateMagicNumbers ?? true,
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

/** Resolves the storage key for an upload. */
export const resolveKey = <T extends Record<string, ScopeConfig>>(
	registry: ScopeRegistry<T>,
	name: string,
	entityId: string,
	file: FileLike
): string => {
	const key = registry.get(name).path(entityId, file)
	if (key.startsWith('/') || key.includes('..')) {
		throw new ScopeError(`Scope "${name}" produced an unsafe key: ${key}`)
	}
	return key
}
