import { Readable, Writable } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

import { createMemoryProvider } from '../adapters/memory'
import { MB } from '../constants'
import { DEFAULT_LABELS, ES_LABELS } from '../labels'
import { defineScopes } from '../scopes'
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
		// A writable, not a `send` spy: the handler pipes now, so buffering the
		// whole object never happens and there is no payload to capture.
		const chunks: Buffer[] = []
		const res = Object.assign(
			new Writable({
				write(chunk: Buffer, _encoding, done) {
					chunks.push(Buffer.from(chunk))
					done()
				},
			}),
			{
				status: vi.fn(() => res),
				json: vi.fn(),
				setHeader: (name: string, value: string) => headers.set(name, value),
			}
		)

		await handlers.view(
			{
				params: { scope: 'secret', entityId: 'c1' },
				query: { key: stored.key },
			},
			// A Writable is exactly what the handler needs and more than the
			// structural type describes, so the cast is the honest direction.
			res as unknown as Parameters<typeof handlers.view>[1]
		)

		expect(new Uint8Array(Buffer.concat(chunks))).toEqual(PDF)
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

	it('a stream that dies mid-response never tries to answer again', async () => {
		const { storage } = await seed()
		// The provider hands a stream that fails after the first chunk — the
		// same shape as a GCM tag mismatch, which only surfaces at the end.
		const readStream = vi.spyOn(storage, 'readStream').mockResolvedValue(
			new Readable({
				read() {
					this.push(Buffer.from('partial'))
					this.destroy(new Error('tag mismatch'))
				},
			})
		)
		const handlers = createExpressStorageHandlers(storage)

		const res = Object.assign(
			new Writable({
				write(_chunk: Buffer, _encoding, done) {
					done()
				},
			}),
			{
				status: vi.fn(() => res),
				json: vi.fn(),
				setHeader: vi.fn(),
				send: vi.fn(),
			}
		)

		await handlers.view(
			{ params: { scope: 'secret', entityId: 'c1' }, query: { key: 'k' } },
			res
		)

		// Headers already went out; a second answer would be
		// ERR_HTTP_HEADERS_SENT on a real Express response.
		expect(res.status).not.toHaveBeenCalled()
		expect(res.json).not.toHaveBeenCalled()
		readStream.mockRestore()
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

describe('handler copy', () => {
	/** Drives a handler with a missing route param and reports what it answered. */
	const answerFor = async (labels?: typeof ES_LABELS) => {
		const storage = createStorage({
			scopes,
			provider: createMemoryProvider(),
			crypto,
			encryptedUrl: viewPath,
			...(labels ? { labels } : {}),
		})
		const handlers = createExpressStorageHandlers(storage)
		const json = vi.fn()
		const res = {
			status: vi.fn(() => res),
			json,
			setHeader: vi.fn(),
			send: vi.fn(),
		}

		await handlers.view(
			{ params: { scope: 'secret' }, query: { key: 'k' } },
			res as unknown as Parameters<typeof handlers.view>[1]
		)
		return (json.mock.calls[0]?.[0] as { message: string }).message
	}

	it('answers in English when createStorage was given no labels', async () => {
		expect(await answerFor()).toBe(DEFAULT_LABELS.requestIncomplete)
	})

	// The adapter reads `storage.labels`, so configuring the service is the only
	// place a language is chosen — the route cannot drift from it.
	it('answers with the copy createStorage was configured with', async () => {
		expect(await answerFor(ES_LABELS)).toBe(ES_LABELS.requestIncomplete)
	})

	it('re-validates with that same copy', async () => {
		const storage = createStorage({
			scopes,
			provider: createMemoryProvider(),
			crypto,
			encryptedUrl: viewPath,
			labels: ES_LABELS,
		})

		await expect(
			storage.upload({
				scope: 'secret',
				entityId: 'c1',
				file: { ...fileLike, name: 'foto.png' },
			})
		).rejects.toThrow(ES_LABELS.formatNotAllowed(['pdf']))
	})
})
