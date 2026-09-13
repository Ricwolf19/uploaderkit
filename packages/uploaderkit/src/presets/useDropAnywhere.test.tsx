// @vitest-environment happy-dom
import { act, render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDropAnywhere } from './useDropAnywhere'

const fileDrag = (type: string, files: File[] = []) => {
	const event = new Event(type, { bubbles: true, cancelable: true })
	Object.defineProperty(event, 'dataTransfer', {
		value: { types: ['Files'], files },
	})
	return event
}

describe('useDropAnywhere', () => {
	it('shows the drag across nested enter/leave pairs and delivers a drop once', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() => useDropAnywhere({ onFiles }))

		act(() => {
			window.dispatchEvent(fileDrag('dragenter'))
			window.dispatchEvent(fileDrag('dragenter')) // a child boundary
			window.dispatchEvent(fileDrag('dragleave'))
		})
		expect(result.current.dragging).toBe(true)

		const file = new File(['x'], 'quote.pdf', { type: 'application/pdf' })
		act(() => {
			window.dispatchEvent(fileDrag('drop', [file]))
		})
		expect(result.current.dragging).toBe(false)
		expect(onFiles).toHaveBeenCalledTimes(1)
		expect(onFiles).toHaveBeenCalledWith([file])
	})

	it('filters by accept and reports the rest', () => {
		const onFiles = vi.fn()
		const onRejected = vi.fn()
		renderHook(() =>
			useDropAnywhere({ onFiles, onRejected, accept: '.pdf,image/*' })
		)
		const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
		const png = new File(['x'], 'b.png', { type: 'image/png' })
		const doc = new File(['x'], 'c.docx', { type: 'application/msword' })
		act(() => {
			window.dispatchEvent(fileDrag('drop', [pdf, png, doc]))
		})
		expect(onFiles).toHaveBeenCalledWith([pdf, png])
		expect(onRejected).toHaveBeenCalledWith([doc])
	})

	it('is inert while disabled', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			useDropAnywhere({ onFiles, enabled: false })
		)
		act(() => {
			window.dispatchEvent(fileDrag('dragenter'))
			window.dispatchEvent(fileDrag('drop', [new File(['x'], 'a.txt')]))
		})
		expect(result.current.dragging).toBe(false)
		expect(onFiles).not.toHaveBeenCalled()
	})
})

/**
 * Table-driven: `accept` is the one pure decision in the hook, and every row
 * is a real token shape a scope produces. A wrong answer here drops a valid
 * file with no error anywhere — the failure nobody reports.
 */
describe('useDropAnywhere — accept matching', () => {
	const cases: {
		accept: string
		file: [name: string, type: string]
		expected: 'accepted' | 'rejected'
	}[] = [
		{
			accept: '.pdf',
			file: ['acta.pdf', 'application/pdf'],
			expected: 'accepted',
		},
		{ accept: '.pdf', file: ['foto.png', 'image/png'], expected: 'rejected' },
		// The picker lower-cases nothing; a camera roll is full of .JPG.
		{ accept: '.jpg', file: ['FOTO.JPG', 'image/jpeg'], expected: 'accepted' },
		{
			accept: 'image/*',
			file: ['foto.webp', 'image/webp'],
			expected: 'accepted',
		},
		{
			accept: 'image/*',
			file: ['acta.pdf', 'application/pdf'],
			expected: 'rejected',
		},
		{
			accept: 'application/pdf',
			file: ['acta.pdf', 'application/pdf'],
			expected: 'accepted',
		},
		// Windows and some Linux desktops hand over an empty type; the
		// extension is all there is to judge by.
		{ accept: '.pdf', file: ['acta.pdf', ''], expected: 'accepted' },
		{ accept: 'image/*', file: ['foto.png', ''], expected: 'rejected' },
		{
			accept: '.pdf,image/*',
			file: ['foto.png', 'image/png'],
			expected: 'accepted',
		},
	]

	it.each(cases)(
		'accept "$accept" $expected $file.0',
		({ accept, file: [name, type], expected }) => {
			const onFiles = vi.fn()
			const onRejected = vi.fn()
			const { result } = renderHook(() =>
				useDropAnywhere({ onFiles, onRejected, accept })
			)
			expect(result.current.dragging).toBe(false)

			const dropped = new File(['x'], name, { type })
			act(() => {
				window.dispatchEvent(fileDrag('drop', [dropped]))
			})

			const taken = expected === 'accepted' ? onFiles : onRejected
			const skipped = expected === 'accepted' ? onRejected : onFiles
			expect(taken).toHaveBeenCalledWith([dropped])
			expect(skipped).not.toHaveBeenCalled()
		}
	)
})

/**
 * The counter only helps if it survives a render. A consumer passing an
 * inline `onFiles` — the normal thing to write — used to re-run the effect on
 * every render, and `depth` lives inside it: reset mid-drag, the first child
 * boundary turned the overlay off again.
 */
describe('useDropAnywhere — a re-render mid-drag', () => {
	const Host = ({ report }: { report: (dragging: boolean) => void }) => {
		// No useCallback anywhere: a fresh identity on every render.
		const { dragging } = useDropAnywhere({ onFiles: files => void files })
		report(dragging)
		return null
	}

	it('holds the drag across a nested boundary with an inline callback', () => {
		const seen: boolean[] = []
		render(<Host report={value => seen.push(value)} />)

		// Into the window, into a child (depth 2), out of the child.
		act(() => window.dispatchEvent(fileDrag('dragenter')))
		act(() => window.dispatchEvent(fileDrag('dragenter')))
		act(() => window.dispatchEvent(fileDrag('dragleave')))

		expect(seen.at(-1)).toBe(true)

		// And it still ends when the drag really leaves.
		act(() => window.dispatchEvent(fileDrag('dragleave')))
		expect(seen.at(-1)).toBe(false)
	})

	it('delivers to the LATEST callback, not the one from mount', () => {
		const first = vi.fn()
		const second = vi.fn()
		const Delivering = ({ onFiles }: { onFiles: (f: File[]) => void }) => {
			useDropAnywhere({ onFiles })
			return null
		}

		const { rerender } = render(<Delivering onFiles={first} />)
		rerender(<Delivering onFiles={second} />)

		const dropped = new File(['x'], 'a.png', { type: 'image/png' })
		act(() => window.dispatchEvent(fileDrag('drop', [dropped])))

		expect(second).toHaveBeenCalledWith([dropped])
		expect(first).not.toHaveBeenCalled()
	})
})
