// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MB } from '../constants'
import { defineScopes } from '../scopes'
import type { StoredFile } from '../types'
import type { UploadStrategy } from './types'
import { useUploader } from './useUploader'

const scopes = defineScopes({
	docs: {
		path: (id, file) => `Docs/${id}/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: MB,
		category: 'pdf',
		encrypt: true,
	},
})

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

const pdf = (name = 'doc.pdf') =>
	new File([PDF_HEADER], name, { type: 'application/pdf' })

const storedFor = (name: string): StoredFile => ({
	key: `Docs/c1/${name}`,
	url: 'memory://signed',
	scope: 'docs',
	entityId: 'c1',
	fileName: name,
	mimeType: 'application/pdf',
	size: PDF_HEADER.length,
	uploadedAt: 1,
})

describe('useUploader', () => {
	it('derives accept from the scope and validates before anything uploads', async () => {
		const onError = vi.fn()
		const { result } = renderHook(() =>
			useUploader({ scopes, scope: 'docs', entityId: 'c1', onError })
		)

		expect(result.current.accept).toBe('.pdf')

		await act(() =>
			result.current.addFiles([
				new File([new Uint8Array([1])], 'foto.png', { type: 'image/png' }),
			])
		)

		expect(result.current.files[0]).toMatchObject({ status: 'error' })
		expect(onError).toHaveBeenCalledTimes(1)
	})

	it('uploads with progress and reports the batch', async () => {
		const onUploaded = vi.fn()
		const strategy: UploadStrategy = async (file, _scope, _entity, options) => {
			options.onProgress(50)
			return storedFor(file.name)
		}

		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				onUploaded,
			})
		)

		await act(() => result.current.addFiles([pdf()]))
		expect(result.current.files[0]).toMatchObject({ status: 'idle' })

		await act(() => result.current.upload())

		expect(result.current.files[0]).toMatchObject({
			status: 'success',
			progress: 100,
		})
		expect(result.current.files[0]!.stored?.key).toBe('Docs/c1/doc.pdf')
		expect(onUploaded).toHaveBeenCalledWith([storedFor('doc.pdf')])
	})

	it('aborting an in-flight upload returns the file to idle, not error', async () => {
		const strategy: UploadStrategy = (_file, _scope, _entity, { signal }) =>
			new Promise((_resolve, reject) => {
				signal.addEventListener('abort', () => {
					const error = new Error('Carga cancelada')
					error.name = 'AbortError'
					reject(error)
				})
			})

		const onError = vi.fn()
		const { result } = renderHook(() =>
			useUploader({ scopes, scope: 'docs', entityId: 'c1', strategy, onError })
		)

		await act(() => result.current.addFiles([pdf()]))
		let pending: Promise<StoredFile[]>
		act(() => {
			pending = result.current.upload()
		})
		await waitFor(() =>
			expect(result.current.files[0]).toMatchObject({ status: 'uploading' })
		)

		act(() => result.current.abort())
		await act(() => pending)

		expect(result.current.files[0]).toMatchObject({ status: 'idle' })
		expect(onError).not.toHaveBeenCalled()
	})

	it('caps the batch at maxFiles and says so', async () => {
		const onError = vi.fn()
		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				multiple: true,
				maxFiles: 2,
				onError,
			})
		)

		await act(() =>
			result.current.addFiles([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')])
		)

		expect(result.current.files).toHaveLength(2)
		expect(onError).toHaveBeenCalledWith('Máximo 2 archivo(s)')
	})

	it("uploadOn: 'select' fires on selection; 'manual' (the default) waits", async () => {
		const calls: string[] = []
		const strategy: UploadStrategy = async file => {
			calls.push(file.name)
			return storedFor(file.name)
		}

		const manual = renderHook(() =>
			useUploader({ scopes, scope: 'docs', entityId: 'c1', strategy })
		)
		await act(() => manual.result.current.addFiles([pdf('m.pdf')]))
		expect(calls).toHaveLength(0)
		expect(manual.result.current.hasPending).toBe(true)

		const select = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				uploadOn: 'select',
			})
		)
		await act(() => select.result.current.addFiles([pdf('s.pdf')]))
		expect(calls).toEqual(['s.pdf'])
	})

	it('onUploadStart fires when the batch actually leaves, from either trigger', async () => {
		const onUploadStart = vi.fn()
		const strategy: UploadStrategy = async file => storedFor(file.name)
		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				onUploadStart,
			})
		)

		await act(() => result.current.addFiles([pdf()]))
		expect(onUploadStart).not.toHaveBeenCalled()

		await act(() => result.current.upload())
		expect(onUploadStart).toHaveBeenCalledTimes(1)
		expect(onUploadStart.mock.calls[0]![0]).toHaveLength(1)

		// An empty batch never announces a start.
		await act(() => result.current.upload())
		expect(onUploadStart).toHaveBeenCalledTimes(1)
	})

	it('retry absorbs transient failures behind backoff', async () => {
		let attempts = 0
		const strategy: UploadStrategy = async file => {
			attempts += 1
			if (attempts < 3) throw new Error('red inestable')
			return storedFor(file.name)
		}
		const onError = vi.fn()
		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				retry: { attempts: 3, backoffMs: 1 },
				onError,
			})
		)

		await act(() => result.current.addFiles([pdf()]))
		await act(() => result.current.upload())

		expect(attempts).toBe(3)
		expect(result.current.files[0]).toMatchObject({ status: 'success' })
		expect(onError).not.toHaveBeenCalled()
	})

	it('retry gives up after its attempts and surfaces the last error', async () => {
		let attempts = 0
		const strategy: UploadStrategy = async () => {
			attempts += 1
			throw new Error('sigue caída')
		}
		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				retry: { attempts: 2, backoffMs: 1 },
			})
		)

		await act(() => result.current.addFiles([pdf()]))
		await act(() => result.current.upload())

		expect(attempts).toBe(2)
		expect(result.current.files[0]).toMatchObject({
			status: 'error',
			error: 'sigue caída',
		})
	})

	it('concurrency caps how many uploads run at once', async () => {
		let inFlight = 0
		let peak = 0
		const strategy: UploadStrategy = async file => {
			inFlight += 1
			peak = Math.max(peak, inFlight)
			await new Promise(resolve => setTimeout(resolve, 5))
			inFlight -= 1
			return storedFor(file.name)
		}
		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				multiple: true,
				concurrency: 2,
			})
		)

		await act(() =>
			result.current.addFiles([
				pdf('a.pdf'),
				pdf('b.pdf'),
				pdf('c.pdf'),
				pdf('d.pdf'),
			])
		)
		await act(() => result.current.upload())

		expect(peak).toBe(2)
		expect(result.current.files.every(f => f.status === 'success')).toBe(true)
	})

	it('rename rewrites the file name before validation and storage', async () => {
		const seen: string[] = []
		const strategy: UploadStrategy = async file => {
			seen.push(file.name)
			return storedFor(file.name)
		}
		const { result } = renderHook(() =>
			useUploader({
				scopes,
				scope: 'docs',
				entityId: 'c1',
				strategy,
				uploadOn: 'select',
				rename: file => `folio-77-${file.name}`,
			})
		)

		await act(() => result.current.addFiles([pdf('acta.pdf')]))

		expect(result.current.files[0]!.file.name).toBe('folio-77-acta.pdf')
		expect(seen).toEqual(['folio-77-acta.pdf'])
	})

	it('failed uploads keep the message and clear() empties everything', async () => {
		const strategy: UploadStrategy = async () => {
			throw new Error('El servidor rechazó el archivo')
		}
		const { result } = renderHook(() =>
			useUploader({ scopes, scope: 'docs', entityId: 'c1', strategy })
		)

		await act(() => result.current.addFiles([pdf()]))
		await act(() => result.current.upload())
		expect(result.current.files[0]).toMatchObject({
			status: 'error',
			error: 'El servidor rechazó el archivo',
		})

		act(() => result.current.clear())
		expect(result.current.files).toHaveLength(0)
	})
})
