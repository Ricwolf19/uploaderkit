import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { ScopeConfig } from '../defineScopes'
import { resolveLabels } from '../labels'
import type { UseUploaderOptions } from '../react'
import { useUploader } from '../react'
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
	/** Files already persisted, rendered above the dropzone. */
	stored?: StoredFile[]
	/** Forget a persisted file. Remote deletion stays the app's decision. */
	onRemoveStored?: (file: StoredFile) => void
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
	onRemoveStored,
	confirmRemove,
	resolveViewUrl,
	capture,
	size = 'md',
	icon,
	shortcut,
	controllerRef,
	onPendingChange,
	disabled = false,
	className,
	...options
}: UploaderProps<T>) => {
	// 'submit' and 'manual' are the same hook state; who calls upload() differs.
	const uploader = useUploader({
		...options,
		uploadOn: uploadOn === 'select' ? 'select' : 'manual',
	})
	const copy = useMemo(() => resolveLabels(options.labels), [options.labels])
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

	const requestRemove = onRemoveStored
		? (file: StoredFile) =>
				confirmRemove ? setRemoving(file) : onRemoveStored(file)
		: undefined

	const confirmCopy = typeof confirmRemove === 'object' ? confirmRemove : {}

	return (
		<div className={cn('space-y-2', className)}>
			{label && <p className='text-ui-fg text-sm font-medium'>{label}</p>}

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
					if (removing) onRemoveStored?.(removing)
					setRemoving(null)
				}}
				onCancel={() => setRemoving(null)}
				labels={options.labels}
			/>
		</div>
	)
}
