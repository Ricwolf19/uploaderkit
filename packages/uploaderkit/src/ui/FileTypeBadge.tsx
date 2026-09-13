import { getFileExtension } from '../file'
import { cn } from './cn'

export type FileTypeBadgeProps = {
	/** Omit for an empty position — the same square, dashed. */
	fileName?: string
	/** Local thumbnail for images; falls back to the extension chip. */
	preview?: string
	/** @defaultValue 'md' */
	size?: 'sm' | 'md'
}

/**
 * The 40x40 leading square of a file row: the image thumbnail when there is
 * one, the extension in a grey chip when there is a file, and a dashed
 * placeholder when the position is empty. Same size in all three, so a row does
 * not jump the moment a file lands in it.
 */
export const FileTypeBadge = ({
	fileName,
	preview,
	size = 'md',
}: FileTypeBadgeProps) => {
	const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
	if (!fileName) {
		return (
			<span
				aria-hidden='true'
				className={cn(
					'border-ui-border rounded-ui shrink-0 border border-dashed',
					box
				)}
			/>
		)
	}
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
