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

describe('FileViewer pdf embedding', () => {
	const pdf: ViewableFile = {
		url: 'https://x/a.pdf',
		fileName: 'a.pdf',
		mimeType: 'application/pdf',
	}

	const withPdfViewer = (enabled: boolean | undefined) =>
		Object.defineProperty(navigator, 'pdfViewerEnabled', {
			value: enabled,
			configurable: true,
		})

	afterEach(() => withPdfViewer(undefined))

	it('embeds a pdf where the browser renders one', async () => {
		withPdfViewer(true)
		render(<FileViewer file={pdf} onClose={() => {}} />)

		await waitFor(() => expect(document.querySelector('iframe')).toBeTruthy())
	})

	// Android Chrome answers false and downloads instead of embedding: an
	// iframe there is a blank rectangle with no way out of it.
	it('offers the download card where it does not', async () => {
		withPdfViewer(false)
		render(<FileViewer file={pdf} onClose={() => {}} />)

		await waitFor(() =>
			expect(screen.getByText('This format has no preview')).toBeTruthy()
		)
		expect(document.querySelector('iframe')).toBeNull()
	})
})

describe('FileViewer object urls', () => {
	// createBlobUrlResolver hands back a `blob:` whose bytes stay alive until
	// something revokes it, and the JSDoc promised the viewer would.
	// Spy, not stubGlobal: replacing the whole `URL` global drops the class
	// itself, and happy-dom needs it while rendering.
	const spyRevoke = () =>
		vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

	afterEach(() => vi.restoreAllMocks())

	it('revokes the blob it resolved when the viewer closes', async () => {
		const revoke = spyRevoke()
		const { rerender } = render(
			<FileViewer
				file={file}
				onClose={() => {}}
				resolveUrl={async () => 'blob:one'}
			/>
		)
		await waitFor(() =>
			expect(document.querySelector('img')?.getAttribute('src')).toBe(
				'blob:one'
			)
		)

		rerender(<FileViewer file={null} onClose={() => {}} />)
		await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:one'))
	})

	it('frees the previous blob when it moves to another file', async () => {
		const revoke = spyRevoke()
		const second = { ...file, url: 'https://x/b.png' }
		const resolveUrl = async (f: ViewableFile) =>
			f.url.endsWith('a.png') ? 'blob:one' : 'blob:two'

		const { rerender } = render(
			<FileViewer file={file} onClose={() => {}} resolveUrl={resolveUrl} />
		)
		await waitFor(() =>
			expect(document.querySelector('img')?.getAttribute('src')).toBe(
				'blob:one'
			)
		)

		rerender(
			<FileViewer file={second} onClose={() => {}} resolveUrl={resolveUrl} />
		)
		await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:one'))
	})

	it('never revokes a signed url — that one belongs to the server', async () => {
		const revoke = spyRevoke()
		const { rerender } = render(
			<FileViewer
				file={file}
				onClose={() => {}}
				resolveUrl={async () => 'https://bucket/a.png?sig=1'}
			/>
		)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		rerender(<FileViewer file={null} onClose={() => {}} />)
		expect(revoke).not.toHaveBeenCalled()
	})
})
