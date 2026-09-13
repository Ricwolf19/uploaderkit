import { type ReactNode, useEffect, useState } from 'react'

import type { UseUploaderOptions } from '../react'
import { useUploader } from '../react'
import type { RemoveStrategy, UploaderFile } from '../react/types'
import { useUploaderLabels } from '../react/UploaderProvider'
import type { ScopeConfig } from '../types'
import type { StoredFile } from '../types'
import { warnDev } from '../warn'
import { cn } from './cn'
import { ConfirmDialog } from './ConfirmDialog'
import type { UiUploadTrigger, UploaderControllerRef } from './controller'
import { Dropzone } from './Dropzone'
import { FileItem } from './FileItem'
import { FileViewer, type ViewableFile } from './FileViewer'
import { UploadCloudIcon } from './icons'
import { StoredFileItem } from './StoredFileItem'
import { useCoarsePointer } from './useCoarsePointer'
import { useFileViewer } from './useFileViewer'

/**
 * What {@link UploaderProps.renderFiles} is handed.
 *
 * Both the raw state and the default rows already built, so a custom layout can
 * keep the standard item and only change where — and among what — it sits.
 */
export type UploaderFilesSlot = {
	/** Files already persisted, exactly as passed in `stored`. */
	stored: StoredFile[]
	/** Files staged in this session, each with its live upload status. */
	staged: UploaderFile[]
	/** The default rows. Place them, wrap them, or drop them entirely. */
	nodes: ReactNode
	/** Nothing persisted and nothing staged. */
	isEmpty: boolean
	/** Open a persisted file in the built-in viewer. */
	view: (file: StoredFile) => void
	/** Forget a staged file. */
	remove: (id: string) => void
	/**
	 * Forget a persisted file, honouring `confirmRemove` and `removeStrategy`.
	 * `undefined` when this uploader accepts no removals.
	 */
	removeStored?: (file: StoredFile) => void
}

export type UploaderProps<T extends Record<string, ScopeConfig>> = Omit<
	UseUploaderOptions<T>,
	'uploadOn'
> & {
	/**
	 * When the files travel. @defaultValue 'select'
	 * @see UiUploadTrigger — which mode fits which screen
	 */
	uploadOn?: UiUploadTrigger
	label?: string
	description?: string
	/** Files already persisted, rendered on the {@link filesPosition} side. */
	stored?: StoredFile[]
	/**
	 * Which side of the dropzone the file lists sit on. @defaultValue 'above'
	 *
	 * `'below'` keeps the drop target anchored: with the lists above it, every
	 * added file pushes the zone further down, so the control the user is
	 * repeatedly aiming at moves under the cursor.
	 */
	filesPosition?: 'above' | 'below'
	/**
	 * Lay the file lists out yourself: a grid of thumbnails, a single summary
	 * line, a count folded into your own card — whatever the screen needs.
	 *
	 * It replaces the rows, not their place: the result still renders on the
	 * {@link filesPosition} side. For a layout the zone itself has to be part of
	 * (files BESIDE the dropzone, files inside your own frame), skip this skin
	 * and compose `useUploader` with the exported `Dropzone` / `FileItem` /
	 * `StoredFileItem` — nothing here is unavailable there.
	 */
	renderFiles?: (slot: UploaderFilesSlot) => ReactNode
	/**
	 * Notified when a persisted file is forgotten — the app's bookkeeping
	 * (clear the DB reference). Storage deletion belongs to `removeStrategy`.
	 */
	onRemoveStored?: (file: StoredFile) => void
	/**
	 * Deletion transport. With it, a confirmed removal deletes the object from
	 * storage BY ITSELF — unless the scope is `keepOnRemove`, the history
	 * contract — so no consumer can orphan by forgetting a callback.
	 */
	removeStrategy?: RemoveStrategy
	/**
	 * Gate `onRemoveStored` behind a confirmation dialog. `true` uses the
	 * label defaults; an object overrides the copy for this uploader.
	 */
	confirmRemove?: boolean | { title?: string; message?: string }
	/** Fresh URL right before previewing — for private scopes whose signed url expired. */
	resolveViewUrl?: (file: ViewableFile) => Promise<string>
	/** Mobile camera shortcut, forwarded to the dropzone's input. */
	capture?: 'user' | 'environment'
	/** Compact paddings and glyphs everywhere. @defaultValue 'md' */
	size?: 'sm' | 'md'
	/** Glyph inside the dropzone. `null` removes it; defaults to an upload cloud. */
	icon?: ReactNode
	/** Keyboard shortcut that opens the picker, e.g. `'mod+u'`. Hinted in the zone. */
	shortcut?: string
	/**
	 * Filled with the live controller so the surrounding form can send the
	 * staged files from its own submit. Required by `uploadOn: 'submit'`,
	 * which has no other way to fire; readable under `'manual'` too, where
	 * the zone's button stays the sender.
	 */
	controllerRef?: UploaderControllerRef
	/**
	 * Fires when the zone starts or stops holding files that `upload()`
	 * would send. The companion of `controllerRef`: a form that defers the
	 * send has no other way to know it has unsent work, so its save button
	 * would stay disabled on a pristine form the user has just dropped a
	 * file into.
	 */
	onPendingChange?: (hasPending: boolean) => void
	disabled?: boolean
	className?: string
}

/**
 * The styled single-zone uploader: one dropzone, one or many files in it.
 * Purely a skin over `useUploader` — apps needing custom markup use the hook
 * directly and lose nothing.
 *
 * Defaults `uploadOn` to `'select'`. `'manual'` gives the zone its own upload
 * button; `'submit'` hands the send to the surrounding form via
 * `controllerRef`. @see UiUploadTrigger for which mode fits which screen.
 */
export const Uploader = <T extends Record<string, ScopeConfig>>({
	uploadOn = 'select',
	label,
	description,
	stored = [],
	filesPosition = 'above',
	renderFiles,
	onRemoveStored,
	confirmRemove,
	resolveViewUrl,
	capture,
	size = 'md',
	icon,
	shortcut,
	controllerRef,
	onPendingChange,
	removeStrategy,
	disabled = false,
	className,
	...options
}: UploaderProps<T>) => {
	// 'submit' and 'manual' are the same hook state; who calls upload() differs.
	const uploader = useUploader({
		...options,
		uploadOn: uploadOn === 'select' ? 'select' : 'manual',
	})
	const copy = useUploaderLabels(options.labels)
	const viewer = useFileViewer({ resolveUrl: resolveViewUrl })
	const [removing, setRemoving] = useState<StoredFile | null>(null)
	const { files, removeFile } = uploader
	// Only 'manual' renders the zone's button: under 'submit' the form owns the
	// send, and a second, unvalidated way to fire the same batch is one too many.
	const manual = uploadOn === 'manual'

	if (uploadOn === 'submit' && !controllerRef) {
		warnDev(
			'uploader-submit-without-controller',
			"uploadOn: 'submit' has no send of its own — pass `controllerRef` and call upload() from the form's submit, or use 'manual' for the zone's button."
		)
	}
	// Touch-first devices barely drag; the zone reads as a tap target there.
	const coarse = useCoarsePointer()

	// Once the app echoes an upload back through `stored`, the machine's copy
	// would render the file twice. Depends on the two members it reads, never
	// on `uploader` — that object is fresh on every render.
	useEffect(() => {
		if (stored.length === 0) return
		const keys = new Set(stored.map(file => file.key))
		files
			.filter(f => f.status === 'success' && f.stored && keys.has(f.stored.key))
			.forEach(f => removeFile(f.id))
	}, [stored, files, removeFile])

	const { upload, hasPending, isUploading } = uploader
	useEffect(() => {
		if (!controllerRef) return
		controllerRef.current = { upload, hasPending, isUploading }
		return () => {
			controllerRef.current = null
		}
	}, [controllerRef, upload, hasPending, isUploading])

	useEffect(() => {
		onPendingChange?.(hasPending)
	}, [onPendingChange, hasPending])

	// One forget path for both branches: the package deletes, the app observes.
	// The reference is forgotten regardless — a dangling pointer is worse than
	// an orphan — and a refused delete surfaces through `onError`.
	const forgetStored = (file: StoredFile) => {
		if (removeStrategy && !options.scopes.get(options.scope).keepOnRemove) {
			removeStrategy(file, options.scope, options.entityId)
				.then(deleted => {
					if (!deleted) options.onError?.(copy.removeFailed)
				})
				.catch(() => options.onError?.(copy.removeFailed))
		}
		onRemoveStored?.(file)
	}

	const requestRemove =
		onRemoveStored || removeStrategy
			? (file: StoredFile) =>
					confirmRemove ? setRemoving(file) : forgetStored(file)
			: undefined

	const confirmCopy = typeof confirmRemove === 'object' ? confirmRemove : {}

	const defaultRows = (
		<>
			{stored.map(file => (
				<StoredFileItem
					key={file.key}
					file={file}
					onView={() => viewer.open(file)}
					onRemove={requestRemove}
					size={size}
					labels={options.labels}
				/>
			))}

			{files.map(file => {
				const { stored: settled } = file
				return (
					<FileItem
						key={file.id}
						file={file}
						onRemove={() => removeFile(file.id)}
						onAbort={() => uploader.abort(file.id)}
						onView={settled ? () => viewer.open(settled) : undefined}
						size={size}
						labels={options.labels}
					/>
				)
			})}
		</>
	)

	const fileList = renderFiles
		? renderFiles({
				stored,
				staged: files,
				nodes: defaultRows,
				isEmpty: stored.length === 0 && files.length === 0,
				view: viewer.open,
				remove: removeFile,
				removeStored: requestRemove,
			})
		: defaultRows

	return (
		<div className={cn('space-y-2', className)}>
			{label && <p className='text-ui-fg text-sm font-medium'>{label}</p>}

			{filesPosition === 'above' && fileList}

			<Dropzone
				accept={uploader.accept}
				multiple={options.multiple}
				disabled={disabled || uploader.isUploading}
				capture={capture}
				size={size}
				shortcut={shortcut}
				onFiles={incoming => void uploader.addFiles(incoming)}
			>
				{icon !== null && (
					<span className='text-ui-placeholder group-hover/dz:text-ui-primary group-data-dragging/dz:text-ui-primary mb-1.5 inline-flex justify-center transition-all duration-200 group-hover/dz:-translate-y-0.5 group-data-dragging/dz:-translate-y-1 group-data-dragging/dz:scale-110'>
						{icon ?? (
							<UploadCloudIcon
								className={size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'}
							/>
						)}
					</span>
				)}
				<p className='text-ui-muted group-hover/dz:text-ui-fg text-sm font-medium transition-colors duration-200'>
					{coarse ? copy.tapPrompt : copy.dropPrompt}
				</p>
				<p className='text-ui-placeholder mt-1 text-xs'>
					{description ?? uploader.accept.replaceAll(',', ' · ')}
				</p>
			</Dropzone>

			{filesPosition === 'below' && fileList}

			{manual && uploader.hasPending && (
				<button
					type='button'
					onClick={() => void uploader.upload()}
					disabled={disabled || uploader.isUploading}
					className='bg-ui-primary text-ui-primary-fg hover:bg-ui-primary-hover focus-visible:ring-ui-ring rounded-ui h-10 w-full cursor-pointer px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
				>
					{copy.uploadAll}
				</button>
			)}

			<FileViewer {...viewer.viewerProps} labels={options.labels} />

			<ConfirmDialog
				open={removing !== null}
				title={confirmCopy.title ?? copy.confirmRemoveTitle}
				message={
					confirmCopy.message ??
					copy.confirmRemoveMessage(removing?.fileName ?? '')
				}
				onConfirm={() => {
					if (removing) forgetStored(removing)
					setRemoving(null)
				}}
				onCancel={() => setRemoving(null)}
				labels={options.labels}
			/>
		</div>
	)
}
