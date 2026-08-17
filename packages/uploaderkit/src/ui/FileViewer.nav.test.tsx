// @vitest-environment happy-dom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('FileViewer shortcuts', () => {
	const file = gallery[0]!

	it('D and O fire their action, but never with a modifier held', async () => {
		render(<FileViewer file={file} onClose={() => {}} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		const download = document.querySelector('a[download]') as HTMLAnchorElement
		const click = vi.spyOn(download, 'click')

		fireEvent.keyDown(window, { key: 'd' })
		expect(click).toHaveBeenCalledTimes(1)

		// The browser owns these: claiming them would download AND bookmark.
		fireEvent.keyDown(window, { key: 'd', metaKey: true })
		fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
		expect(click).toHaveBeenCalledTimes(1)
	})

	it('a modifier never navigates the gallery either', async () => {
		render(<FileViewer file={gallery[0]!} files={gallery} onClose={() => {}} />)
		await waitFor(() => expect(screen.getByText('1 / 3')).toBeTruthy())

		fireEvent.keyDown(window, { key: 'ArrowRight', metaKey: true })
		expect(screen.getByText('1 / 3')).toBeTruthy()

		fireEvent.keyDown(window, { key: 'ArrowRight' })
		await waitFor(() => expect(screen.getByText('2 / 3')).toBeTruthy())
	})
})

describe('FileViewer header actions', () => {
	const file = gallery[0]!

	it('offers download and open-in-tab for a previewable file', async () => {
		render(<FileViewer file={file} onClose={() => {}} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		const download = screen.getByLabelText('Descargar') as HTMLAnchorElement
		expect(download.getAttribute('download')).toBe('1.png')
		expect(download.getAttribute('href')).toBe(file.url)

		const openTab = screen.getByLabelText(
			'Abrir en pestaña'
		) as HTMLAnchorElement
		expect(openTab.getAttribute('target')).toBe('_blank')
	})

	// The hint strip, not the buttons: the viewer already announces Esc and
	// the arrows there, and three labelled buttons do not fit a header.
	it('announces its shortcuts in the hint strip', async () => {
		render(<FileViewer file={file} onClose={() => {}} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		expect(screen.getByText('D')).toBeTruthy()
		expect(screen.getByText('O')).toBeTruthy()
	})

	it('the keys click the actions they announce', async () => {
		render(<FileViewer file={file} onClose={() => {}} />)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())

		const clicked: string[] = []
		for (const label of ['Descargar', 'Abrir en pestaña']) {
			screen.getByLabelText(label).addEventListener('click', event => {
				event.preventDefault()
				clicked.push(label)
			})
		}

		fireEvent.keyDown(window, { key: 'd' })
		fireEvent.keyDown(window, { key: 'O' })

		expect(clicked).toEqual(['Descargar', 'Abrir en pestaña'])
	})
})

describe('FileViewer failure', () => {
	const broken: ViewableFile = {
		url: 'https://x/gone.png',
		fileName: 'gone.png',
		mimeType: 'image/png',
	}

	// A resolved url only proves the address; the object can still 404, and
	// before this the image just rendered invisible.
	it('surfaces a render failure the resolver never saw', async () => {
		render(<FileViewer file={broken} onClose={() => {}} />)
		const image = await waitFor(() => {
			const found = document.querySelector('img')
			expect(found).toBeTruthy()
			return found!
		})

		fireEvent.error(image)

		await waitFor(() =>
			expect(screen.getByText('No se pudo cargar la vista previa')).toBeTruthy()
		)
		// Never a dead end: retry, and the bytes may still be reachable.
		// Scoped to the panel's own button row — "Descargar" also names the
		// header action and its hint.
		const actions = screen.getByText('Reintentar').parentElement!
		expect(within(actions).getByText('Descargar')).toBeTruthy()
	})

	it('hands the failure to a custom panel with its retry', async () => {
		render(
			<FileViewer
				file={broken}
				onClose={() => {}}
				renderError={({ file, retry }) => (
					<button type='button' onClick={retry}>
						roto: {file.fileName}
					</button>
				)}
			/>
		)
		const image = await waitFor(() => {
			const found = document.querySelector('img')
			expect(found).toBeTruthy()
			return found!
		})

		fireEvent.error(image)

		const custom = await waitFor(() => screen.getByText(/roto: gone.png/))
		expect(screen.queryByText('No se pudo cargar la vista previa')).toBeNull()

		// The retry it was handed puts the preview back in flight.
		fireEvent.click(custom)
		await waitFor(() => expect(document.querySelector('img')).toBeTruthy())
	})
})

describe('FileViewer layout', () => {
	const pdf: ViewableFile = {
		url: 'https://x/roto.pdf',
		fileName: 'roto.pdf',
		mimeType: 'application/pdf',
	}

	// `items-stretch` exists for the iframe. Applied by file type alone it also
	// caught the error panel, which then hugged the top edge instead of the
	// middle — the one place a message has to be found.
	it('does not stretch the error panel of a failed pdf', async () => {
		render(
			<FileViewer
				file={pdf}
				onClose={() => {}}
				resolveUrl={async () => {
					throw new Error('expired')
				}}
			/>
		)

		await waitFor(() =>
			expect(screen.getByText('No se pudo cargar la vista previa')).toBeTruthy()
		)

		const content = screen
			.getByText('No se pudo cargar la vista previa')
			.closest('[tabindex="-1"]')!
		expect(content.className).toContain('items-center')
		expect(content.className).not.toContain('items-stretch')
	})

	it('stretches the container while the pdf itself is on screen', async () => {
		render(<FileViewer file={pdf} onClose={() => {}} />)

		const frame = await waitFor(() => {
			const found = document.querySelector('iframe')
			expect(found).toBeTruthy()
			return found!
		})
		expect(frame.parentElement!.className).toContain('items-stretch')
	})
})
