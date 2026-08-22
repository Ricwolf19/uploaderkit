import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { ScopeConfig } from '../defineScopes'
import { resolveLabels } from '../labels'
import type { SlotState, UseSlottedUploaderOptions } from '../react'
import { useSlottedUploader } from '../react'
import { warnDev } from '../warn'
import { cn } from './cn'
import { ConfirmDialog } from './ConfirmDialog'
import type { UiUploadTrigger, UploaderControllerRef } from './controller'
import { Dropzone } from './Dropzone'
import { FileViewer, type ViewableFile } from './FileViewer'
import { UploadCloudIcon } from './icons'
import { SlotRow } from './SlotRow'
import { useCoarsePointer } from './useCoarsePointer'
import { useFileViewer } from './useFileViewer'

/** A pending second step: the user asked for it, the dialog decides. */
type PendingAction =
	| { kind: 'remove'; slot: SlotState }
	| { kind: 'replace'; slot: SlotState; file: File }

export type SlottedUploaderProps<T extends Record<string, ScopeConfig>> = Omit<
	UseSlottedUploaderOptions<T>,
	'uploadOn'
> & {
	/**
	 * When the slots travel. This presentation has no upload button of its
	 * own, so `'manual'` is not offered here: staged slots can only leave
	 * through a form's `controllerRef`, which is `'submit'`.
	 * @defaultValue 'select'
	 * @see UiUploadTrigger
	 */
	uploadOn?: Exclude<UiUploadTrigger, 'manual'>
	title?: string
	description?: string
	/** Hide the bulk dropzone and keep only per-row buttons. */
	hideDropzone?: boolean
	/**
	 * Gate removing a filled slot behind a confirmation dialog. `true` uses
	 * the label defaults; an object overrides the copy.
	 */
	confirmRemove?: boolean | { title?: string; message?: string }
	/**
	 * Confirm before a picked file replaces what a slot already holds. The
	 * dialog names both files, so the user sees what is about to be lost.
	 */
	confirmReplace?: boolean | { title?: string; message?: string }
	/** Fresh URL right before previewing — for private scopes whose signed url expired. */
	resolveViewUrl?: (file: ViewableFile) => Promise<string>
	/** Compact paddings and glyphs everywhere. @defaultValue 'md' */
	size?: 'sm' | 'md'
	/** Glyph inside the bulk dropzone. `null` removes it. */
	icon?: ReactNode
	/** Keyboard shortcut that opens the bulk picker, e.g. `'mod+u'`. */
	shortcut?: string
	/**
	 * Filled with the live controller so the surrounding form can send the
	 * staged slots from its own submit. Required by `uploadOn: 'submit'`:
	 * without it a staged slot has no way to ever leave.
	 */
	controllerRef?: UploaderControllerRef<void>
	/**
	 * Fires when the zone starts or stops holding files that `upload()`
	 * would send. The companion of `controllerRef`: a form that defers the
	 * send has no other way to know it has unsent work, so its save button
	 * would stay disabled on a pristine form the user has just dropped a
	 * file into.
	 */
	onPendingChange?: (hasPending: boolean) => void
	className?: string
}

/**
 * Named-slot presentation over the same machine as `Uploader`: a status row
 * per slot plus one bulk dropzone whose matcher routes each file to its slot.
 */
export const SlottedUploader = <T extends Record<string, ScopeConfig>>({
	uploadOn = 'select',
	title,
	description,
	hideDropzone = false,
	confirmRemove,
	confirmReplace,
	resolveViewUrl,
	size = 'md',
	icon,
	shortcut,
	controllerRef,
	onPendingChange,
	className,
	...options
}: SlottedUploaderProps<T>) => {
	const slotted = useSlottedUploader({
		...options,
		uploadOn: uploadOn === 'select' ? 'select' : 'manual',
	})

	if (uploadOn === 'submit' && !controllerRef) {
		warnDev(
			'slotted-submit-without-controller',
			"uploadOn: 'submit' has no send of its own here — pass `controllerRef` and call upload() from the form's submit, or staged slots never leave."
		)
	}
	const copy = useMemo(() => resolveLabels(options.labels), [options.labels])
	const coarse = useCoarsePointer()
	const viewer = useFileViewer({ resolveUrl: resolveViewUrl })
	const [pending, setPending] = useState<PendingAction | null>(null)

	const { upload, hasPending, isUploading } = slotted
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

	const pick = (slot: SlotState, file: File) => {
		if (slot.filled && confirmReplace) {
			setPending({ kind: 'replace', slot, file })
			return
		}
		void slotted.addToSlot(slot.definition.id, file)
	}

	const remove = (slot: SlotState) => {
		if (slot.filled && confirmRemove) {
			setPending({ kind: 'remove', slot })
			return
		}
		slotted.removeSlot(slot.definition.id)
	}

	const override =
		pending?.kind === 'replace'
			? typeof confirmReplace === 'object'
				? confirmReplace
				: {}
			: typeof confirmRemove === 'object'
				? confirmRemove
				: {}

	const dialogTitle =
		override.title ??
		(pending?.kind === 'replace'
			? copy.confirmReplaceTitle
			: copy.confirmRemoveTitle)
	const dialogMessage =
		override.message ??
		(pending?.kind === 'replace'
			? copy.confirmReplaceMessage(
					pending.slot.filled?.stored.fileName ?? '',
					pending.file.name
				)
			: copy.confirmRemoveMessage(pending?.slot.filled?.stored.fileName ?? ''))

	return (
		<div className={cn('space-y-2', className)}>
			{title && <p className='text-ui-fg text-sm font-medium'>{title}</p>}
			{description && <p className='text-ui-muted text-xs'>{description}</p>}

			{slotted.slots.map(slot => (
				<SlotRow
					key={slot.definition.id}
					slot={slot}
					onPick={file => pick(slot, file)}
					onRemove={() => remove(slot)}
					onAbort={() => slotted.abort(slot.definition.id)}
					onView={() => slot.filled && viewer.open(slot.filled.stored)}
					size={size}
					labels={options.labels}
				/>
			))}

			{!hideDropzone && (
				<Dropzone
					accept={slotted.accept}
					multiple
					disabled={slotted.isUploading}
					size={size}
					shortcut={shortcut}
					onFiles={files => void slotted.addFiles(files)}
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
						{coarse ? copy.bulkTapPrompt : copy.bulkDropPrompt}
					</p>
				</Dropzone>
			)}

			<FileViewer {...viewer.viewerProps} labels={options.labels} />

			<ConfirmDialog
				open={pending !== null}
				title={dialogTitle}
				message={dialogMessage}
				onConfirm={() => {
					if (pending?.kind === 'replace') {
						void slotted.addToSlot(pending.slot.definition.id, pending.file)
					} else if (pending) {
						slotted.removeSlot(pending.slot.definition.id)
					}
					setPending(null)
				}}
				onCancel={() => setPending(null)}
				labels={options.labels}
			/>
		</div>
	)
}
