import { type DragEvent, type ReactNode, useRef, useState } from 'react'

import type { UploaderLabels } from '../labels'
import { useUploaderLabels } from '../react/UploaderProvider'
import { useUploader, type UseUploaderOptions } from '../react/useUploader'
import type { ScopeConfig, StoredFile } from '../types'
import { cn } from '../ui/cn'

export type AvatarUploaderProps<
	T extends Record<string, ScopeConfig> = Record<string, ScopeConfig>,
> = Pick<
	UseUploaderOptions<T>,
	'scopes' | 'scope' | 'entityId' | 'strategy' | 'rename'
> & {
	/** The stored image, if any. */
	src?: string | null
	/** What shows without an image — initials, an icon. */
	fallback?: ReactNode
	/** Diameter in px. @defaultValue 96 */
	size?: number
	onUploaded: (stored: StoredFile) => void
	/** Offered as a link under the circle when there is an image to remove. */
	onRemove?: () => void
	onError?: (message: string) => void
	alt?: string
	disabled?: boolean
	labels?: Partial<UploaderLabels>
	className?: string
}

/**
 * A picture that is its own control: click it, pick a file, watch the ring
 * close around it; or drop an image straight onto it. Uploads on select — a
 * progress ring with nothing travelling behind it would be theatre — so the
 * caller decides when the returned `StoredFile` becomes the entity's image.
 */
export const AvatarUploader = <T extends Record<string, ScopeConfig>>({
	scopes,
	scope,
	entityId,
	strategy,
	rename,
	src,
	fallback,
	size = 96,
	onUploaded,
	onRemove,
	onError,
	alt = '',
	disabled = false,
	labels,
	className,
}: AvatarUploaderProps<T>) => {
	const copy = useUploaderLabels(labels)
	const input = useRef<HTMLInputElement>(null)
	const [dropping, setDropping] = useState(false)
	// Depth counter, never a boolean — see AGENTS.md §6.
	const depth = useRef(0)

	const uploader = useUploader<T>({
		scopes,
		scope,
		entityId,
		strategy,
		uploadOn: 'select',
		maxFiles: 1,
		...(rename ? { rename } : {}),
		onUploaded: stored => {
			if (stored[0]) onUploaded(stored[0])
		},
		onError,
		labels,
	})

	const current = uploader.files[0]
	const uploading = current?.status === 'uploading'
	const failed = current?.status === 'error' ? current.error : undefined
	const shown = current?.preview ?? src ?? null
	const locked = disabled || uploading

	const onDrop = (event: DragEvent) => {
		event.preventDefault()
		depth.current = 0
		setDropping(false)
		if (locked) return
		const file = event.dataTransfer.files[0]
		if (file) void uploader.addFiles([file])
	}

	return (
		<div className={cn('inline-flex flex-col items-center gap-2', className)}>
			<div className='relative' style={{ width: size, height: size }}>
				<button
					type='button'
					onClick={() => !locked && input.current?.click()}
					onDragEnter={() => {
						depth.current += 1
						if (!locked) setDropping(true)
					}}
					onDragOver={event => event.preventDefault()}
					onDragLeave={() => {
						depth.current = Math.max(0, depth.current - 1)
						if (depth.current === 0) setDropping(false)
					}}
					onDrop={onDrop}
					disabled={locked}
					aria-busy={uploading}
					aria-label={copy.avatarChange}
					className={cn(
						'group ring-ui-border focus-visible:ring-ui-ring relative flex h-full w-full overflow-hidden rounded-full ring-2 ring-offset-2 transition-all duration-200 outline-none',
						locked
							? 'cursor-not-allowed'
							: 'hover:ring-ui-primary cursor-pointer',
						dropping && 'ring-ui-primary cursor-copy ring-4'
					)}
				>
					{shown ? (
						<img src={shown} alt={alt} className='h-full w-full object-cover' />
					) : (
						<span className='bg-ui-surface-muted text-ui-muted flex h-full w-full items-center justify-center text-xl font-semibold'>
							{fallback}
						</span>
					)}
					{dropping ? (
						<span className='bg-ui-primary/70 text-ui-primary-fg absolute inset-0 flex items-center justify-center text-xs font-semibold'>
							{copy.avatarDropHere}
						</span>
					) : uploading ? (
						<span className='absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white'>
							{current.progress}%
						</span>
					) : locked ? null : (
						<span className='absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
							{copy.avatarChange}
						</span>
					)}
				</button>

				{/* Outside the circle so it never crops it; `pathLength` makes the
				    dash offset the percentage itself. */}
				{uploading ? (
					<svg
						viewBox='0 0 100 100'
						className='pointer-events-none absolute -inset-1.5 -rotate-90'
						aria-hidden
					>
						<circle
							cx='50'
							cy='50'
							r='48'
							pathLength={100}
							fill='none'
							strokeWidth={4}
							strokeLinecap='round'
							strokeDasharray={100}
							strokeDashoffset={100 - (current?.progress ?? 0)}
							className='stroke-ui-primary transition-[stroke-dashoffset] duration-200'
						/>
					</svg>
				) : null}
			</div>

			{failed ? (
				<p className='text-ui-danger max-w-[16rem] text-center text-xs'>
					{failed}
				</p>
			) : onRemove && src && !uploading && !disabled ? (
				<button
					type='button'
					onClick={onRemove}
					className='text-ui-danger cursor-pointer text-xs hover:underline'
				>
					{copy.avatarRemove}
				</button>
			) : null}

			<input
				ref={input}
				type='file'
				accept={uploader.accept}
				className='hidden'
				disabled={locked}
				onChange={event => {
					const file = event.target.files?.[0]
					if (file) void uploader.addFiles([file])
					// The same file twice in a row must still fire `change`.
					event.target.value = ''
				}}
			/>
		</div>
	)
}
