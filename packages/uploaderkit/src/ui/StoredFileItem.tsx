import { formatFileSize } from '../file'
import type { UploaderLabels } from '../labels'
import { useUploaderLabels } from '../react/UploaderProvider'
import type { StoredFile } from '../types'
import { cn } from './cn'
import { FileTypeBadge } from './FileTypeBadge'

export type StoredFileItemProps = {
	file: StoredFile
	onView: () => void
	/** Omitted when the screen does not let the user detach a persisted file. */
	onRemove?: (file: StoredFile) => void
	/** @defaultValue 'md' */
	size?: 'sm' | 'md'
	labels?: Partial<UploaderLabels>
}

/**
 * One row for a file the app has already persisted: extension chip, name,
 * size, and the actions to preview or forget it. The settled counterpart of
 * `FileItem`, which tracks a file that is still going through the machine.
 */
export const StoredFileItem = ({
	file,
	onView,
	onRemove,
	size = 'md',
	labels,
}: StoredFileItemProps) => {
	const copy = useUploaderLabels(labels)

	return (
		<div
			className={cn(
				'border-ui-border bg-ui-surface-subtle rounded-ui animate-ui-fade-in flex items-center gap-3 border text-sm',
				size === 'sm' ? 'p-1.5' : 'p-2'
			)}
		>
			<FileTypeBadge fileName={file.fileName} size={size} />

			<div className='min-w-0 flex-1'>
				<p className='text-ui-fg truncate font-medium'>{file.fileName}</p>
				<p className='text-ui-muted text-xs'>{formatFileSize(file.size)}</p>
			</div>

			<button
				type='button'
				onClick={onView}
				className='text-ui-primary hover:bg-ui-primary-soft focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
			>
				{copy.view}
			</button>
			{onRemove && (
				<button
					type='button'
					onClick={() => onRemove(file)}
					className='text-ui-muted hover:bg-ui-surface-muted hover:text-ui-fg focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
				>
					{copy.remove}
				</button>
			)}
		</div>
	)
}
