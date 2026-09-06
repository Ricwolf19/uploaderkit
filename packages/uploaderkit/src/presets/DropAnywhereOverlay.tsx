import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import type { UploaderLabels } from '../labels'
import { useUploaderLabels } from '../react/UploaderProvider'
import { cn } from '../ui/cn'

export type DropAnywhereOverlayProps = {
	/** Usually `useDropAnywhere().dragging`. */
	open: boolean
	/** Replaces the default document glyph. */
	icon?: ReactNode
	title?: ReactNode
	hint?: ReactNode
	labels?: Partial<UploaderLabels>
	className?: string
}

const DocumentGlyph = () => (
	<svg
		width='40'
		height='40'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.6'
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden
	>
		<path d='M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' />
		<path d='M14 3v5h5' />
		<path d='M12 18v-6' />
		<path d='m9.5 14.5 2.5-2.5 2.5 2.5' />
	</svg>
)

/**
 * The full-window invitation that pairs with {@link useDropAnywhere}. Purely
 * visual and `pointer-events-none`: the drop lands on the window, where the
 * hook delivers the files exactly once. Portals to `document.body` above the
 * kit's overlays.
 */
export const DropAnywhereOverlay = ({
	open,
	icon,
	title,
	hint,
	labels,
	className,
}: DropAnywhereOverlayProps) => {
	const copy = useUploaderLabels(labels)
	if (!open || typeof document === 'undefined') return null
	return createPortal(
		<div
			aria-hidden
			className='animate-ui-fade-in bg-ui-overlay pointer-events-none fixed inset-0 z-1010 flex items-center justify-center p-6'
		>
			<div
				className={cn(
					'border-ui-primary bg-ui-surface text-ui-fg rounded-ui-xl flex flex-col items-center gap-2 border-2 border-dashed px-10 py-8 shadow-2xl',
					className
				)}
			>
				<span className='text-ui-primary'>{icon ?? <DocumentGlyph />}</span>
				<p className='text-base font-semibold'>
					{title ?? copy.dropAnywhereTitle}
				</p>
				<p className='text-ui-muted text-sm'>{hint ?? copy.dropAnywhereHint}</p>
			</div>
		</div>,
		document.body
	)
}
