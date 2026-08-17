import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBytesResolver, viewUrlFileName } from './viewResolver'

afterEach(() => vi.unstubAllGlobals())

describe('viewUrlFileName', () => {
	it('recovers the name from a /view url — the key travels percent-encoded', () => {
		expect(
			viewUrlFileName(
				'/storage/po-payment-receipt/abc/view?key=PurchaseOrders%2Fabc%2Fpayments%2Ffactura.pdf'
			)
		).toBe('factura.pdf')
	})

	it('falls back to the last path segment for direct links', () => {
		expect(
			viewUrlFileName('https://cdn.example.com/Customers/c1/logo.png')
		).toBe('logo.png')
	})

	it('answers undefined when nothing resembles a name', () => {
		expect(viewUrlFileName('')).toBeUndefined()
	})
})

describe('createBytesResolver', () => {
	const bytes = new Uint8Array([1, 2, 3])

	const stub = (assert: (url: string, init?: RequestInit) => void) =>
		vi.fn(async (url: string, init?: RequestInit) => {
			assert(url, init)
			return {
				ok: true,
				arrayBuffer: async () => bytes.buffer,
			} as unknown as Response
		})

	it('prefixes an app-relative url and sends the headers', async () => {
		const fetchSpy = stub((url, init) => {
			expect(url).toBe('https://api.example.com/storage/s/1/view?key=k')
			expect(init?.headers).toEqual({ Authorization: 'Bearer t' })
		})
		vi.stubGlobal('fetch', fetchSpy)

		const resolve = createBytesResolver({
			baseUrl: 'https://api.example.com/',
			headers: () => ({ Authorization: 'Bearer t' }),
		})
		expect(await resolve('/storage/s/1/view?key=k')).toEqual(bytes)
		expect(fetchSpy).toHaveBeenCalledOnce()
	})

	// A public object is already reachable; sending the JWT to a third party
	// would leak it.
	it('leaves an absolute url alone and sends no headers', async () => {
		const fetchSpy = stub((url, init) => {
			expect(url).toBe('https://cdn.example.com/a.pdf')
			expect(init).toBeUndefined()
		})
		vi.stubGlobal('fetch', fetchSpy)

		const resolve = createBytesResolver({
			baseUrl: 'https://api.example.com',
			headers: () => ({ Authorization: 'Bearer t' }),
		})
		expect(await resolve('https://cdn.example.com/a.pdf')).toEqual(bytes)
	})

	it('throws when the read fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false }) as unknown as Response)
		)

		const resolve = createBytesResolver({ baseUrl: 'https://api.example.com' })
		await expect(resolve('/storage/s/1/view')).rejects.toThrow(
			'No se pudo cargar el archivo'
		)
	})
})
