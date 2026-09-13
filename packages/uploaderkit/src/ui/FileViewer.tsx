import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getMimeType } from '../file'
import { resolveLabels, type UploaderLabels } from '../labels'
import { cn } from './cn'
import { Kbd } from './Kbd'
import { lockBodyScroll, unlockBodyScroll } from './scrollLock'
import { useCoarsePointer } from './useCoarsePointer'
import { useFocusTrap } from './useFocusTrap'
import { useOverlayTransition } from './useOverlayTransition'

/** What the viewer needs to render a file — a StoredFile satisfies it. */
export type ViewableFile = {
	url: string
	fileName?: string
	mimeType?: string
}

export type FileViewerProps = {
	/** File to show; `null` keeps the viewer closed. */
	file: ViewableFile | null
	onClose: () => void
	/**
	 * The collection to browse. With more than one entry the viewer gains side
	 * arrows and ←/→ keyboard navigation, starting at `file`'s position.
	 */
	files?: ViewableFile[]
	/**
	 * Resolve a fresh URL right before rendering — the hook for private scopes,
	 * where the persisted signed URL may have expired and the app re-signs via
	 * its /storage signed-url endpoint.
	 */
	resolveUrl?: (file: ViewableFile) => Promise<string>
	labels?: Partial<UploaderLabels>
}

type Kind = 'image' | 'pdf' | 'other'

const kindOf = (file: ViewableFile): Kind => {
	const mime = file.mimeType || getMimeType(file.fileName ?? file.url)
	if (mime.startsWith('image/')) return 'image'
	if (mime === 'application/pdf') return 'pdf'
	return 'other'
}

const Chevron = ({ direction }: { direction: 'left' | 'right' }) => (
	<svg
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2.5'
		strokeLinecap='round'
		strokeLinejoin='round'
		className='h-5 w-5'
		aria-hidden
	>
		{direction === 'left' ? (
			<path d='m15 18-6-6 6-6' />
		) : (
			<path d='m9 18 6-6-6-6' />
		)}
	</svg>
)

/**
 * Full-screen file preview: images zoomed to fit, PDFs embedded, anything
 * else offered as a download — no more blind new-tab jumps. Pass `files` and
 * it becomes a gallery: side arrows, ←/→ on the keyboard, a position counter.
 * Used internally by `Uploader` and `SlottedUploader`, and exported standalone
 * so any screen can preview the `StoredFile`s it persisted.
 *
 * Portals to `<body>` so an ancestor's stacking context can never trap it,
 * and traps focus while open.
 */
export const FileViewer = ({
	file,
	onClose,
	files,
	resolveUrl,
	labels,
}: FileViewerProps) => {
	const copy = resolveLabels(labels)
	const coarse = useCoarsePointer()
	const [url, setUrl] = useState<string | null>(null)
	const [failed, setFailed] = useState(false)
	// Bumping it re-runs the resolution — the retry button after a failure.
	const [attempt, setAttempt] = useState(0)
	const panelRef = useRef<HTMLDivElement>(null)
	const open = file !== null
	const { mounted, entered } = useOverlayTransition(open)
	useFocusTrap(open, panelRef)

	// Gallery cursor. Synced to `file`'s position whenever the viewer opens.
	const list = files && files.length > 0 ? files : null
	const [cursor, setCursor] = useState(0)
	useEffect(() => {
		if (!file || !list) return
		const index = list.findIndex(entry => entry.url === file.url)
		setCursor(index >= 0 ? index : 0)
		// Only the opening file may reposition the cursor, not a list rebuild.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [file])

	const current = open ? (list ? (list[cursor] ?? file) : file) : null

	// The exit animation still needs something to draw after `file` nulls out.
	const lastViewRef = useRef<ViewableFile | null>(null)
	if (current) lastViewRef.current = current

	const navigate = useCallback(
		(delta: number) => {
			if (!list) return
			setCursor(previous =>
				Math.min(list.length - 1, Math.max(0, previous + delta))
			)
		},
		[list]
	)

	// In a ref, not the deps: callers pass an inline arrow and re-signing is a
	// round trip. Only the viewed file (or an explicit retry) may re-run it.
	const resolveRef = useRef(resolveUrl)
	resolveRef.current = resolveUrl
	const currentUrl = current?.url

	useEffect(() => {
		if (!current) {
			setUrl(null)
			setFailed(false)
			return
		}
		let alive = true
		setUrl(null)
		setFailed(false)
		void (async () => {
			try {
				const resolve = resolveRef.current
				const resolved = resolve ? await resolve(current) : current.url
				if (alive) setUrl(resolved)
			} catch {
				// An expired signature or a dropped connection must surface as a
				// retryable state, never as an eternal "Cargando…".
				if (alive) {
					setUrl(null)
					setFailed(true)
				}
			}
		})()
		return () => {
			alive = false
		}
		// `currentUrl` stands in for `current`: a rebuilt array with the same
		// entry must not re-sign.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUrl, attempt])

	const closeRef = useRef(onClose)
	closeRef.current = onClose

	useEffect(() => {
		if (!open) return
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeRef.current()
			if (event.key === 'ArrowLeft') navigate(-1)
			if (event.key === 'ArrowRight') navigate(1)
		}
		window.addEventListener('keydown', onKey)
		lockBodyScroll()
		return () => {
			window.removeEventListener('keydown', onKey)
			unlockBodyScroll()
		}
	}, [open, navigate])

	// iOS Safari renders an embedded PDF as a frozen first page; a narrow
	// viewport gets the download card instead, with the header tab link.
	const [narrow, setNarrow] = useState(false)
	useEffect(() => {
		if (!open) return
		const query = window.matchMedia('(max-width: 640px)')
		setNarrow(query.matches)
		const onChange = (event: MediaQueryListEvent) => setNarrow(event.matches)
		query.addEventListener('change', onChange)
		return () => query.removeEventListener('change', onChange)
	}, [open])

	const view = current ?? lastViewRef.current
	if (!mounted || !view) return null
	const kind = kindOf(view)
	const embedPdf = kind === 'pdf' && !narrow
	const hasGallery = list !== null && list.length > 1

	const arrow =
		'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-ui-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-25'

	return createPortal(
		<div
			className={cn(
				'fixed inset-0 z-1000 flex flex-col bg-black/85 transition-opacity duration-200 ease-out',
				entered ? 'opacity-100' : 'opacity-0',
				!open && 'pointer-events-none'
			)}
			onClick={onClose}
			role='dialog'
			aria-modal='true'
			aria-label={view.fileName ?? copy.filePreview}
		>
			<div
				className='flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3'
				onClick={event => event.stopPropagation()}
			>
				<p className='min-w-0 flex-1 truncate text-xs font-medium text-white sm:text-sm'>
					{view.fileName ?? copy.filePreview}
				</p>
				{hasGallery && (
					<span className='shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white tabular-nums'>
						{cursor + 1} / {list.length}
					</span>
				)}
				{url && (
					<a
						href={url}
						target='_blank'
						rel='noreferrer'
						className='focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer bg-white/10 px-3 py-1.5 text-xs whitespace-nowrap text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-none'
					>
						{copy.openInTab}
					</a>
				)}
				<button
					type='button'
					onClick={onClose}
					aria-label={copy.close}
					className='focus-visible:ring-ui-ring rounded-ui shrink-0 cursor-pointer bg-white/10 px-3 py-1.5 text-xs whitespace-nowrap text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-none'
				>
					✕ {copy.close}
				</button>
			</div>

			<div
				ref={panelRef}
				tabIndex={-1}
				className={cn(
					'relative flex min-h-0 flex-1 items-center justify-center p-3 outline-none sm:p-4',
					embedPdf && 'items-stretch'
				)}
				onClick={event => event.stopPropagation()}
			>
				{hasGallery && (
					<>
						<button
							type='button'
							onClick={() => navigate(-1)}
							disabled={cursor === 0}
							aria-label={copy.previous}
							className={cn(arrow, 'left-2 sm:left-4')}
						>
							<Chevron direction='left' />
						</button>
						<button
							type='button'
							onClick={() => navigate(1)}
							disabled={cursor === list.length - 1}
							aria-label={copy.next}
							className={cn(arrow, 'right-2 sm:right-4')}
						>
							<Chevron direction='right' />
						</button>
					</>
				)}

				{failed ? (
					<div className='bg-ui-surface rounded-ui-lg p-6 text-center'>
						<p className='text-ui-fg text-sm'>{copy.viewerError}</p>
						<button
							type='button'
							onClick={() => setAttempt(previous => previous + 1)}
							className='bg-ui-primary text-ui-primary-fg hover:bg-ui-primary-hover focus-visible:ring-ui-ring rounded-ui mt-3 inline-block cursor-pointer px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
						>
							{copy.viewerRetry}
						</button>
					</div>
				) : !url ? (
					<p className='text-sm text-white/70'>{copy.viewerLoading}</p>
				) : kind === 'image' ? (
					<img
						src={url}
						alt={view.fileName ?? ''}
						className={cn(
							'rounded-ui-lg max-h-full max-w-full object-contain shadow-2xl',
							'transition-transform duration-200 ease-out',
							entered ? 'scale-100' : 'scale-[0.97]'
						)}
					/>
				) : embedPdf ? (
					<iframe
						src={url}
						title={view.fileName ?? 'PDF'}
						className='rounded-ui-lg h-full w-full max-w-4xl bg-white shadow-2xl'
					/>
				) : (
					<div className='bg-ui-surface rounded-ui-lg p-6 text-center'>
						<p className='text-ui-fg text-sm'>{copy.noPreview}</p>
						<a
							href={url}
							download={view.fileName}
							target='_blank'
							rel='noreferrer'
							className='bg-ui-fg text-ui-surface rounded-ui mt-3 inline-block cursor-pointer px-4 py-2 text-sm transition-opacity hover:opacity-85'
						>
							{copy.download(view.fileName ?? copy.filePreview)}
						</a>
					</div>
				)}
			</div>

			{/* Shortcut hints — pointless on touch, so fine pointers only. */}
			{!coarse && (
				<div
					className='flex items-center justify-center gap-4 pb-3 text-[11px] text-white/60'
					onClick={event => event.stopPropagation()}
				>
					<span className='flex items-center gap-1.5'>
						<Kbd>Esc</Kbd> {copy.close}
					</span>
					{hasGallery && (
						<span className='flex items-center gap-1.5'>
							<Kbd>←</Kbd>
							<Kbd>→</Kbd> {copy.previous} / {copy.next}
						</span>
					)}
				</div>
			)}
		</div>,
		document.body
	)
}
