// @vitest-environment happy-dom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FileViewer, type ViewableFile } from './FileViewer'

afterEach(cleanup)

const file: ViewableFile = {
	url: 'https://x/a.png',
	fileName: 'a.png',
	mimeType: 'image/png',
}

describe('FileViewer', () => {
	it('a failing resolveUrl surfaces a retryable error, not eternal loading', async () => {
		let calls = 0
		const resolveUrl = vi.fn(async () => {
			calls += 1
			if (calls === 1) throw new Error('signature expired')
			return 'https://x/a.png?sig=fresh'
		})

		render(
			<FileViewer file={file} onClose={() => {}} resolveUrl={resolveUrl} />
		)

		await waitFor(() =>
			expect(screen.getByText('The preview could not be loaded')).toBeTruthy()
		)

		fireEvent.click(screen.getByText('Retry'))
		await waitFor(() =>
			expect(document.querySelector('img')?.getAttribute('src')).toBe(
				'https://x/a.png?sig=fresh'
			)
		)
	})

	it('escape closes and focus returns to the opener', async () => {
		const opener = document.createElement('button')
		document.body.appendChild(opener)
		opener.focus()

		const onClose = vi.fn()
		const { unmount } = render(<FileViewer file={file} onClose={onClose} />)

		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())
		fireEvent.keyDown(window, { key: 'Escape' })
		expect(onClose).toHaveBeenCalledTimes(1)

		unmount()
		expect(document.activeElement).toBe(opener)
		opener.remove()
	})

	it('locks body scroll while open and releases it on close', async () => {
		const { rerender } = render(<FileViewer file={file} onClose={() => {}} />)
		expect(document.body.style.overflow).toBe('hidden')

		rerender(<FileViewer file={null} onClose={() => {}} />)
		expect(document.body.style.overflow).toBe('')
	})
})
