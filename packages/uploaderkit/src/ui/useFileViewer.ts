import { useCallback, useMemo, useState } from 'react'

import type { FileViewerProps, ViewableFile } from './FileViewer'

export type UseFileViewerOptions = {
	/** Forwarded to the viewer — the authenticated resolver for private urls. */
	resolveUrl?: FileViewerProps['resolveUrl']
}

export type UseFileViewerReturn = {
	/** Currently open file, `null` when closed. */
	viewing: ViewableFile | null
	open: (file: ViewableFile) => void
	close: () => void
	/** Spread into `<FileViewer {...viewerProps} />` — the whole wiring. */
	viewerProps: Pick<FileViewerProps, 'file' | 'onClose' | 'resolveUrl'>
}

/**
 * The open/close state every screen with a `FileViewer` repeats. One call
 * replaces the `useState` + prop plumbing:
 *
 * ```tsx
 * const viewer = useFileViewer({ resolveUrl })
 * <button onClick={() => viewer.open(stored)}>Ver</button>
 * <FileViewer {...viewer.viewerProps} />
 * ```
 */
export const useFileViewer = ({
	resolveUrl,
}: UseFileViewerOptions = {}): UseFileViewerReturn => {
	const [viewing, setViewing] = useState<ViewableFile | null>(null)
	const close = useCallback(() => setViewing(null), [])
	const open = useCallback((file: ViewableFile) => setViewing(file), [])

	return {
		viewing,
		open,
		close,
		viewerProps: useMemo(
			() => ({ file: viewing, onClose: close, resolveUrl }),
			[viewing, close, resolveUrl]
		),
	}
}
