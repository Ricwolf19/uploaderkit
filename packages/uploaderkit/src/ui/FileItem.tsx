import { formatFileSize } from '../index'
import { resolveLabels, type UploaderLabels } from '../labels'
import type { UploaderFile } from '../react'
import { cn } from './cn'
import { FileTypeBadge } from './FileTypeBadge'
import { ProgressBar } from './ProgressBar'

export type FileItemProps = {
	file: UploaderFile
	onRemove: () => void
	onAbort: () => void
	/** Present on successes when a viewer is available. */
	onView?: () => void
	/** @defaultValue 'md' */
	size?: 'sm' | 'md'
	labels?: Partial<UploaderLabels>
}

/**
 * One row of upload state: preview/extension badge, name, size, a progress
 * bar while in flight, the error when it failed. Shared by both uploaders so
 * a file always looks the same wherever it is being uploaded.
 */
export const FileItem = ({
	file,
	onRemove,
	onAbort,
	onView,
	size = 'md',
	labels,
}: FileItemProps) => {
	const copy = resolveLabels(labels)
	const uploading = file.status === 'uploading'

	return (
		<div
			className={cn(
				'rounded-ui animate-ui-fade-in flex items-center gap-3 border text-sm transition-colors',
				size === 'sm' ? 'p-1.5' : 'p-2',
				file.status === 'error'
					? 'border-ui-danger-soft-fg/20 bg-ui-danger-soft'
					: 'border-ui-border bg-ui-surface'
			)}
		>
			<FileTypeBadge
				fileName={file.file.name}
				preview={file.preview}
				size={size}
			/>

			<div className='min-w-0 flex-1'>
				<p className='text-ui-fg truncate font-medium'>{file.file.name}</p>
				{file.status === 'error' ? (
					<p className='text-ui-danger text-xs'>{file.error}</p>
				) : (
					<p className='text-ui-muted text-xs'>
						{formatFileSize(file.file.size)}
						{file.status === 'success' && ` · ${copy.ready}`}
					</p>
				)}
				{uploading && <ProgressBar percent={file.progress} />}
			</div>

			{onView && (
				<button
					type='button'
					onClick={onView}
					className='text-ui-primary hover:bg-ui-primary-soft focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
				>
					{copy.view}
				</button>
			)}
			<button
				type='button'
				onClick={uploading ? onAbort : onRemove}
				className='text-ui-muted hover:bg-ui-surface-muted hover:text-ui-fg focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
			>
				{uploading ? copy.cancel : copy.remove}
			</button>
		</div>
	)
}
