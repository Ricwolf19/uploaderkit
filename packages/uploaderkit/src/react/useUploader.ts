import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ScopeConfig, ScopeRegistry, StoredFile } from '../index'
import { validateForScope } from '../index'
import { resolveLabels, type UploaderLabels } from '../labels'
import { warnDev } from '../warn'
import { compressImage } from './compressImage'
import type { UploaderFile, UploadStrategy } from './types'

/**
 * When the machine sends: `'manual'` holds files in `idle` until the app calls
 * `upload()` — the form-submit flow, where the file travels together with the
 * rest of the fields' action. `'select'` fires as soon as a valid file lands.
 */
export type UploadTrigger = 'select' | 'manual'

export type RetryOptions = {
	/** Total attempts per file, the first one included. @defaultValue 1 */
	attempts?: number
	/** Delay before the first retry; doubles on each further one. @defaultValue 500 */
	backoffMs?: number
}

export type UseUploaderOptions<T extends Record<string, ScopeConfig>> = {
	/** The app's registry — the same object the server authorizes against. */
	scopes: ScopeRegistry<T>
	scope: keyof T & string
	/** Owner of the uploads (customerId, userId, …), forwarded to the strategy. */
	entityId: string
	/** Transport. Omit for local-only selection + validation (no `upload`). */
	strategy?: UploadStrategy
	multiple?: boolean
	maxFiles?: number
	/** @defaultValue 'manual' — the styled `Uploader` flips it to `'select'`. */
	uploadOn?: UploadTrigger
	/**
	 * Fired when a batch actually starts travelling — from either trigger — with
	 * the files it carries. The place to flip a form into its "sending" state.
	 */
	onUploadStart?: (files: UploaderFile[]) => void
	/** Fired once per batch with the files the server confirmed. */
	onUploaded?: (stored: StoredFile[]) => void
	onError?: (message: string) => void
	/**
	 * Re-run a failed strategy call before surfacing the error. A number is
	 * shorthand for `{ attempts }`. Aborts never retry, and validation failures
	 * never reach the strategy in the first place.
	 */
	retry?: number | RetryOptions
	/** Max uploads in flight per batch; the rest queue. @defaultValue Infinity */
	concurrency?: number
	/**
	 * Rename each file before it enters the machine — a client-side input, a
	 * folio, a slug. Runs before validation, so a rename that changes the
	 * extension is rejected like any other invalid file. The stored key comes
	 * from the scope's `path(entityId, file)`, which reads this name.
	 */
	rename?: (file: File) => string
	labels?: Partial<UploaderLabels>
}

export type UseUploaderReturn = {
	files: UploaderFile[]
	/** Ready-made value for `<input accept>`, derived from the scope. */
	accept: string
	isUploading: boolean
	/** `true` while any file waits in `idle` — a manual trigger has work to do. */
	hasPending: boolean
	addFiles: (incoming: FileList | File[]) => Promise<void>
	/** Uploads every file still in `idle`. Resolves with the confirmed ones. */
	upload: () => Promise<StoredFile[]>
	/** Abort one in-flight upload, or all of them when no id is given. */
	abort: (id?: string) => void
	removeFile: (id: string) => void
	clear: () => void
}

const createId = () =>
	typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2)

const previewOf = (file: File): string | undefined =>
	file.type.startsWith('image/') &&
	typeof URL !== 'undefined' &&
	typeof URL.createObjectURL === 'function'
		? URL.createObjectURL(file)
		: undefined

const revokePreview = (file: UploaderFile) => {
	if (file.preview) URL.revokeObjectURL(file.preview)
}

const normalizeRetry = (retry: number | RetryOptions | undefined) => {
	const options =
		typeof retry === 'number' ? { attempts: retry } : (retry ?? {})
	return {
		attempts: Math.max(1, options.attempts ?? 1),
		backoffMs: options.backoffMs ?? 500,
	}
}

/** Abortable sleep: the backoff between retries must die with the upload. */
const wait = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		const abort = () => {
			clearTimeout(timer)
			const error = new Error('Carga cancelada')
			error.name = 'AbortError'
			reject(error)
		}
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', abort)
			resolve()
		}, ms)
		signal.addEventListener('abort', abort, { once: true })
	})

/**
 * Run `run` over every item with at most `limit` in flight. Order of results
 * matches the input; a settled slot immediately frees a worker for the next.
 */
const runPool = async <T, R>(
	items: T[],
	limit: number,
	run: (item: T) => Promise<R>
): Promise<R[]> => {
	const results = new Array<R>(items.length)
	let cursor = 0
	const workers = Array.from(
		{ length: Math.min(Math.max(1, limit), items.length) },
		async () => {
			while (cursor < items.length) {
				const index = cursor++
				results[index] = await run(items[index]!)
			}
		}
	)
	await Promise.all(workers)
	return results
}

/**
 * Headless upload state machine: selection → validation → (compression) →
 * upload with progress and abort. Owns no markup — render `files` however the
 * screen needs and wire `addFiles` to an input or a drop zone.
 *
 * Validation runs here with the same `validateForScope` the server runs, so
 * the user sees the rejection before any byte leaves the machine.
 */
export const useUploader = <T extends Record<string, ScopeConfig>>({
	scopes,
	scope,
	entityId,
	strategy,
	multiple = false,
	maxFiles,
	uploadOn = 'manual',
	onUploadStart,
	onUploaded,
	onError,
	retry,
	concurrency = Infinity,
	rename,
	labels,
}: UseUploaderOptions<T>): UseUploaderReturn => {
	const [files, setFiles] = useState<UploaderFile[]>([])
	const controllers = useRef(new Map<string, AbortController>())
	// Kept in a ref so `addFiles` → auto-upload reads the batch it just built,
	// not the state snapshot from before the setFiles commit.
	const filesRef = useRef<UploaderFile[]>([])
	filesRef.current = files
	const copy = useMemo(() => resolveLabels(labels), [labels])
	const { attempts, backoffMs } = normalizeRetry(retry)

	const patch = useCallback((id: string, changes: Partial<UploaderFile>) => {
		setFiles(previous =>
			previous.map(file => (file.id === id ? { ...file, ...changes } : file))
		)
	}, [])

	const uploadOne = useCallback(
		async (target: UploaderFile): Promise<StoredFile | null> => {
			if (!strategy) {
				warnDev(
					'upload-without-strategy',
					'upload() ran without a `strategy` — files stay local. Pass `strategy` (e.g. createXhrUploadStrategy) to useUploader.'
				)
				return null
			}
			const config = scopes.get(scope)

			const controller = new AbortController()
			controllers.current.set(target.id, controller)
			patch(target.id, { status: 'uploading', progress: 0 })

			try {
				const payload = config.compress
					? await compressImage(target.file, config.compress)
					: target.file

				// Compression runs once; only the transport retries.
				for (let attempt = 1; ; attempt++) {
					try {
						const stored = await strategy(payload, scope, entityId, {
							onProgress: percent => patch(target.id, { progress: percent }),
							signal: controller.signal,
						})
						patch(target.id, { status: 'success', progress: 100, stored })
						return stored
					} catch (error) {
						const aborted =
							error instanceof Error && error.name === 'AbortError'
						if (aborted || attempt >= attempts) throw error
						patch(target.id, { progress: 0 })
						await wait(backoffMs * 2 ** (attempt - 1), controller.signal)
					}
				}
			} catch (error) {
				const aborted = error instanceof Error && error.name === 'AbortError'
				const message =
					error instanceof Error && error.message
						? error.message
						: copy.uploadFailed
				patch(target.id, {
					status: aborted ? 'idle' : 'error',
					progress: 0,
					...(aborted ? {} : { error: message }),
				})
				if (!aborted) onError?.(message)
				return null
			} finally {
				controllers.current.delete(target.id)
			}
		},
		[
			strategy,
			scopes,
			scope,
			entityId,
			patch,
			onError,
			attempts,
			backoffMs,
			copy,
		]
	)

	const uploadBatch = useCallback(
		async (targets: UploaderFile[]): Promise<StoredFile[]> => {
			if (targets.length === 0) return []
			onUploadStart?.(targets)
			const results = await runPool(targets, concurrency, uploadOne)
			const stored = results.filter((r): r is StoredFile => r !== null)
			if (stored.length > 0) onUploaded?.(stored)
			return stored
		},
		[uploadOne, onUploadStart, onUploaded, concurrency]
	)

	const addFiles = useCallback(
		async (incoming: FileList | File[]) => {
			let batch = Array.from(incoming)
			if (!multiple && batch.length > 1) {
				warnDev(
					'single-mode-multi-drop',
					`addFiles received ${batch.length} files but \`multiple\` is false — only the first is kept. Pass multiple: true if that is not what you meant.`
				)
			}
			if (!multiple) batch = batch.slice(0, 1)

			if (maxFiles !== undefined) {
				const room = maxFiles - (multiple ? filesRef.current.length : 0)
				if (batch.length > room) {
					batch = batch.slice(0, Math.max(0, room))
					onError?.(copy.maxFilesReached(maxFiles))
				}
			}
			if (batch.length === 0) return

			if (rename) {
				batch = batch.map(
					file => new File([file], rename(file), { type: file.type })
				)
			}

			const next: UploaderFile[] = []
			for (const file of batch) {
				const result = await validateForScope(scopes, scope, file)
				next.push({
					id: createId(),
					file,
					status: result.valid ? 'idle' : 'error',
					progress: 0,
					...(result.valid
						? { preview: previewOf(file) }
						: { error: result.message }),
				})
				if (!result.valid) onError?.(next[next.length - 1]!.error!)
			}

			setFiles(previous => {
				if (multiple) return [...previous, ...next]
				previous.forEach(revokePreview)
				return next
			})

			if (uploadOn === 'select') {
				await uploadBatch(next.filter(file => file.status === 'idle'))
			}
		},
		[
			multiple,
			maxFiles,
			scopes,
			scope,
			uploadOn,
			uploadBatch,
			onError,
			rename,
			copy,
		]
	)

	const upload = useCallback(
		() => uploadBatch(filesRef.current.filter(f => f.status === 'idle')),
		[uploadBatch]
	)

	const abort = useCallback((id?: string) => {
		if (id) {
			controllers.current.get(id)?.abort()
			return
		}
		controllers.current.forEach(controller => controller.abort())
	}, [])

	const removeFile = useCallback(
		(id: string) => {
			abort(id)
			setFiles(previous => {
				const target = previous.find(file => file.id === id)
				if (target) revokePreview(target)
				return previous.filter(file => file.id !== id)
			})
		},
		[abort]
	)

	const clear = useCallback(() => {
		abort()
		setFiles(previous => {
			previous.forEach(revokePreview)
			return []
		})
	}, [abort])

	// Object URLs leak until revoked; the unmount sweep catches whatever the
	// screen never removed explicitly.
	useEffect(
		() => () => {
			filesRef.current.forEach(revokePreview)
			controllers.current.forEach(controller => controller.abort())
		},
		[]
	)

	const accept = useMemo(() => scopes.accept(scope), [scopes, scope])

	return {
		files,
		accept,
		isUploading: files.some(file => file.status === 'uploading'),
		hasPending: files.some(file => file.status === 'idle'),
		addFiles,
		upload,
		abort,
		removeFile,
		clear,
	}
}
