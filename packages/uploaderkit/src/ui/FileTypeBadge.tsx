import { getFileExtension } from '../file'
import { cn } from './cn'

export type FileTypeBadgeProps = {
	fileName: string
	/** Local thumbnail for images; falls back to the extension chip. */
	preview?: string
	/** @defaultValue 'md' */
	size?: 'sm' | 'md'
}

/**
 * The 40x40 leading square of a file row: the image thumbnail when there is
 * one, otherwise the extension in a grey chip. Same size either way, so rows
 * with and without a preview line up.
 */
export const FileTypeBadge = ({
	fileName,
	preview,
	size = 'md',
}: FileTypeBadgeProps) => {
	const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
	return preview ? (
		<img
			src={preview}
			alt=''
			className={cn('rounded-ui shrink-0 object-cover', box)}
		/>
	) : (
		<span
			className={cn(
				'bg-ui-surface-muted text-ui-muted rounded-ui flex shrink-0 items-center justify-center font-medium uppercase',
				size === 'sm' ? 'text-[10px]' : 'text-xs',
				box
			)}
		>
			{getFileExtension(fileName)}
		</span>
	)
}
