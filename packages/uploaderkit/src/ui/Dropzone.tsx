import {
	type ClipboardEvent,
	type DragEvent,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from 'react'

import { cn } from './cn'
import { Kbd } from './Kbd'
import { useCoarsePointer } from './useCoarsePointer'
import { formatShortcut, useShortcut } from './useShortcut'

export type DropzoneProps = {
	accept: string
	multiple?: boolean
	disabled?: boolean
	/**
	 * Mobile camera shortcut: `'environment'` (rear) or `'user'` (front) makes
	 * the file picker offer the camera directly on touch devices. Desktop
	 * browsers ignore it.
	 */
	capture?: 'user' | 'environment'
	/** @defaultValue 'md' */
	size?: 'sm' | 'md'
	/**
	 * Global keyboard shortcut that opens this zone's picker, e.g. `'mod+u'`
	 * (⌘U / Ctrl+U). A small key hint renders under the prompt on fine
	 * pointers. With several zones on screen, give each its own combo.
	 */
	shortcut?: string
	onFiles: (files: File[]) => void
	children: ReactNode
	className?: string
}

/**
 * The one drag-and-drop surface both uploaders share: drag state, click and
 * keyboard to browse, paste while focused (screenshots land as files), and a
 * hidden input. Presentation comes from `children`.
 */
export const Dropzone = ({
	accept,
	multiple = false,
	disabled = false,
	capture,
	size = 'md',
	shortcut,
	onFiles,
	children,
	className,
}: DropzoneProps) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [dragging, setDragging] = useState(false)
	// Depth counter, not a boolean: entering a child fires `dragleave` on this
	// wrapper. See AGENTS.md §6.
	const depth = useRef(0)
	const coarse = useCoarsePointer()
	useShortcut(shortcut, () => inputRef.current?.click(), disabled)

	const emit = useCallback(
		(list: FileList | null) => {
			if (disabled || !list || list.length === 0) return
			onFiles(Array.from(list))
		},
		[disabled, onFiles]
	)

	const onDrop = useCallback(
		(event: DragEvent) => {
			event.preventDefault()
			depth.current = 0
			setDragging(false)
			emit(event.dataTransfer.files)
		},
		[emit]
	)

	const onPaste = useCallback(
		(event: ClipboardEvent) => {
			// A pasted screenshot arrives as a file; pasted text has none and
			// falls through untouched. Validation rejects what the scope won't.
			if (event.clipboardData.files.length === 0) return
			event.preventDefault()
			emit(event.clipboardData.files)
		},
		[emit]
	)

	return (
		<div
			role='button'
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			data-dragging={dragging || undefined}
			onClick={() => !disabled && inputRef.current?.click()}
			onKeyDown={event => {
				if (disabled) return
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					inputRef.current?.click()
				}
			}}
			onDragEnter={() => {
				depth.current += 1
				if (!disabled) setDragging(true)
			}}
			onDragOver={event => event.preventDefault()}
			onDragLeave={() => {
				depth.current = Math.max(0, depth.current - 1)
				if (depth.current === 0) setDragging(false)
			}}
			onDrop={onDrop}
			onPaste={onPaste}
			className={cn(
				// `group/dz` + `data-dragging` let the children (the icon, the
				// prompt) react to hover and drag without owning any state.
				// `touch-manipulation` kills the 300ms tap delay; the active scale
				// is the press feedback a touch screen needs in place of hover.
				'group/dz rounded-ui-lg focus-visible:ring-ui-ring block w-full cursor-pointer touch-manipulation border-2 border-dashed text-center transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none',
				size === 'sm' ? 'p-3' : 'p-5',
				dragging
					? 'border-ui-primary bg-ui-primary-soft shadow-ui-primary/15 scale-[1.02] shadow-lg'
					: 'border-ui-border-strong hover:border-ui-primary/60 hover:bg-ui-primary-soft/40 hover:shadow-ui-primary/10 bg-ui-surface-subtle/50 hover:shadow-md',
				!disabled && 'active:scale-[0.98]',
				disabled && 'cursor-not-allowed opacity-50',
				className
			)}
		>
			<input
				ref={inputRef}
				type='file'
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				{...(capture ? { capture } : {})}
				className='hidden'
				// The wrapper's own `input.click()` bubbles back here and would
				// re-enter it. Load-bearing — see AGENTS.md §6.
				onClick={event => event.stopPropagation()}
				onChange={event => {
					emit(event.target.files)
					// Same file picked twice must fire change again.
					event.target.value = ''
				}}
			/>
			{children}
			{shortcut && !coarse && (
				<span className='mt-2 block'>
					<Kbd>{formatShortcut(shortcut)}</Kbd>
				</span>
			)}
		</div>
	)
}
