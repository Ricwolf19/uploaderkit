/**
 * Body scroll lock, reference counted: a per-instance save/restore breaks
 * when two overlays stack (viewer + confirm dialog), because the second
 * records the `hidden` the first applied as the value to restore.
 */
let locks = 0
let overflowBeforeLock = ''

export const lockBodyScroll = (): void => {
	if (locks === 0) {
		overflowBeforeLock = document.body.style.overflow
		document.body.style.overflow = 'hidden'
	}
	locks += 1
}

export const unlockBodyScroll = (): void => {
	locks = Math.max(0, locks - 1)
	if (locks === 0) document.body.style.overflow = overflowBeforeLock
}
