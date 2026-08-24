import { useEffect, useMemo, useRef } from 'react'

/**
 * Which open overlay answers a dismiss key.
 *
 * `FileViewer` and `ConfirmDialog` both claim Escape on `window` in the
 * CAPTURE phase, so they beat a host app's own dialog (a typical Modal
 * listens on `document` in bubble). But two listeners on the same node
 * in the same phase both run — `stopPropagation` only stops other NODES — so
 * a confirm opened over the viewer would close both on one press.
 *
 * Ordering by registration would not help either: that is open order, and the
 * layer that must answer is the innermost, which opened last.
 *
 * Package-local on purpose: a design system that ships its own dismiss
 * stack keeps it, and neither has to depend on the other (invariant §4).
 */
let sequence = 0
const stack: number[] = []

export type OverlayLayer = {
	/** `true` while this layer is the innermost open one. */
	isTopmost: () => boolean
}

/** Joins the stack while `active`, and leaves it on close or unmount. */
export const useOverlayLayer = (active: boolean): OverlayLayer => {
	const idRef = useRef(0)
	if (idRef.current === 0) idRef.current = ++sequence

	useEffect(() => {
		if (!active) return
		const id = idRef.current
		stack.push(id)
		return () => {
			const at = stack.lastIndexOf(id)
			if (at !== -1) stack.splice(at, 1)
		}
	}, [active])

	return useMemo(
		() => ({ isTopmost: () => stack[stack.length - 1] === idRef.current }),
		[]
	)
}
