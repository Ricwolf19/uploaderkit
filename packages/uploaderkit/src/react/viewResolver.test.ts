import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	createBlobUrlResolver,
	createBytesResolver,
	viewUrlFileName,
} from './viewResolver'

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
			expect(init?.credentials).toBe('include')
		})
		vi.stubGlobal('fetch', fetchSpy)

		const resolve = createBytesResolver({
			baseUrl: 'https://api.example.com/',
			headers: () => ({ Authorization: 'Bearer t' }),
			credentials: 'include',
		})
		expect(await resolve('/storage/s/1/view?key=k')).toEqual(bytes)
		expect(fetchSpy).toHaveBeenCalledOnce()
	})

	// A public object is already reachable; sending the JWT to a third party
	// would leak it.
	it('leaves a foreign url alone and sends no headers', async () => {
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

	// What `encryptedUrl` returns is commonly absolute and points back at the
	// app's own authenticated endpoint — fetching it bare answers 401.
	it('credits an absolute url on the api origin as ours', async () => {
		const fetchSpy = stub((url, init) => {
			expect(url).toBe('https://api.example.com/storage/s/1/view?key=k')
			expect(init?.headers).toEqual({ Authorization: 'Bearer t' })
			expect(init?.credentials).toBe('include')
		})
		vi.stubGlobal('fetch', fetchSpy)

		const resolve = createBytesResolver({
			baseUrl: 'https://api.example.com',
			headers: () => ({ Authorization: 'Bearer t' }),
			credentials: 'include',
		})
		expect(
			await resolve('https://api.example.com/storage/s/1/view?key=k')
		).toEqual(bytes)
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

describe('createBlobUrlResolver', () => {
	const stubBlob = (type: string) => {
		const created: Blob[] = []
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					({
						ok: true,
						blob: async () => new Blob(['x'], { type }),
					}) as unknown as Response
			)
		)
		vi.stubGlobal('URL', {
			createObjectURL: (blob: Blob) => {
				created.push(blob)
				return 'blob:stub'
			},
		})
		return created
	}

	it('retypes an octet-stream response with the file mime — a blob: PDF is rendered from its type alone', async () => {
		const created = stubBlob('application/octet-stream')
		const resolve = createBlobUrlResolver({
			baseUrl: 'https://api.example.com',
		})

		await resolve({
			url: '/storage/s/1/view?key=k',
			mimeType: 'application/pdf',
		})

		expect(created[0]?.type).toBe('application/pdf')
	})

	it('keeps a truthful response type over the declared one', async () => {
		const created = stubBlob('image/png')
		const resolve = createBlobUrlResolver({
			baseUrl: 'https://api.example.com',
		})

		await resolve({
			url: '/storage/s/1/view?key=k',
			mimeType: 'application/pdf',
		})

		expect(created[0]?.type).toBe('image/png')
	})
})
