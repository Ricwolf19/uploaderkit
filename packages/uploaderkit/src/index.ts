/**
 * uploaderkit — core.
 *
 * Isomorphic on purpose: no React, no Node builtins, no provider SDK. It is
 * the contract both sides of an upload agree on, so the browser and the server
 * validate with the same code against the same scope definition.
 *
 * @see AGENTS.md §1
 */

export {
	FILE_CATEGORY_CONFIG,
	GB,
	KB,
	MAGIC_NUMBERS,
	MB,
	MIME_TYPES,
} from './constants'
export {
	formatFileSize,
	fromMulterFile,
	getFileExtension,
	getMimeType,
	isKnownExtension,
	toAcceptAttribute,
} from './file'
export {
	DEFAULT_LABELS,
	EN_LABELS,
	ES_LABELS,
	resolveLabels,
	type UploaderLabels,
} from './labels'
export {
	assertProviderSupports,
	resolveKey,
	ScopeError,
	validateForScope,
} from './scopes'
export type {
	AudioExtension,
	CertificateExtension,
	CompressOptions,
	CryptoHooks,
	DataExtension,
	DocumentExtension,
	FileCategory,
	FileCategoryConfig,
	FileExtension,
	FileLike,
	ImageExtension,
	KeyExtension,
	ProviderCapabilities,
	PutInput,
	ScopeRegistry,
	SignedUrlOptions,
	StorageProvider,
	StoredFile,
	UploadStatus,
	ValidationCode,
	ValidationOptions,
	ValidationResult,
	VideoExtension,
	Visibility,
} from './types'
export {
	type FileValidation,
	validateExtension,
	validateFile,
	validateFiles,
	validateMagicNumbers,
	validateSize,
} from './validation'
// Declared after the block above on purpose: a later export shadows an
// earlier one, so `defineScopes` and `ScopeConfig` resolve to the versions
// that understand `maxFiles` / `replace`. They compose with the base
// validations rather than reimplementing them (invariant §4.1).
export {
	defineScopes,
	type ExtendedScopeRegistry,
	hasStableKey,
	type ReplaceMode,
	resolveReplaceMode,
	resolveScopePrefix,
	type ScopeConfig,
} from './defineScopes'
