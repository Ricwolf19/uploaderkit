// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EN_LABELS } from '../labels'
import { ConfirmDialog } from './ConfirmDialog'

afterEach(cleanup)

const renderDialog = (
	props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}
) => {
	const onConfirm = vi.fn()
	const onCancel = vi.fn()
	render(
		<ConfirmDialog
			open
			title='Quitar archivo'
			message='¿Seguro?'
			onConfirm={onConfirm}
			onCancel={onCancel}
			{...props}
		/>
	)
	return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
	it('renders nothing while closed', () => {
		render(
			<ConfirmDialog
				open={false}
				title='t'
				message='m'
				onConfirm={() => {}}
				onCancel={() => {}}
			/>
		)
		expect(screen.queryByRole('alertdialog')).toBeNull()
	})

	it('confirm and cancel reach their callbacks', () => {
		const { onConfirm, onCancel } = renderDialog()

		fireEvent.click(screen.getByText('Confirmar'))
		expect(onConfirm).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByText('Cancelar'))
		expect(onCancel).toHaveBeenCalledTimes(1)
	})

	it('escape and the backdrop cancel, never confirm', () => {
		const { onConfirm, onCancel } = renderDialog()

		fireEvent.keyDown(window, { key: 'Escape' })
		expect(onCancel).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByRole('alertdialog').parentElement!)
		expect(onCancel).toHaveBeenCalledTimes(2)
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('focus lands on cancel so a stray Enter is harmless', () => {
		renderDialog()
		expect(document.activeElement?.textContent).toBe('Cancelar')
	})

	it('speaks the injected language', () => {
		renderDialog({ labels: EN_LABELS })
		expect(screen.getByText('Confirm')).toBeTruthy()
		expect(screen.getByText('Cancel')).toBeTruthy()
	})
})
