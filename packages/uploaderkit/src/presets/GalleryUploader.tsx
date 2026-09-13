import { useState } from 'react'

import type { UploaderLabels } from '../labels'
import { useUploaderLabels } from '../react/UploaderProvider'
import { useUploader, type UseUploaderOptions } from '../react/useUploader'
import type { ScopeConfig, StoredFile } from '../types'
import { cn } from '../ui/cn'
import { Dropzone } from '../ui/Dropzone'
import { FileViewer, type ViewableFile } from '../ui/FileViewer'

export type GalleryUploaderProps<
	T extends Record<string, ScopeConfig> = Record<string, ScopeConfig>,
> = Pick<
	UseUploaderOptions<T>,
	'scopes' | 'scope' | 'entityId' | 'strategy' | 'maxFiles' | 'rename'
> & {
	/** Images already persisted, rendered as tiles ahead of the in-flight ones. */
	stored?: StoredFile[]
	onUploaded?: (stored: StoredFile[]) => void
	/** Offered on a stored tile; the caller forgets the reference (and sweeps). */
	onRemoveStored?: (file: StoredFile) => void
	onError?: (message: string) => void
	/** Re-sign or proxy a stored url right before the viewer opens it. */
	resolveViewUrl?: (file: ViewableFile) => Promise<string>
	/** Grid columns. @defaultValue 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' */
	columnsClassName?: string
	disabled?: boolean
	labels?: Partial<UploaderLabels>
	className?: string
}

/**
 * A thumbnail grid over the headless hook: every tile is the file's own
 * preview, the progress washes over it while it travels, hover reveals view
 * and remove, and a click opens the full-screen viewer over the whole set.
 * The add tile IS the dropzone.
 */
export const GalleryUploader = <T extends Record<string, ScopeConfig>>({
	scopes,
	scope,
	entityId,
	strategy,
	maxFiles,
	rename,
	stored = [],
	onUploaded,
	onRemoveStored,
	onError,
	resolveViewUrl,
	columnsClassName = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
	disabled = false,
	labels,
	className,
}: GalleryUploaderProps<T>) => {
	const copy = useUploaderLabels(labels)
	const [viewing, setViewing] = useState<ViewableFile | null>(null)
	const uploader = useUploader<T>({
		scopes,
		scope,
		entityId,
		strategy,
		multiple: true,
		...(maxFiles !== undefined ? { maxFiles } : {}),
		...(rename ? { rename } : {}),
		uploadOn: 'select',
		onUploaded,
		onError,
		labels,
	})

	// Persisted tiles come first; a file the hook already confirmed and the
	// caller echoed back through `stored` renders once.
	const storedKeys = new Set(stored.map(file => file.key))
	const inFlight = uploader.files.filter(
		file => !(file.stored && storedKeys.has(file.stored.key))
	)
	const viewable: ViewableFile[] = [
		...stored,
		...inFlight.flatMap(file => (file.stored ? [file.stored] : [])),
	]

	const tile =
		'group animate-ui-fade-in border-ui-border bg-ui-surface-muted rounded-ui-lg relative aspect-square overflow-hidden border shadow-sm transition-shadow duration-200 hover:shadow-md'
	const action =
		'bg-ui-surface/90 text-ui-fg hover:bg-ui-surface rounded-ui cursor-pointer px-2 py-1 text-[11px] font-medium shadow-sm transition-colors'

	return (
		<div className={className}>
			<div className={cn('grid gap-3', columnsClassName)}>
				{stored.map(file => (
					<div key={file.key} className={tile}>
						<img
							src={file.url}
							alt={file.fileName}
							className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
						/>
						<div className='absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
							<button
								type='button'
								onClick={() => setViewing(file)}
								className={action}
							>
								{copy.view}
							</button>
							{onRemoveStored && !disabled ? (
								<button
									type='button'
									onClick={() => onRemoveStored(file)}
									className={cn(action, 'text-ui-danger')}
								>
									{copy.remove}
								</button>
							) : null}
						</div>
					</div>
				))}

				{inFlight.map(file => (
					<div key={file.id} className={tile}>
						{file.preview ? (
							<img
								src={file.preview}
								alt={file.file.name}
								className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
							/>
						) : null}
						{file.status === 'uploading' ? (
							<div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45'>
								<span className='text-sm font-semibold text-white'>
									{file.progress}%
								</span>
								<div className='h-1 w-2/3 overflow-hidden rounded-full bg-white/30'>
									<div
										className='h-full bg-white transition-all duration-150'
										style={{ width: `${file.progress}%` }}
									/>
								</div>
							</div>
						) : null}
						{file.status === 'error' ? (
							<div className='bg-ui-danger/70 absolute inset-0 flex items-center justify-center p-2'>
								<p className='text-center text-[11px] leading-tight text-white'>
									{file.error}
								</p>
							</div>
						) : null}
						{file.status !== 'uploading' ? (
							<div className='absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
								{file.stored ? (
									<button
										type='button'
										onClick={() => file.stored && setViewing(file.stored)}
										className={action}
									>
										{copy.view}
									</button>
								) : (
									<span />
								)}
								<button
									type='button'
									onClick={() => uploader.removeFile(file.id)}
									className={cn(action, 'text-ui-danger')}
								>
									{copy.remove}
								</button>
							</div>
						) : null}
					</div>
				))}

				<Dropzone
					accept={uploader.accept}
					multiple
					size='sm'
					disabled={disabled}
					onFiles={files => void uploader.addFiles(files)}
					className='flex aspect-square flex-col items-center justify-center'
				>
					<span className='text-ui-muted text-3xl leading-none font-light'>
						+
					</span>
					<span className='text-ui-muted mt-1 text-xs'>{copy.galleryAdd}</span>
				</Dropzone>
			</div>

			<FileViewer
				file={viewing}
				files={viewable}
				onClose={() => setViewing(null)}
				{...(resolveViewUrl ? { resolveUrl: resolveViewUrl } : {})}
			/>
		</div>
	)
}
