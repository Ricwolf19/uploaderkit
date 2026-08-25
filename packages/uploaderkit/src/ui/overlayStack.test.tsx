// @vitest-environment happy-dom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from './ConfirmDialog'
import { FileViewer, type ViewableFile } from './FileViewer'

afterEach(cleanup)

const file: ViewableFile = {
	url: 'https://x/a.png',
	fileName: 'a.png',
	mimeType: 'image/png',
}

describe('stacked overlays', () => {
	// Both claim Escape on window in the capture phase, and stopPropagation
	// does not stop a sibling listener on the same node — without the layer
	// stack one press closed the dialog AND the viewer underneath it.
	it('Escape reaches only the innermost overlay', async () => {
		const onClose = vi.fn()
		const onCancel = vi.fn()

		const { rerender } = render(
			<>
				<FileViewer file={file} onClose={onClose} />
				<ConfirmDialog
					open={false}
					title='Remove'
					message='¿Seguro?'
					onConfirm={() => {}}
					onCancel={onCancel}
				/>
			</>
		)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		// The dialog opens over the viewer, the way an app composes them.
		rerender(
			<>
				<FileViewer file={file} onClose={onClose} />
				<ConfirmDialog
					open
					title='Remove'
					message='¿Seguro?'
					onConfirm={() => {}}
					onCancel={onCancel}
				/>
			</>
		)
		await waitFor(() => expect(screen.getByRole('alertdialog')).toBeTruthy())

		fireEvent.keyDown(window, { key: 'Escape' })
		expect(onCancel).toHaveBeenCalledTimes(1)
		expect(onClose).not.toHaveBeenCalled()
	})

	it('the viewer answers again once it is alone', async () => {
		const onClose = vi.fn()
		render(<FileViewer file={file} onClose={onClose} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		fireEvent.keyDown(window, { key: 'Escape' })
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('claims the key so a host dialog underneath does not also close', async () => {
		const hostEscape = vi.fn()
		// A host app Modal listens on document in the bubble phase.
		document.addEventListener('keydown', hostEscape)

		render(<FileViewer file={file} onClose={() => {}} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		fireEvent.keyDown(window, { key: 'Escape' })
		expect(hostEscape).not.toHaveBeenCalled()
		document.removeEventListener('keydown', hostEscape)
	})
})
