// @vitest-environment happy-dom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FileViewer, type ViewableFile } from './FileViewer'

afterEach(cleanup)

const gallery: ViewableFile[] = [
	{ url: 'https://x/1.png', fileName: '1.png', mimeType: 'image/png' },
	{ url: 'https://x/2.png', fileName: '2.png', mimeType: 'image/png' },
	{ url: 'https://x/3.png', fileName: '3.png', mimeType: 'image/png' },
]

describe('FileViewer gallery', () => {
	it('opens at the given file and navigates with the keyboard', async () => {
		render(<FileViewer file={gallery[1]!} files={gallery} onClose={() => {}} />)

		await waitFor(() =>
			expect(document.querySelector('img')?.getAttribute('src')).toBe(
				'https://x/2.png'
			)
		)
		expect(screen.getByText('2 / 3')).toBeTruthy()

		fireEvent.keyDown(window, { key: 'ArrowRight' })
		await waitFor(() =>
			expect(document.querySelector('img')?.getAttribute('src')).toBe(
				'https://x/3.png'
			)
		)

		// At the end the next arrow is disabled and → is a no-op.
		fireEvent.keyDown(window, { key: 'ArrowRight' })
		expect(screen.getByText('3 / 3')).toBeTruthy()

		fireEvent.keyDown(window, { key: 'ArrowLeft' })
		await waitFor(() => expect(screen.getByText('2 / 3')).toBeTruthy())
	})

	it('side arrows navigate too', async () => {
		render(<FileViewer file={gallery[0]!} files={gallery} onClose={() => {}} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		fireEvent.click(screen.getByLabelText('Siguiente'))
		await waitFor(() =>
			expect(document.querySelector('img')?.getAttribute('src')).toBe(
				'https://x/2.png'
			)
		)
		expect(screen.getByLabelText('Anterior').hasAttribute('disabled')).toBe(
			false
		)
	})
})
