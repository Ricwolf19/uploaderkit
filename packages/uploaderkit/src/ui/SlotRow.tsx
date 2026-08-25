import { type DragEvent, useRef, useState } from 'react'

import { formatFileSize } from '../file'
import type { UploaderLabels } from '../labels'
import type { SlotState } from '../react'
import { useUploaderLabels } from '../react/UploaderProvider'
import { cn } from './cn'
import { FileTypeBadge } from './FileTypeBadge'
import { ProgressBar } from './ProgressBar'

export type SlotRowProps = {
	slot: SlotState
	/** Fill this one slot from its own browse button. */
	onPick: (file: File) => void
	onRemove: () => void
	onAbort: () => void
	onView: () => void
	/** @defaultValue 'md' */
	size?: 'sm' | 'md'
	labels?: Partial<UploaderLabels>
}

/**
 * One named position of a `SlottedUploader`: a status dot, a thumbnail, the
 * slot's label, whatever occupies it, and the actions for that state.
 *
 * @remarks
 * Four occupancies, not two: under `uploadOn: 'submit'` a picked file waits at
 * `idle` in `pending` with no `filled`, and a row branching on `filled` alone
 * rendered it as an empty slot — with no way to undo the pick.
 */
export const SlotRow = ({
	slot,
	onPick,
	onRemove,
	onAbort,
	onView,
	size = 'md',
	labels,
}: SlotRowProps) => {
	const copy = useUploaderLabels(labels)
	const inputRef = useRef<HTMLInputElement>(null)
	const [dropping, setDropping] = useState(false)
	// Depth counter — see Dropzone.
	const depth = useRef(0)
	const { definition, filled, pending } = slot
	const uploading = pending?.status === 'uploading'
	/** Picked but not sent yet — the `uploadOn: 'submit'` resting state. */
	const staged = pending?.status === 'idle'
	const occupied = Boolean(filled) || staged
	const droppable = !uploading

	// The row itself is a drop target: dragging a file over a filled slot
	// reads as "replace this one", over an empty one as "fill it" — no trip
	// through the bulk zone and its matcher.
	const onDrop = (event: DragEvent) => {
		event.preventDefault()
		event.stopPropagation()
		depth.current = 0
		setDropping(false)
		if (!droppable) return
		const file = event.dataTransfer.files[0]
		if (file) onPick(file)
	}

	const action =
		'focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'

	return (
		<div
			onDragEnter={() => {
				depth.current += 1
				if (droppable) setDropping(true)
			}}
			onDragOver={event => {
				event.preventDefault()
				event.stopPropagation()
			}}
			onDragLeave={() => {
				depth.current = Math.max(0, depth.current - 1)
				if (depth.current === 0) setDropping(false)
			}}
			onDrop={onDrop}
			className={cn(
				'rounded-ui animate-ui-fade-in flex items-center gap-3 border text-sm transition-all duration-200',
				size === 'sm' ? 'p-1.5' : 'p-2',
				dropping
					? 'border-ui-primary bg-ui-primary-soft ring-ui-ring scale-[1.01] ring-2'
					: 'border-ui-border'
			)}
		>
			<span
				className={cn(
					'h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
					pending?.status === 'error'
						? 'bg-ui-danger'
						: uploading
							? 'bg-ui-primary animate-pulse'
							: staged
								? 'bg-ui-warning'
								: filled
									? 'bg-ui-success'
									: 'bg-ui-border-strong'
				)}
			/>

			{/* Reserved in every state, so picking a file does not change the
			    row's height. */}
			<FileTypeBadge
				fileName={pending?.file.name ?? filled?.stored.fileName}
				preview={pending?.preview}
				size={size}
			/>

			<div className='min-w-0 flex-1'>
				<p className='text-ui-fg truncate font-medium'>{definition.label}</p>
				{pending?.status === 'error' ? (
					<p className='text-ui-danger text-xs'>{pending.error}</p>
				) : pending ? (
					// The name is the STORAGE one: `assign` renames the pick to
					// `{slot}.{ext}` before it reaches the machine.
					<p className='text-ui-muted truncate text-xs'>
						{pending.file.name} · {formatFileSize(pending.file.size)}
						{staged && ` · ${copy.staged}`}
					</p>
				) : filled ? (
					<button
						type='button'
						onClick={onView}
						className='text-ui-muted hover:text-ui-primary block max-w-full cursor-pointer truncate text-left text-xs hover:underline'
					>
						{filled.stored.fileName}
					</button>
				) : (
					<p className='text-ui-placeholder text-xs'>
						{definition.hint ??
							definition.extensions.map(e => `.${e}`).join(' · ')}
					</p>
				)}
				{uploading && <ProgressBar percent={pending.progress} />}
			</div>

			<input
				ref={inputRef}
				type='file'
				accept={definition.extensions.map(e => `.${e}`).join(',')}
				className='hidden'
				onChange={event => {
					const file = event.target.files?.[0]
					if (file) onPick(file)
					event.target.value = ''
				}}
			/>
			{dropping && (
				<span className='bg-ui-primary text-ui-primary-fg rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap'>
					{occupied ? copy.dropToReplace : copy.upload}
				</span>
			)}
			{!dropping && filled && !uploading && (
				<button
					type='button'
					onClick={onView}
					className={cn(action, 'text-ui-primary hover:bg-ui-primary-soft')}
				>
					{copy.view}
				</button>
			)}
			{uploading ? (
				<button
					type='button'
					onClick={onAbort}
					className={cn(action, 'text-ui-muted hover:bg-ui-surface-muted')}
				>
					{copy.cancel}
				</button>
			) : dropping ? null : (
				<>
					<button
						type='button'
						onClick={() => inputRef.current?.click()}
						className={cn(action, 'text-ui-primary hover:bg-ui-primary-soft')}
					>
						{occupied ? copy.replace : copy.upload}
					</button>
					{occupied && (
						<button
							type='button'
							onClick={onRemove}
							className={cn(action, 'text-ui-muted hover:bg-ui-surface-muted')}
						>
							{copy.remove}
						</button>
					)}
				</>
			)}
		</div>
	)
}
