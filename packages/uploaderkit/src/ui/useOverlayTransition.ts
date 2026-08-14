import { useEffect, useRef, useState } from 'react'

/** Kept in sync with the transition classes the overlays use. */
const OVERLAY_ANIMATION_MS = 200

export type OverlayTransition = {
	/** Render while `true` — spans the exit animation past `open = false`. */
	mounted: boolean
	/** Drives the transition classes: `false` on both edges of the animation. */
	entered: boolean
}

/**
 * The enter/exit choreography every overlay shares: render on open, flip
 * `entered` a frame later so the transition runs, keep rendering
 * `OVERLAY_ANIMATION_MS` past close so the exit is visible.
 *
 * @see AGENTS.md §3
 */
export const useOverlayTransition = (open: boolean): OverlayTransition => {
	const [entered, setEntered] = useState(false)
	const [exiting, setExiting] = useState(false)
	const wasOpen = useRef(false)

	useEffect(() => {
		if (open) {
			wasOpen.current = true
			setExiting(false)
			const raf = requestAnimationFrame(() => setEntered(true))
			return () => cancelAnimationFrame(raf)
		}
		setEntered(false)
		if (!wasOpen.current) return
		wasOpen.current = false
		setExiting(true)
		const timer = setTimeout(() => setExiting(false), OVERLAY_ANIMATION_MS)
		return () => clearTimeout(timer)
	}, [open])

	return { mounted: open || exiting, entered }
}
