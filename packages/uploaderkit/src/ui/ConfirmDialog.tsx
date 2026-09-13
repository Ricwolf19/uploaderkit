import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { resolveLabels, type UploaderLabels } from '../labels'
import { cn } from './cn'
import { lockBodyScroll, unlockBodyScroll } from './scrollLock'
import { useFocusTrap } from './useFocusTrap'
import { useOverlayTransition } from './useOverlayTransition'

export type ConfirmDialogProps = {
	open: boolean
	title: string
	message: ReactNode
	/** Tone of the affirmative button. @defaultValue 'danger' */
	variant?: 'danger' | 'primary'
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel: () => void
	labels?: Partial<UploaderLabels>
}

/**
 * Second-step gate for destructive file actions — remove a stored file,
 * replace a slot. Focus lands on **cancel** so a stray Enter never destroys
 * anything, Escape and the backdrop cancel, and `Tab` stays inside. Exported
 * for app-level use around the uploaders' callbacks.
 */
export const ConfirmDialog = ({
	open,
	title,
	message,
	variant = 'danger',
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel,
	labels,
}: ConfirmDialogProps) => {
	const copy = resolveLabels(labels)
	const panelRef = useRef<HTMLDivElement>(null)
	const { mounted, entered } = useOverlayTransition(open)
	useFocusTrap(open, panelRef)

	const cancelRef = useRef(onCancel)
	cancelRef.current = onCancel

	useEffect(() => {
		if (!open) return
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.stopPropagation()
				cancelRef.current()
			}
		}
		// Capture phase so an open FileViewer underneath does not also close.
		window.addEventListener('keydown', onKey, true)
		lockBodyScroll()
		return () => {
			window.removeEventListener('keydown', onKey, true)
			unlockBodyScroll()
		}
	}, [open])

	if (!mounted) return null

	return createPortal(
		<div
			className={cn(
				'fixed inset-0 z-1000 flex items-end justify-center p-4 sm:items-center',
				!open && 'pointer-events-none'
			)}
			onClick={onCancel}
		>
			<div
				aria-hidden
				className={cn(
					'bg-ui-overlay fixed inset-0 transition-opacity duration-200 ease-out',
					entered ? 'opacity-100' : 'opacity-0'
				)}
			/>
			<div
				ref={panelRef}
				role='alertdialog'
				aria-modal='true'
				aria-label={title}
				tabIndex={-1}
				onClick={event => event.stopPropagation()}
				className={cn(
					'bg-ui-surface rounded-ui-xl relative w-full max-w-md p-6 shadow-2xl outline-none',
					'transition duration-200 ease-out',
					entered
						? 'translate-y-0 scale-100 opacity-100'
						: 'translate-y-3 scale-[0.97] opacity-0'
				)}
			>
				<div className='flex items-start gap-4'>
					<span
						className={cn(
							'flex size-11 shrink-0 items-center justify-center rounded-full',
							variant === 'danger' ? 'bg-ui-danger-soft' : 'bg-ui-primary-soft'
						)}
					>
						<svg
							viewBox='0 0 24 24'
							className={cn(
								'size-6',
								variant === 'danger' ? 'text-ui-danger' : 'text-ui-primary'
							)}
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							aria-hidden
						>
							<path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
							<line x1='12' y1='9' x2='12' y2='13' />
							<line x1='12' y1='17' x2='12.01' y2='17' />
						</svg>
					</span>

					<div className='min-w-0 flex-1'>
						<h2 className='text-ui-fg text-base font-semibold'>{title}</h2>
						<div className='text-ui-muted mt-1 text-sm'>{message}</div>
					</div>
				</div>

				<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
					<button
						type='button'
						data-autofocus
						onClick={onCancel}
						className='border-ui-border-strong text-ui-fg hover:bg-ui-surface-muted focus-visible:ring-ui-ring rounded-ui h-10 cursor-pointer border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:w-auto'
					>
						{cancelLabel ?? copy.cancel}
					</button>
					<button
						type='button'
						onClick={onConfirm}
						className={cn(
							'focus-visible:ring-ui-ring rounded-ui h-10 cursor-pointer px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:w-auto',
							variant === 'danger'
								? 'bg-ui-danger text-ui-danger-fg hover:bg-ui-danger-hover'
								: 'bg-ui-primary text-ui-primary-fg hover:bg-ui-primary-hover'
						)}
					>
						{confirmLabel ?? copy.confirm}
					</button>
				</div>
			</div>
		</div>,
		document.body
	)
}
