/**
 * uploaderkit — core.
 *
 * Isomorphic on purpose: no React, no Node builtins, no provider SDK. It is
 * the contract both sides of an upload agree on, so the browser and the server
 * validate with the same code against the same scope definition.
 *
 * @see AGENTS.md
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
	assertProviderSupports,
	defineScopes,
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
	ScopeConfig,
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
