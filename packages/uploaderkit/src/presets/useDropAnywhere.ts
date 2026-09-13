import { useEffect, useRef, useState } from 'react'

export type UseDropAnywhereOptions = {
	/** Listen at all. Off while the surface that wants the files is closed. */
	enabled?: boolean
	/** Receives the accepted files of one drop, anywhere in the window. */
	onFiles: (files: File[]) => void
	/**
	 * Same syntax as `<input accept>`: `.pdf,.xlsx,image/*`. Files outside it go
	 * to `onRejected` instead of `onFiles`; omit to accept everything.
	 */
	accept?: string
	onRejected?: (files: File[]) => void
}

export type DropAnywhere = {
	/** A file drag is over the window — show the overlay. */
	dragging: boolean
}

const matchesAccept = (file: File, accept: string): boolean => {
	const tokens = accept
		.split(',')
		.map(token => token.trim().toLowerCase())
		.filter(Boolean)
	if (tokens.length === 0) return true
	const name = file.name.toLowerCase()
	const type = file.type.toLowerCase()
	return tokens.some(token => {
		if (token.startsWith('.')) return name.endsWith(token)
		if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
		return type === token
	})
}

/**
 * The whole window as a drop target. A depth counter on `dragenter` /
 * `dragleave` at window level says when a file drag is present (a boolean
 * flickers on every child boundary — see AGENTS.md §6), and the window's
 * `drop` is the ONE place files are delivered: an overlay drawn while dragging
 * must not handle `drop` itself, or every file arrives twice.
 *
 * Pair it with {@link DropAnywhereOverlay}, or draw your own — the overlay is
 * purely visual.
 */
export const useDropAnywhere = ({
	enabled = true,
	onFiles,
	accept,
	onRejected,
}: UseDropAnywhereOptions): DropAnywhere => {
	const [dragging, setDragging] = useState(false)

	// In refs, not the deps: a consumer passing an inline arrow would re-run
	// the effect on every render, and `depth` lives INSIDE it — resetting the
	// counter mid-drag reintroduces exactly the flicker it exists to prevent
	// (AGENTS.md §3, same rule as FileViewer's resolveViewUrl).
	const onFilesRef = useRef(onFiles)
	onFilesRef.current = onFiles
	const onRejectedRef = useRef(onRejected)
	onRejectedRef.current = onRejected

	useEffect(() => {
		if (!enabled) {
			setDragging(false)
			return
		}
		let depth = 0
		const onEnter = (event: DragEvent) => {
			if (!event.dataTransfer?.types.includes('Files')) return
			depth += 1
			setDragging(true)
		}
		const onLeave = () => {
			depth = Math.max(0, depth - 1)
			if (depth === 0) setDragging(false)
		}
		const onOver = (event: DragEvent) => event.preventDefault()
		const onDrop = (event: DragEvent) => {
			event.preventDefault()
			depth = 0
			setDragging(false)
			const files = Array.from(event.dataTransfer?.files ?? [])
			if (files.length === 0) return
			const accepted = accept
				? files.filter(file => matchesAccept(file, accept))
				: files
			const rejected = files.filter(file => !accepted.includes(file))
			if (accepted.length > 0) onFilesRef.current(accepted)
			if (rejected.length > 0) onRejectedRef.current?.(rejected)
		}
		window.addEventListener('dragenter', onEnter)
		window.addEventListener('dragleave', onLeave)
		window.addEventListener('dragover', onOver)
		window.addEventListener('drop', onDrop)
		return () => {
			window.removeEventListener('dragenter', onEnter)
			window.removeEventListener('dragleave', onLeave)
			window.removeEventListener('dragover', onOver)
			window.removeEventListener('drop', onDrop)
		}
		// Only what genuinely re-binds the listeners.
	}, [enabled, accept])

	return { dragging }
}
