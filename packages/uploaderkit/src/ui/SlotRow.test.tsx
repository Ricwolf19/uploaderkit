// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SlotState } from '../react'
import { SlotRow } from './SlotRow'

// This package runs without `globals`, so Testing Library never registers
// its own teardown and renders would pile up in one document.
afterEach(cleanup)

const definition = {
	id: 'letterhead',
	label: 'Papel membretado',
	extensions: ['pdf'],
	hint: 'Solo PDF',
}

const pdf = () => new File(['x'], 'letterhead.pdf', { type: 'application/pdf' })

const pending = (over: Record<string, unknown> = {}) => ({
	id: '1',
	file: pdf(),
	status: 'idle' as const,
	progress: 0,
	...over,
})

const renderRow = (slot: Partial<SlotState> = {}) => {
	const handlers = {
		onPick: vi.fn(),
		onRemove: vi.fn(),
		onAbort: vi.fn(),
		onView: vi.fn(),
	}
	const utils = render(
		<SlotRow slot={{ definition, ...slot } as SlotState} {...handlers} />
	)
	return { ...utils, ...handlers }
}

describe('SlotRow', () => {
	/**
	 * The regression: under `uploadOn: 'submit'` a picked file rests at `idle`
	 * with no `filled`, and the row used to render the untouched hint — visually
	 * identical to an empty slot.
	 */
	it('names a staged file instead of repeating the hint', () => {
		renderRow({ pending: pending() })

		expect(screen.getByText(/letterhead\.pdf/)).toBeTruthy()
		expect(screen.getByText(/Listo para subir/)).toBeTruthy()
		expect(screen.queryByText('Solo PDF')).toBeNull()
	})

	it('shows the local preview when the pick is an image', () => {
		const { container } = renderRow({
			pending: pending({ preview: 'blob:thumb' }),
		})

		expect(container.querySelector('img')?.getAttribute('src')).toBe(
			'blob:thumb'
		)
	})

	it('lets a staged pick be undone and replaced', () => {
		const { onRemove } = renderRow({ pending: pending() })

		expect(screen.getByText('Reemplazar')).toBeTruthy()
		fireEvent.click(screen.getByText('Quitar'))
		expect(onRemove).toHaveBeenCalled()
	})

	it('leaves an empty slot exactly as it was', () => {
		renderRow()

		expect(screen.getByText('Solo PDF')).toBeTruthy()
		expect(screen.getByText('Subir')).toBeTruthy()
		expect(screen.queryByText('Quitar')).toBeNull()
	})

	it('leaves a persisted slot exactly as it was', () => {
		renderRow({
			filled: {
				slot: 'letterhead',
				stored: { key: 'k', fileName: 'membrete.pdf', url: 'u', size: 1 },
			} as SlotState['filled'],
		})

		expect(screen.getByText('membrete.pdf')).toBeTruthy()
		expect(screen.getByText('Ver')).toBeTruthy()
		expect(screen.getByText('Reemplazar')).toBeTruthy()
		expect(screen.getByText('Quitar')).toBeTruthy()
	})

	it('offers only cancel while the upload is in flight', () => {
		renderRow({ pending: pending({ status: 'uploading', progress: 40 }) })

		expect(screen.getByText(/letterhead\.pdf/)).toBeTruthy()
		expect(screen.getByText('Cancelar')).toBeTruthy()
		expect(screen.queryByText('Quitar')).toBeNull()
		expect(screen.queryByText('Reemplazar')).toBeNull()
	})

	it('shows the failure instead of the name when the pick was rejected', () => {
		renderRow({ pending: pending({ status: 'error', error: 'Muy pesado' }) })

		expect(screen.getByText('Muy pesado')).toBeTruthy()
		expect(screen.queryByText(/letterhead\.pdf/)).toBeNull()
	})

	it('takes an overridden label', () => {
		render(
			<SlotRow
				slot={{ definition, pending: pending() } as SlotState}
				onPick={vi.fn()}
				onRemove={vi.fn()}
				onAbort={vi.fn()}
				onView={vi.fn()}
				labels={{ staged: 'Pendiente de envío' }}
			/>
		)

		expect(screen.getByText(/Pendiente de envío/)).toBeTruthy()
	})
})
