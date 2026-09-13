import { useEffect, useRef } from 'react'

import { warnDev } from '../warn'

type ShortcutSpec = {
	mod: boolean
	shift: boolean
	alt: boolean
	key: string
}

/** `'mod+u'` → ⌘U on mac, Ctrl+U elsewhere. `mod`, `shift`, `alt` + one key. */
const parseShortcut = (combo: string): ShortcutSpec => {
	const parts = combo.toLowerCase().split('+')
	return {
		mod: parts.includes('mod'),
		shift: parts.includes('shift'),
		alt: parts.includes('alt'),
		key: parts[parts.length - 1]!,
	}
}

const IS_MAC =
	typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** Human hint for a combo: `'mod+u'` → `⌘U` / `Ctrl+U`. */
export const formatShortcut = (combo: string): string => {
	const spec = parseShortcut(combo)
	const key = spec.key.length === 1 ? spec.key.toUpperCase() : spec.key
	const parts: string[] = []
	if (spec.mod) parts.push(IS_MAC ? '⌘' : 'Ctrl')
	if (spec.alt) parts.push(IS_MAC ? '⌥' : 'Alt')
	if (spec.shift) parts.push(IS_MAC ? '⇧' : 'Shift')
	parts.push(key)
	return parts.join(IS_MAC ? '' : '+')
}

/** Combos currently bound, to catch two zones claiming the same keys. */
const active = new Map<string, number>()

/**
 * Binds a global shortcut while mounted. Never fires from an input, textarea
 * or contenteditable — typing keeps priority — and warns in development when
 * two surfaces register the same combo at once, because only both firing or
 * an arbitrary winner can come out of that.
 */
export const useShortcut = (
	combo: string | undefined,
	handler: () => void,
	disabled = false
): void => {
	const handlerRef = useRef(handler)
	handlerRef.current = handler

	useEffect(() => {
		if (!combo || disabled) return
		const spec = parseShortcut(combo)

		active.set(combo, (active.get(combo) ?? 0) + 1)
		if ((active.get(combo) ?? 0) > 1) {
			warnDev(
				`shortcut-collision:${combo}`,
				`two surfaces registered the shortcut "${combo}" at the same time — give each its own combo or scope one out.`
			)
		}

		const onKey = (event: KeyboardEvent) => {
			if (event.repeat) return
			// `target` can be `window` itself; only elements can host a field.
			const target = event.target
			if (
				target instanceof Element &&
				target.closest('input, textarea, select, [contenteditable]')
			) {
				return
			}
			if (event.key.toLowerCase() !== spec.key) return
			if (spec.mod !== (event.metaKey || event.ctrlKey)) return
			if (spec.shift !== event.shiftKey) return
			if (spec.alt !== event.altKey) return
			event.preventDefault()
			handlerRef.current()
		}

		window.addEventListener('keydown', onKey)
		return () => {
			window.removeEventListener('keydown', onKey)
			const count = (active.get(combo) ?? 1) - 1
			if (count <= 0) active.delete(combo)
			else active.set(combo, count)
		}
	}, [combo, disabled])
}
