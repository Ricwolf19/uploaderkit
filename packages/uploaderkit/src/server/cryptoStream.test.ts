import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { createAesGcmCrypto } from './crypto'

const KEY = 'a'.repeat(64)
const crypto = createAesGcmCrypto(KEY)

const collect = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
	const chunks: Buffer[] = []
	for await (const chunk of stream) chunks.push(Buffer.from(chunk))
	return Buffer.concat(chunks)
}

/** Feeds the ciphertext in fixed slices, to control where the header splits. */
const inChunksOf = (bytes: Uint8Array, size: number): Readable => {
	const parts: Buffer[] = []
	for (let at = 0; at < bytes.length; at += size) {
		parts.push(Buffer.from(bytes.subarray(at, at + size)))
	}
	return Readable.from(parts)
}

describe('decryptStream', () => {
	it('round-trips what encrypt produced', async () => {
		const plain = Buffer.from('CFDI comprobante de pago — ñ á é')
		const encrypted = (await crypto.encrypt(plain)) as Uint8Array

		const out = await collect(
			crypto.decryptStream!(Readable.from([Buffer.from(encrypted)])) as Readable
		)

		expect(out.equals(plain)).toBe(true)
	})

	it('agrees with the buffered decrypt', async () => {
		const plain = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 251))
		const encrypted = (await crypto.encrypt(plain)) as Uint8Array

		const streamed = await collect(
			crypto.decryptStream!(inChunksOf(encrypted, 64)) as Readable
		)
		const buffered = Buffer.from(
			(await crypto.decrypt(encrypted)) as Uint8Array
		)

		expect(streamed.equals(buffered)).toBe(true)
	})

	/**
	 * The header is `[iv 12][tag 16]`. A source that hands over fewer than 28
	 * bytes at a time — which any real socket may — must not lose the ciphertext
	 * that shared a chunk with the end of the header.
	 */
	it.each([1, 5, 12, 13, 27, 28, 29])(
		'reassembles a header split across %i-byte chunks',
		async size => {
			const plain = Buffer.from('el tag va al inicio, por eso esto se puede')
			const encrypted = (await crypto.encrypt(plain)) as Uint8Array

			const out = await collect(
				crypto.decryptStream!(inChunksOf(encrypted, size)) as Readable
			)

			expect(out.equals(plain)).toBe(true)
		}
	)

	it('handles empty content without emitting anything', async () => {
		const encrypted = (await crypto.encrypt(Buffer.alloc(0))) as Uint8Array

		const out = await collect(
			crypto.decryptStream!(Readable.from([Buffer.from(encrypted)])) as Readable
		)

		expect(out.length).toBe(0)
	})

	/**
	 * The cost of streaming, pinned so it is a decision and not a surprise: the
	 * tag is only checked at the end, so tampering fails the stream rather than
	 * being caught before any byte leaves.
	 */
	it('fails the stream when the ciphertext was tampered with', async () => {
		const encrypted = Buffer.from(
			(await crypto.encrypt(Buffer.from('importe original'))) as Uint8Array
		)
		encrypted[encrypted.length - 1] = (encrypted.at(-1) ?? 0) ^ 0xff

		await expect(
			collect(crypto.decryptStream!(Readable.from([encrypted])) as Readable)
		).rejects.toThrow()
	})

	it('fails when the object ends inside its header', async () => {
		await expect(
			collect(
				crypto.decryptStream!(Readable.from([Buffer.alloc(10)])) as Readable
			)
		).rejects.toThrow(/header/i)
	})
})
