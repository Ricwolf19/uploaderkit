// @vitest-environment happy-dom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MB } from '../index'
import { defineScopes } from '../scopes'
import type { StoredFile } from '../types'
import { GalleryUploader } from './GalleryUploader'

afterEach(cleanup)

const scopes = defineScopes({
	gallery: {
		maxFiles: 12,
		path: (id, file) => `Gallery/${id}/${file.name}`,
		visibility: 'public',
		accept: ['png'],
		maxBytes: MB,
		category: 'image',
	},
})

const png = (name: string) =>
	new File(
		[new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
		name,
		{
			type: 'image/png',
		}
	)

const storedOf = (name: string): StoredFile => ({
	key: `Gallery/g1/${name}`,
	url: `https://cdn/${name}`,
	scope: 'gallery',
	entityId: 'g1',
	fileName: name,
	mimeType: 'image/png',
	size: 8,
	uploadedAt: 1,
})

const tiles = () => Array.from(document.querySelectorAll('img'))

describe('GalleryUploader', () => {
	/**
	 * The dedupe this grid needs: the hook keeps a confirmed file in its own
	 * state AND the caller echoes it back through `stored`. Rendering both
	 * lists blindly draws the same photo twice.
	 */
	it('draws a confirmed file once after the caller echoes it back', async () => {
		let confirmed: StoredFile[] = []
		const { rerender } = render(
			<GalleryUploader
				scopes={scopes}
				scope='gallery'
				entityId='g1'
				strategy={async file => storedOf(file.name)}
				stored={confirmed}
				onUploaded={files => {
					confirmed = files
				}}
			/>
		)

		const input = document.querySelector('input')!
		fireEvent.change(input, { target: { files: [png('a.png')] } })
		await waitFor(() => expect(confirmed).toHaveLength(1))

		// The caller persisted it and passes it back down.
		rerender(
			<GalleryUploader
				scopes={scopes}
				scope='gallery'
				entityId='g1'
				strategy={async file => storedOf(file.name)}
				stored={confirmed}
				onUploaded={() => {}}
			/>
		)

		await waitFor(() => expect(tiles()).toHaveLength(1))
		expect(tiles()[0]!.getAttribute('src')).toBe('https://cdn/a.png')
	})

	it('renders a tile per persisted file plus the add zone', () => {
		render(
			<GalleryUploader
				scopes={scopes}
				scope='gallery'
				entityId='g1'
				stored={[storedOf('a.png'), storedOf('b.png')]}
			/>
		)

		expect(tiles()).toHaveLength(2)
		// The add tile is the dropzone, not an img.
		expect(screen.getByText('+')).toBeTruthy()
	})

	it('forgets a persisted tile through the caller', () => {
		const onRemoveStored = vi.fn()
		render(
			<GalleryUploader
				scopes={scopes}
				scope='gallery'
				entityId='g1'
				stored={[storedOf('a.png')]}
				onRemoveStored={onRemoveStored}
			/>
		)

		fireEvent.click(screen.getByText(/remove/i))

		expect(onRemoveStored).toHaveBeenCalledWith(storedOf('a.png'))
	})

	it('offers no removal while disabled', () => {
		render(
			<GalleryUploader
				scopes={scopes}
				scope='gallery'
				entityId='g1'
				stored={[storedOf('a.png')]}
				onRemoveStored={vi.fn()}
				disabled
			/>
		)

		expect(screen.queryByText(/remove/i)).toBeNull()
	})
})
