import type { StoredFile, UploadStatus } from '../types'
/** Signals the strategy receives while a file is in flight. */
export type UploadStrategyOptions = {
	/** 0–100. Driven by the transport when it can measure (XHR can). */
	onProgress: (percent: number) => void
	/** Aborting must reject the promise with an `AbortError`-named error. */
	signal: AbortSignal
}

/**
 * The physical transport for one file. Injected into `useUploader` so the hook
 * owns state and validation while the app owns how bytes travel — swap the
 * endpoint, the auth header or the whole protocol without touching the hook.
 */
export type UploadStrategy = (
	file: File,
	scope: string,
	entityId: string,
	options: UploadStrategyOptions
) => Promise<StoredFile>

/** One file tracked by the hook, from selection to stored (or failed). */
export type UploaderFile = {
	id: string
	file: File
	status: UploadStatus
	/** 0–100 while uploading; 100 on success. */
	progress: number
	/** Human, Spanish — comes from validation or the strategy's failure. */
	error?: string
	/** Object URL for image files, for a local thumbnail before upload. */
	preview?: string
	/** Present once the server confirmed the upload. */
	stored?: StoredFile
}
