import { Readable } from 'node:stream'

import { resolveLabels, type UploaderLabels } from '../labels'
import { resolveReplaceMode, resolveScopePrefix } from '../scopes'
import { resolveKey } from '../scopes'
import { assertProviderSupports, ScopeError, validateForScope } from '../scopes'
import type { ScopeConfig, ScopeRegistry } from '../types'
import type {
	CryptoHooks,
	FileLike,
	SignedUrlOptions,
	StorageProvider,
	StoredFile,
} from '../types'

/**
 * A request-level failure: bad file, unknown scope name from a URL, missing
 * part. Carries the HTTP status and a message safe to show the user — unlike
 * `ScopeError`, which flags wiring bugs and must stay dev-facing.
 */
export class StorageRequestError extends Error {
	override name = 'StorageRequestError'
	constructor(
		message: string,
		readonly status: number
	) {
		super(message)
	}
}

export type CreateStorageOptions<T extends Record<string, ScopeConfig>> = {
	scopes: ScopeRegistry<T>
	provider: StreamingStorageProvider
	/** Required when any scope declares `encrypt`. The app owns the cipher. */
	crypto?: StreamingCryptoHooks
	/** Lifetime of signed URLs, in seconds. @defaultValue 300 */
	signedUrlTtl?: number
	/**
	 * `StoredFile.url` for encrypted scopes. Required alongside them: a signed
	 * URL points at the bucket object, which is CIPHERTEXT — the only readable
	 * route is the app's authenticated view endpoint (which runs `read` and
	 * decrypts). Return that endpoint's URL, absolute or app-relative.
	 */
	encryptedUrl?: (input: {
		scope: string
		entityId: string
		key: string
	}) => string
	/**
	 * Copy for every `StorageRequestError` this service words, and for the
	 * validation messages it answers with. Omitted means English.
	 *
	 * Hand it the same object the client renders with: the server re-runs the
	 * very validation the browser ran, so a mismatch here is the one place a
	 * user sees the same rejection twice, in two languages.
	 */
	labels?: Partial<UploaderLabels>
}

export type UploadInput = {
	scope: string
	entityId: string
	file: FileLike
	uploadedBy?: string
}

/**
 * A stored file plus the keys the upload removed. `replaced` is empty unless
 * the scope sweeps per entity; when it is not, the app must drop those keys
 * from whatever it persisted, or it keeps rendering objects that are gone.
 */
export type UploadResult = StoredFile & { replaced: string[] }

/**
 * A provider that can also read without buffering. Additive and optional, so
 * every existing provider still satisfies it — `readStream` falls back to
 * `get` when the method is absent.
 *
 * Declared here rather than in the core because the core's `StorageProvider`
 * is the published contract; widening it there would be a breaking change for
 * anyone implementing it.
 */
export type StreamingStorageProvider = StorageProvider & {
	/**
	 * Reads without holding the object in memory. Serving a 20MB document
	 * through `get` costs its full size in RAM per concurrent request.
	 */
	getStream?(key: string): Promise<Readable>
}

/** {@link CryptoHooks} that can also decrypt progressively. */
export type StreamingCryptoHooks = CryptoHooks & {
	/**
	 * Decrypts as bytes arrive, so a read never materializes the plaintext.
	 *
	 * Weigh the cost: plaintext reaches the consumer BEFORE the authentication
	 * tag is verified, so tampering surfaces as a stream that fails at the end,
	 * mid-delivery. `decrypt` verifies before returning a single byte.
	 *
	 * There is no streaming counterpart for encryption on purpose — AES-GCM
	 * only knows its tag once the input ends, and the layout writes it first.
	 */
	decryptStream?: (source: Readable) => Readable
}

export type StorageService<
	T extends Record<string, ScopeConfig> = Record<string, ScopeConfig>,
> = {
	upload(input: UploadInput): Promise<UploadResult>
	/** Raw bytes, decrypted when the scope is encrypted. */
	read(input: { scope: string; key: string }): Promise<Uint8Array>
	/**
	 * The same content as a stream, so serving a file costs a buffer's worth of
	 * memory instead of the whole object. Falls back to `read` when the provider
	 * or the cipher cannot stream, so it is always safe to prefer.
	 */
	readStream(input: { scope: string; key: string }): Promise<Readable>
	remove(input: { scope: string; key: string }): Promise<boolean>
	/** Fresh expiring URL for a private object. Throws on public scopes. */
	signedUrl(input: {
		scope: string
		key: string
		download?: boolean
		expiresIn?: number
	}): Promise<string>
	list(prefix: string): Promise<{ key: string; size: number }[]>
	scopes: ScopeRegistry<T>
	/**
	 * The resolved copy, exposed so the framework adapters word their own
	 * failures with it. One `labels` on `createStorage` therefore covers the
	 * whole round trip — the service and the route that wraps it cannot end up
	 * answering in two languages.
	 */
	labels: UploaderLabels
}

const toHex = (buffer: ArrayBuffer): string =>
	[...new Uint8Array(buffer)]
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('')

/**
 * The server side of the contract. Boots defensively: a provider that cannot
 * honour the scopes, or an encrypted scope without an injected cipher, throws
 * here — before the first request, while a deploy can still fail loudly.
 */
export const createStorage = <T extends Record<string, ScopeConfig>>({
	scopes,
	provider,
	crypto,
	signedUrlTtl = 300,
	encryptedUrl,
	labels,
}: CreateStorageOptions<T>): StorageService<T> => {
	const copy = resolveLabels(labels)

	assertProviderSupports(scopes, provider)

	const encrypted = scopes.names.filter(name => scopes.get(name).encrypt)
	if (encrypted.length > 0 && !crypto) {
		throw new ScopeError(
			`Scopes ${encrypted.join(', ')} declare "encrypt" but no CryptoHooks were provided to createStorage`
		)
	}
	if (encrypted.length > 0 && !encryptedUrl) {
		throw new ScopeError(
			`Scopes ${encrypted.join(', ')} declare "encrypt" but no "encryptedUrl" was provided — a signed URL would serve ciphertext. Point it at the app's authenticated view endpoint.`
		)
	}

	const getScope = (name: string): ScopeConfig => {
		if (!scopes.has(name)) {
			throw new StorageRequestError(copy.unknownScope, 404)
		}
		return scopes.get(name)
	}

	const upload = async ({
		scope: name,
		entityId,
		file,
		uploadedBy,
	}: UploadInput): Promise<UploadResult> => {
		const scope = getScope(name)

		// The client already validated; running the same function again here is
		// the part that makes the client check advisory instead of load-bearing.
		const result = await validateForScope(scopes, name, file, copy)
		if (!result.valid) throw new StorageRequestError(result.message, 422)

		const key = resolveKey(scopes, name, entityId, file)
		const raw = new Uint8Array(await file.arrayBuffer())
		const checksum = toHex(
			await globalThis.crypto.subtle.digest('SHA-256', raw)
		)
		const body = scope.encrypt ? await crypto!.encrypt(raw) : raw

		const put = await provider.put({
			key,
			body,
			// Encrypted bytes are opaque on purpose: serving them with the real
			// MIME would let a browser try to render ciphertext.
			contentType: scope.encrypt ? 'application/octet-stream' : file.type,
			visibility: scope.visibility,
			metadata: scope.metadata,
		})

		// Orphan sweep AFTER a successful put: the new object must exist before
		// anything is deleted, or a failure between the two leaves the entity
		// with nothing. Delete failures are swallowed on purpose — the upload
		// the caller asked for did happen, and a stale object is not worth
		// failing it over.
		const replaced: string[] = []
		if (resolveReplaceMode(scope) === 'entity') {
			const prefix = resolveScopePrefix(scope, entityId)
			const stale = (await provider.list(prefix)).filter(
				object => object.key !== put.key
			)
			await Promise.all(
				stale.map(object =>
					provider
						.delete(object.key)
						// Only what the provider confirmed gone: `replaced` is what
						// the app drops from its own records.
						.then(deleted => {
							if (deleted) replaced.push(object.key)
						})
						.catch(() => undefined)
				)
			)
		}

		const contentChecksum = put.checksum ?? checksum
		const publicUrl = put.url
			? `${put.url}${put.url.includes('?') ? '&' : '?'}v=${contentChecksum.slice(0, 16)}`
			: put.url

		return {
			key: put.key,
			replaced,
			url: scope.encrypt
				? encryptedUrl!({ scope: name, entityId, key: put.key })
				: scope.visibility === 'private'
					? await provider.signedUrl!(put.key, { expiresIn: signedUrlTtl })
					: publicUrl,
			scope: name,
			entityId,
			fileName: file.name,
			mimeType: file.type,
			size: file.size,
			checksum: contentChecksum,
			uploadedAt: Date.now(),
			...(uploadedBy ? { uploadedBy } : {}),
		}
	}

	const read = async ({ scope: name, key }: { scope: string; key: string }) => {
		const scope = getScope(name)
		const data = await provider.get(key)
		return scope.encrypt ? crypto!.decrypt(data) : data
	}

	/**
	 * The same read without holding the object in memory.
	 *
	 * Degrades honestly: a provider with no `getStream`, or an encrypted scope
	 * whose crypto has no `decryptStream`, falls back to `read` and is wrapped
	 * in a one-chunk stream. Callers get one shape either way and never have to
	 * ask which capabilities are present.
	 */
	const readStream = async ({
		scope: name,
		key,
	}: {
		scope: string
		key: string
	}): Promise<Readable> => {
		const scope = getScope(name)
		const canStream =
			provider.getStream && (!scope.encrypt || crypto?.decryptStream)

		if (!canStream) {
			return Readable.from([Buffer.from(await read({ scope: name, key }))])
		}

		const source = (await provider.getStream!(key)) as Readable
		return scope.encrypt ? (crypto!.decryptStream!(source) as Readable) : source
	}

	const remove = ({ scope: name, key }: { scope: string; key: string }) => {
		const scope = getScope(name)
		// The history contract, enforced where it cannot be bypassed: a scope
		// marked `keepOnRemove` answers `false` instead of destroying the
		// trail, whatever any client asks.
		if (scope.keepOnRemove) {
			return Promise.resolve(false)
		}
		return provider.delete(key)
	}

	const signedUrl = ({
		scope: name,
		key,
		download,
		expiresIn,
	}: {
		scope: string
		key: string
		download?: boolean
		expiresIn?: number
	}) => {
		const scope = getScope(name)
		if (scope.visibility !== 'private') {
			throw new ScopeError(
				`Scope "${name}" is public; its objects are reachable by their stored URL and never signed`
			)
		}
		const options: SignedUrlOptions = {
			expiresIn: expiresIn ?? signedUrlTtl,
			...(download !== undefined ? { download } : {}),
		}
		return provider.signedUrl!(key, options)
	}

	return {
		upload,
		read,
		readStream,
		remove,
		signedUrl,
		list: prefix => provider.list(prefix),
		scopes,
		labels: copy,
	}
}
