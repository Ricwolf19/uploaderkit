// @vitest-environment happy-dom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MB } from '../index'
import type { SlotDefinition } from '../react'
import { defineScopes } from '../scopes'
import type { StoredFile } from '../types'
import type { UploaderController } from './controller'
import { SlottedUploader } from './SlottedUploader'
import { Uploader } from './Uploader'

afterEach(cleanup)

const scopes = defineScopes({
	docs: {
		path: (entityId, file) => `Docs/${entityId}/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 5 * MB,
	},
})

const stored = (name: string): StoredFile => ({
	key: `Docs/e1/${name}`,
	url: `/view?key=Docs/e1/${name}`,
	scope: 'docs',
	entityId: 'e1',
	fileName: name,
	mimeType: 'application/pdf',
	size: 3,
	uploadedAt: 0,
})

// A pdf whose magic number matches, or validation rejects it before the
// strategy is ever reached.
const pdf = (name: string) =>
	new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
		type: 'application/pdf',
	})

const renderWithController = () => {
	const controllerRef = createRef<UploaderController | null>() as {
		current: UploaderController | null
	}
	const strategy = vi.fn(async (file: File) => stored(file.name))
	const onUploaded = vi.fn()

	const { container, queryByText } = render(
		<Uploader
			scopes={scopes}
			scope='docs'
			entityId='e1'
			strategy={strategy}
			uploadOn='submit'
			controllerRef={controllerRef}
			onUploaded={onUploaded}
		/>
	)

	return {
		controllerRef,
		strategy,
		onUploaded,
		queryByText,
		input: container.querySelector('input')!,
	}
}

describe('Uploader controllerRef', () => {
	it('holds the batch until the form asks for it', async () => {
		const { controllerRef, strategy, onUploaded, input } =
			renderWithController()

		await act(async () => {
			fireEvent.change(input, { target: { files: [pdf('acta.pdf')] } })
		})

		// `uploadOn: 'manual'` — picking a file must not send it.
		expect(strategy).not.toHaveBeenCalled()
		await waitFor(() => expect(controllerRef.current?.hasPending).toBe(true))

		await act(async () => {
			await controllerRef.current?.upload()
		})

		expect(strategy).toHaveBeenCalledOnce()
		expect(onUploaded).toHaveBeenCalledWith([
			expect.objectContaining({ fileName: 'acta.pdf' }),
		])
	})

	// Two ways to send the same batch is one too many, and the form's is the
	// one that knows whether the rest of the fields are valid.
	it('renders no upload button under submit mode', async () => {
		const { queryByText, input } = renderWithController()

		await act(async () => {
			fireEvent.change(input, { target: { files: [pdf('acta.pdf')] } })
		})

		expect(queryByText('Upload files')).toBeNull()
	})

	// A form that defers the send has no other way to know it has unsent work.
	it('reports staged work so the form can enable its save button', async () => {
		const onPendingChange = vi.fn()
		const { container } = render(
			<Uploader
				scopes={scopes}
				scope='docs'
				entityId='e1'
				strategy={async file => stored(file.name)}
				uploadOn='submit'
				onPendingChange={onPendingChange}
			/>
		)

		expect(onPendingChange).toHaveBeenLastCalledWith(false)

		await act(async () => {
			fireEvent.change(container.querySelector('input')!, {
				target: { files: [pdf('acta.pdf')] },
			})
		})

		await waitFor(() => expect(onPendingChange).toHaveBeenLastCalledWith(true))
	})

	// Option 3 of the contract: the zone owns the send.
	it('keeps its own upload button under manual mode', async () => {
		const { container, queryByText } = render(
			<Uploader
				scopes={scopes}
				scope='docs'
				entityId='e1'
				strategy={async file => stored(file.name)}
				uploadOn='manual'
			/>
		)

		await act(async () => {
			fireEvent.change(container.querySelector('input')!, {
				target: { files: [pdf('acta.pdf')] },
			})
		})

		await waitFor(() => expect(queryByText('Upload files')).not.toBeNull())
	})

	it('clears the ref on unmount', () => {
		const controllerRef: { current: UploaderController | null } = {
			current: null,
		}
		const { unmount } = render(
			<Uploader
				scopes={scopes}
				scope='docs'
				entityId='e1'
				uploadOn='submit'
				controllerRef={controllerRef}
			/>
		)

		expect(controllerRef.current).not.toBeNull()
		unmount()
		expect(controllerRef.current).toBeNull()
	})
})

const slottedScopes = defineScopes({
	identity: {
		maxFiles: 4,
		path: (entityId, file) => `Co/${entityId}/identity/${file.name}`,
		visibility: 'public',
		accept: ['pdf'],
		maxBytes: 5 * MB,
	},
})

const historyScopes = defineScopes({
	identity: {
		maxFiles: 4,
		keepOnRemove: true,
		path: (entityId, file) => `Co/${entityId}/identity/${file.name}`,
		visibility: 'public',
		accept: ['pdf'],
		maxBytes: 5 * MB,
	},
})

describe('SlottedUploader removal', () => {
	const slots: SlotDefinition[] = [
		{ id: 'doc', label: 'Documento', extensions: ['pdf'] },
	]
	const filled = {
		slot: 'doc',
		stored: {
			key: 'Co/c1/identity/doc.pdf',
			url: 'https://x/doc.pdf',
			scope: 'identity',
			entityId: 'c1',
			fileName: 'doc.pdf',
			mimeType: 'application/pdf',
			size: 3,
			uploadedAt: 1,
		},
	}

	it('runs the remove strategy when a filled slot is forgotten', async () => {
		const removeStrategy = vi.fn(async () => true)
		const onChange = vi.fn()
		render(
			<SlottedUploader
				scopes={slottedScopes}
				scope='identity'
				entityId='c1'
				slots={slots}
				value={[filled]}
				onChange={onChange}
				removeStrategy={removeStrategy}
			/>
		)

		fireEvent.click(screen.getByText('Remove'))
		await waitFor(() =>
			expect(removeStrategy).toHaveBeenCalledWith(
				filled.stored,
				'identity',
				'c1'
			)
		)
		expect(onChange).toHaveBeenCalledWith([])
	})

	it('skips storage deletion for a keepOnRemove scope', async () => {
		const removeStrategy = vi.fn(async () => true)
		const onChange = vi.fn()
		render(
			<SlottedUploader
				scopes={historyScopes}
				scope='identity'
				entityId='c1'
				slots={slots}
				value={[filled]}
				onChange={onChange}
				removeStrategy={removeStrategy}
			/>
		)

		fireEvent.click(screen.getByText('Remove'))
		await waitFor(() => expect(onChange).toHaveBeenCalledWith([]))
		expect(removeStrategy).not.toHaveBeenCalled()
	})
})

describe('Uploader filesPosition', () => {
	const renderAt = (filesPosition?: 'above' | 'below') =>
		render(
			<Uploader
				scopes={scopes}
				scope='docs'
				entityId='e1'
				strategy={async file => stored(file.name)}
				stored={[stored('contrato.pdf')]}
				filesPosition={filesPosition}
			/>
		)

	// The drop target must not slide down the page as files pile up above it.
	const dropzoneIsAfterList = () => {
		// The zone by its input rather than its role — the stored file's own
		// view/remove controls are buttons too.
		const zone = document
			.querySelector('input[type="file"]')
			?.closest('[role="button"]') as HTMLElement
		const item = screen.getByText('contrato.pdf')
		return !!(
			zone.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING
		)
	}

	it('lists above the dropzone by default — the shape every consumer already has', () => {
		renderAt()
		expect(dropzoneIsAfterList()).toBe(true)
	})

	it("'below' anchors the dropzone and pushes the list under it", () => {
		renderAt('below')
		expect(dropzoneIsAfterList()).toBe(false)
	})
})

describe('Uploader renderFiles', () => {
	it('replaces the default rows and still reports the state behind them', () => {
		render(
			<Uploader
				scopes={scopes}
				scope='docs'
				entityId='e1'
				strategy={async file => stored(file.name)}
				stored={[stored('contrato.pdf')]}
				renderFiles={slot => (
					<p>
						{slot.stored.length} archivo(s) · vacío: {String(slot.isEmpty)}
					</p>
				)}
			/>
		)

		expect(screen.getByText('1 archivo(s) · vacío: false')).toBeTruthy()
		// The standard row is gone — the slot replaced it, not wrapped it.
		expect(screen.queryByText('contrato.pdf')).toBeNull()
	})
})
