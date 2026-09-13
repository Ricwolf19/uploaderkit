import type { UploaderLabels } from './labels'

/**
 * Every type in this file must be usable from a browser and from a server.
 * That is what lets one scope definition drive the client's guards and the
 * server's guards without the two drifting apart.
 */

export type ImageExtension =
	'png' | 'jpg' | 'jpeg' | 'svg' | 'webp' | 'gif' | 'ico' | 'heic'

export type CertificateExtension = 'cer' | 'crt' | 'pem'
export type KeyExtension = 'key'

export type DocumentExtension =
	'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'csv' | 'txt'

export type DataExtension = 'xml' | 'json'
export type VideoExtension = 'mp4' | 'mov' | 'avi' | 'webm'
export type AudioExtension = 'mp3' | 'wav' | 'ogg' | 'aac'

export type FileExtension =
	| ImageExtension
	| CertificateExtension
	| KeyExtension
	| DocumentExtension
	| DataExtension
	| VideoExtension
	| AudioExtension

/** Validation preset. Picks extensions, size ceiling and header checking. */
export type FileCategory =
	| 'image'
	| 'certificate'
	| 'key'
	| 'pdf'
	| 'document'
	| 'data'
	| 'video'
	| 'audio'
	| 'any'

export type FileCategoryConfig = {
	extensions: FileExtension[]
	maxBytes: number
	/** Read the leading bytes to catch an .exe renamed to .pdf. */
	validateMagicNumbers: boolean
	/** Lower-case singular noun used in error messages. */
	label: string
	/** Value for an `<input accept="…">`. */
	accept: string
}

/**
 * The subset of the DOM `File` this package needs. A browser `File`, a Node 18+
 * `File` and a multer memory file (via `fromMulterFile`) all satisfy it, so
 * `validateFile` is the same call on both sides of the wire.
 */
export type FileLike = {
	name: string
	size: number
	/** MIME type as reported by the source. Never trusted on its own. */
	type: string
	arrayBuffer(): Promise<ArrayBuffer>
}

export type UploadStatus =
	'idle' | 'validating' | 'uploading' | 'success' | 'error'

/** Machine-readable reason a file was rejected. Pair with `message` for UI. */
export type ValidationCode =
	| 'extension-not-allowed'
	| 'too-large'
	| 'empty-file'
	| 'magic-number-mismatch'
	| 'mime-not-allowed'
	| 'custom'

export type ValidationResult =
	{ valid: true } | { valid: false; code: ValidationCode; message: string }

export type ValidationOptions = {
	maxBytes?: number
	allowedExtensions?: FileExtension[]
	validateMagicNumbers?: boolean
	/**
	 * Copy for the messages these checks produce. Omitted means English — the
	 * same rule the rest of the package follows.
	 */
	labels?: Partial<UploaderLabels>
	/** Runs last, only when every built-in check passed. */
	customValidation?: (file: FileLike) => Promise<ValidationResult>
}

/**
 * Public files are served straight from their URL; private files are only ever
 * reachable through a signed, expiring URL minted by the server.
 */
export type Visibility = 'public' | 'private'

/** Client-side image pipeline applied before upload. */
export type CompressOptions = {
	maxWidth?: number
	maxHeight?: number
	/** 0–1. Ignored by formats without lossy encoding. */
	quality?: number
	/**
	 * Drop EXIF metadata. Defaults to true: camera photos carry GPS
	 * coordinates, and a public bucket is the wrong place for them.
	 */
	stripExif?: boolean
}

/**
 * What an upload does to what the entity already had.
 *
 * - `'entity'` — after the put, every other object under the entity's prefix
 *   is deleted. The scope holds exactly one file and leaves no history.
 * - `'key'` — only the object at the same key is replaced, siblings stay.
 * - `false` — nothing is removed; the bucket keeps every version.
 */
export type ReplaceMode = 'entity' | 'key' | false

/**
 * A named destination. The single source of truth for where a file lands, who
 * may read it, and what is accepted there.
 */
export type ScopeConfig = {
	/**
	 * Storage key for an upload. Receives the owning entity and the incoming
	 * file so the caller controls collisions and folder shape.
	 */
	path: (entityId: string, file: FileLike) => string
	visibility: Visibility
	/** Extensions accepted here. Narrower than the category preset, never wider. */
	accept: FileExtension[]
	maxBytes: number
	category?: FileCategory
	/** Hand the bytes to the app's cipher before they leave the server. */
	encrypt?: boolean
	compress?: CompressOptions
	/** Replace the object at the same key instead of adding a new one. */
	overwrite?: boolean
	/**
	 * How many files one entity may hold here — on the scope, not on the
	 * uploader, so the server knows the arity too.
	 *
	 * @defaultValue 1
	 * @see AGENTS.md §3 — "Arity lives on the scope"
	 */
	maxFiles?: number
	/**
	 * Overrides the derived replace mode. Rarely needed: the default already
	 * leaves no orphans.
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
	/** Documentation-only today; drives lifecycle rules once adapters read it. */
	retention?: string
	/** Free-form tags forwarded to the provider when it supports metadata. */
	metadata?: Record<string, string>
}

export type ScopeRegistry<T extends Record<string, ScopeConfig>> = {
	scopes: T
	names: (keyof T & string)[]
	get(name: string): ScopeConfig
	has(name: string): boolean
	/** `<input accept>` string for a scope, derived from its extensions. */
	accept(name: keyof T & string): string
}

/** What the app persists after a successful upload. */
export type StoredFile = {
	/** Provider key. The handle for delete, re-sign and download. */
	key: string
	/** Public URL, or a signed expiring URL when the scope is private. */
	url: string
	scope: string
	entityId: string
	fileName: string
	mimeType: string
	size: number
	/** Enables dedupe and integrity checks when the provider reports it. */
	checksum?: string
	uploadedAt: number
	uploadedBy?: string
}

export type PutInput = {
	key: string
	body: Uint8Array
	contentType: string
	visibility: Visibility
	metadata?: Record<string, string>
}

/**
 * What a provider can actually do. Declared rather than discovered so a scope
 * that needs signed URLs fails at boot, not the first time a user opens a file.
 */
export type ProviderCapabilities = {
	signedUrl: boolean
	resumable: boolean
	rangeRead: boolean
}

export type SignedUrlOptions = {
	/** Seconds until the URL stops working. */
	expiresIn: number
	/** Force a download instead of inline rendering. */
	download?: boolean
}

export type StorageProvider = {
	name: string
	capabilities: ProviderCapabilities
	put(input: PutInput): Promise<{ key: string; url: string; checksum?: string }>
	get(key: string): Promise<Uint8Array>
	delete(key: string): Promise<boolean>
	signedUrl?(key: string, options: SignedUrlOptions): Promise<string>
	list(prefix: string): Promise<{ key: string; size: number }[]>
}

/** Injected cipher for `encrypt: true` scopes. The package never ships one. */
export type CryptoHooks = {
	encrypt: (data: Uint8Array) => Uint8Array | Promise<Uint8Array>
	decrypt: (data: Uint8Array) => Uint8Array | Promise<Uint8Array>
}
