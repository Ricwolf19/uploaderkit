import { type RefObject, useEffect } from 'react'

const FOCUSABLE =
	'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Keeps `Tab` inside `ref` while `active`, focuses the panel (or its first
 * `[data-autofocus]`) on activation, and restores focus to whatever had it
 * before — the contract a modal owes the keyboard.
 */
export const useFocusTrap = (
	active: boolean,
	ref: RefObject<HTMLElement | null>
): void => {
	useEffect(() => {
		if (!active) return
		const restoreTo = document.activeElement as HTMLElement | null

		const panel = ref.current
		const initial =
			panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
		initial?.focus({ preventScroll: true })

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Tab' || !ref.current) return
			const focusables = Array.from(
				ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
			).filter(el => el.offsetParent !== null)
			if (focusables.length === 0) {
				event.preventDefault()
				return
			}
			const first = focusables[0]!
			const last = focusables[focusables.length - 1]!
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault()
				last.focus()
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault()
				first.focus()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			restoreTo?.focus({ preventScroll: true })
		}
	}, [active, ref])
}
