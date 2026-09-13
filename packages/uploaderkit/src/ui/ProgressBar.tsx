import { cn } from './cn'

export type ProgressBarProps = {
	/** 0–100. */
	percent: number
	className?: string
}

/**
 * The thin in-flight bar under a file's name — a grey track with a blue fill.
 * Shared by every upload row so progress reads the same wherever it appears.
 */
export const ProgressBar = ({ percent, className }: ProgressBarProps) => (
	<div
		className={cn(
			'bg-ui-surface-muted mt-1 h-1 w-full overflow-hidden rounded',
			className
		)}
	>
		<div
			className='bg-ui-primary h-full transition-all'
			style={{ width: `${percent}%` }}
		/>
	</div>
)
