// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Dropzone } from './Dropzone'

const renderZone = (props: Partial<Parameters<typeof Dropzone>[0]> = {}) => {
	const onFiles = vi.fn()
	const { container } = render(
		<Dropzone accept='.pdf' onFiles={onFiles} {...props}>
			<span>zone</span>
		</Dropzone>
	)
	return {
		onFiles,
		zone: container.firstElementChild as HTMLElement,
		input: container.querySelector('input')!,
	}
}

describe('Dropzone', () => {
	it('opens the picker once per click', () => {
		const { zone, input } = renderZone()
		const click = vi.spyOn(input, 'click')

		fireEvent.click(zone)

		// The programmatic click bubbles back to the wrapper; without the guard
		// its handler re-enters and blows the stack.
		expect(click).toHaveBeenCalledTimes(1)
	})

	it('stays inert while disabled', () => {
		const { zone, input, onFiles } = renderZone({ disabled: true })
		const click = vi.spyOn(input, 'click')

		fireEvent.click(zone)
		fireEvent.drop(zone, { dataTransfer: { files: [new File([''], 'a.pdf')] } })

		expect(click).not.toHaveBeenCalled()
		expect(onFiles).not.toHaveBeenCalled()
	})

	it('the shortcut opens the picker, but never from a text field', () => {
		const { input } = renderZone({ shortcut: 'mod+u' })
		const click = vi.spyOn(input, 'click')

		fireEvent.keyDown(window, { key: 'u', metaKey: true })
		expect(click).toHaveBeenCalledTimes(1)

		const field = document.createElement('input')
		document.body.appendChild(field)
		field.focus()
		fireEvent.keyDown(field, { key: 'u', metaKey: true })
		expect(click).toHaveBeenCalledTimes(1)
		field.remove()
	})

	it('keeps the drag state while the pointer crosses a child', () => {
		const { zone } = renderZone()
		const child = zone.querySelector('p') ?? zone.firstElementChild!

		fireEvent.dragEnter(zone)
		expect(zone.className).toContain('scale-[1.02]')

		// Entering a child fires dragleave on the wrapper; a boolean would
		// drop the state here and the zone would flicker mid-drag.
		fireEvent.dragEnter(child)
		fireEvent.dragLeave(zone)
		expect(zone.className).toContain('scale-[1.02]')

		// Leaving the zone for real clears it.
		fireEvent.dragLeave(child)
		expect(zone.className).not.toContain('scale-[1.02]')
	})

	it('emits the dropped files', () => {
		const { zone, onFiles } = renderZone({ multiple: true })
		const files = [new File([''], 'a.pdf'), new File([''], 'b.pdf')]

		fireEvent.drop(zone, { dataTransfer: { files } })

		expect(onFiles).toHaveBeenCalledWith(files)
	})
})
