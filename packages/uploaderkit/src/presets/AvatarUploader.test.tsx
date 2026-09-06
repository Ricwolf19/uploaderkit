// @vitest-environment happy-dom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineScopes } from '../defineScopes'
import { MB } from '../index'
import type { StoredFile } from '../types'
import { AvatarUploader, type AvatarUploaderProps } from './AvatarUploader'

afterEach(cleanup)

const scopes = defineScopes({
	avatar: {
		path: id => `Users/${id}/avatar`,
		visibility: 'public',
		accept: ['png'],
		maxBytes: MB,
		category: 'image',
	},
})

// A png whose magic number matches, or validation rejects it before the
// strategy is ever reached.
const png = (name = 'foto.png') =>
	new File(
		[new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
		name,
		{
			type: 'image/png',
		}
	)

const stored = (): StoredFile => ({
	key: 'Users/u1/avatar',
	url: 'https://cdn/avatar.png',
	scope: 'avatar',
	entityId: 'u1',
	fileName: 'foto.png',
	mimeType: 'image/png',
	size: 8,
	uploadedAt: 1,
})

/** Never settles, so the component stays in its uploading state. */
const hangingStrategy = () => new Promise<StoredFile>(() => {})

type AvatarProps = AvatarUploaderProps<typeof scopes.scopes>

const renderAvatar = (props: Partial<AvatarProps> = {}) => {
	const onUploaded = vi.fn()
	render(
		<AvatarUploader
			scopes={scopes}
			scope='avatar'
			entityId='u1'
			strategy={async () => stored()}
			onUploaded={onUploaded}
			{...props}
		/>
	)
	const button = screen.getByRole('button', { name: /change/i })
	return { onUploaded, button, input: document.querySelector('input')! }
}

describe('AvatarUploader', () => {
	it('hands the confirmed file back to the caller', async () => {
		const { onUploaded, input } = renderAvatar()

		fireEvent.change(input, { target: { files: [png()] } })

		await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(stored()))
	})

	/**
	 * The regression this preset exists to prevent: while bytes are travelling
	 * the picture must accept neither a click nor a drop, or a second upload
	 * races the first and the ring lies about which one it tracks.
	 */
	it('accepts neither a click nor a drop while uploading', async () => {
		const { button, input } = renderAvatar({ strategy: hangingStrategy })
		const click = vi.spyOn(input, 'click')

		fireEvent.change(input, { target: { files: [png('one.png')] } })
		await waitFor(() =>
			expect((button as HTMLButtonElement).disabled).toBe(true)
		)

		fireEvent.click(button)
		fireEvent.drop(button, { dataTransfer: { files: [png('two.png')] } })

		expect(click).not.toHaveBeenCalled()
		// Still the first file's progress, not a second one's.
		expect(screen.getByText(/%$/)).toBeTruthy()
	})

	it('stays inert when disabled', () => {
		const { button, input } = renderAvatar({ disabled: true })
		const click = vi.spyOn(input, 'click')

		fireEvent.click(button)

		expect((button as HTMLButtonElement).disabled).toBe(true)
		expect(click).not.toHaveBeenCalled()
	})

	it('offers removal only once there is an image and nothing in flight', () => {
		const onRemove = vi.fn()
		cleanup()
		renderAvatar({ onRemove })
		expect(screen.queryByText(/remove/i)).toBeNull()

		cleanup()
		renderAvatar({ onRemove, src: 'https://cdn/avatar.png' })
		fireEvent.click(screen.getByText(/remove/i))
		expect(onRemove).toHaveBeenCalledTimes(1)
	})

	it('shows the rejection instead of uploading a file the scope refuses', async () => {
		const strategy = vi.fn(async () => stored())
		const { input } = renderAvatar({ strategy })

		fireEvent.change(input, {
			target: {
				files: [new File(['x'], 'acta.pdf', { type: 'application/pdf' })],
			},
		})

		await waitFor(() => expect(strategy).not.toHaveBeenCalled())
	})
})
