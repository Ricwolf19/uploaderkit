import { describe, expect, it, vi } from 'vitest'

import { createMemoryProvider } from '../adapters/memory'
import { defineScopes, MB } from '../index'
import { createExpressStorageHandlers } from './express'
import { createNextStorageHandlers } from './next'
import { createStorage } from './storage'

const viewPath = ({
	scope,
	entityId,
	key,
}: {
	scope: string
	entityId: string
	key: string
}) => `/storage/${scope}/${entityId}/view?key=${encodeURIComponent(key)}`

const scopes = defineScopes({
	secret: {
		path: (id, file) => `Docs/${id}/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: MB,
		category: 'pdf',
		encrypt: true,
	},
})

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

/** Reversible stand-in: worthless as crypto, enough to prove both ran. */
const crypto = {
	encrypt: (data: Uint8Array) => data.map(byte => byte ^ 0x5a),
	decrypt: (data: Uint8Array) => data.map(byte => byte ^ 0x5a),
}

const fileLike = {
	name: 'acta.pdf',
	size: PDF.length,
	type: 'application/pdf',
	arrayBuffer: async () => PDF.buffer.slice(0) as ArrayBuffer,
}

const seed = async () => {
	const provider = createMemoryProvider()
	const storage = createStorage({
		scopes,
		provider,
		crypto,
		encryptedUrl: viewPath,
	})
	const stored = await storage.upload({
		scope: 'secret',
		entityId: 'c1',
		file: fileLike,
	})
	return { storage, provider, stored }
}

describe('view handlers', () => {
	it('express serves the DECRYPTED bytes with a private, no-store header', async () => {
		const { storage, provider, stored } = await seed()
		const handlers = createExpressStorageHandlers(storage)

		// What sits in the bucket is ciphertext.
		expect(provider.objects.get(stored.key)!.body).not.toEqual(PDF)

		const headers = new Map<string, string>()
		let body: unknown
		const res = {
			status: vi.fn(() => res),
			json: vi.fn(),
			setHeader: (name: string, value: string) => headers.set(name, value),
			send: (payload: unknown) => {
				body = payload
			},
		}

		await handlers.view(
			{
				params: { scope: 'secret', entityId: 'c1' },
				query: { key: stored.key },
			},
			res
		)

		expect(new Uint8Array(body as Uint8Array)).toEqual(PDF)
		expect(headers.get('Content-Type')).toBe('application/pdf')
		expect(headers.get('Cache-Control')).toBe('private, no-store')
		expect(headers.get('Content-Disposition')).toContain('inline')
	})

	it('express switches to attachment on download=1', async () => {
		const { storage, stored } = await seed()
		const handlers = createExpressStorageHandlers(storage)
		const headers = new Map<string, string>()
		const res = {
			status: vi.fn(() => res),
			json: vi.fn(),
			setHeader: (name: string, value: string) => headers.set(name, value),
			send: vi.fn(),
		}

		await handlers.view(
			{
				params: { scope: 'secret', entityId: 'c1' },
				query: { key: stored.key, download: '1' },
			},
			res
		)

		expect(headers.get('Content-Disposition')).toContain('attachment')
	})

	it('next answers the decrypted bytes over the Fetch API', async () => {
		const { storage, stored } = await seed()
		const handlers = createNextStorageHandlers(storage)

		const response = await handlers.view(
			new Request(
				`https://app.test/api/storage?key=${encodeURIComponent(stored.key)}`
			),
			{ params: Promise.resolve({ scope: 'secret', entityId: 'c1' }) }
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('private, no-store')
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF)
	})

	it('an unauthorized request never reaches the bytes', async () => {
		const { storage, stored } = await seed()
		const handlers = createNextStorageHandlers(storage, {
			authorize: async () => null,
		})

		const response = await handlers.view(
			new Request(
				`https://app.test/api/storage?key=${encodeURIComponent(stored.key)}`
			),
			{ params: Promise.resolve({ scope: 'secret', entityId: 'c1' }) }
		)

		expect(response.status).toBe(401)
	})
})
