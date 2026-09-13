// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'

import { lockBodyScroll, unlockBodyScroll } from './scrollLock'

const KEY = Symbol.for('uploaderkit.bodyScrollLock')
type State = { count: number; saved: string }

const reset = () => {
	delete (globalThis as { [KEY]?: State })[KEY]
	document.body.style.overflow = ''
}

afterEach(reset)

describe('scrollLock', () => {
	it('restores the pre-lock overflow after balanced lock/unlock', () => {
		document.body.style.overflow = 'auto'
		lockBodyScroll()
		expect(document.body.style.overflow).toBe('hidden')
		unlockBodyScroll()
		expect(document.body.style.overflow).toBe('auto')
	})

	it('holds the lock until the LAST of stacked overlays releases', () => {
		lockBodyScroll() // a foreign modal
		lockBodyScroll() // the viewer on top
		unlockBodyScroll()
		expect(document.body.style.overflow).toBe('hidden')
		unlockBodyScroll()
		expect(document.body.style.overflow).toBe('')
	})

	/**
	 * The cross-package regression: a twin module (a second copy of this
	 * own counter used to record the first lock's `hidden` as its restore
	 * value — whichever unlock ran last left the page frozen with both
	 * counters at zero. One `Symbol.for` registry makes every copy converge.
	 */
	it('shares one counter with any twin module via Symbol.for', () => {
		// Simulate the ui package's copy: same key, same shape, separate code.
		const host = globalThis as { [KEY]?: State }
		const twinLock = () => {
			const state = (host[KEY] ??= { count: 0, saved: '' })
			if (state.count === 0) {
				state.saved = document.body.style.overflow
				document.body.style.overflow = 'hidden'
			}
			state.count += 1
		}
		const twinUnlock = () => {
			const state = (host[KEY] ??= { count: 0, saved: '' })
			if (state.count === 0) return
			state.count -= 1
			if (state.count === 0) document.body.style.overflow = state.saved
		}

		twinLock() // ui Modal opens
		lockBodyScroll() // FileViewer opens on top
		unlockBodyScroll() // Esc closes only the viewer
		expect(document.body.style.overflow).toBe('hidden') // modal still up
		twinUnlock() // modal closes later
		expect(document.body.style.overflow).toBe('')
	})

	it('treats an unbalanced unlock as a no-op', () => {
		document.body.style.overflow = 'auto'
		unlockBodyScroll()
		expect(document.body.style.overflow).toBe('auto')
	})
})
