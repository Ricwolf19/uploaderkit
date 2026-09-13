import {
	createCipheriv,
	createDecipheriv,
	type DecipherGCM,
	randomBytes,
} from 'node:crypto'
import { Transform, type TransformCallback } from 'node:stream'

import { ScopeError } from '../scopes'
import type { StreamingCryptoHooks } from './storage'

const IV_LENGTH = 12
const TAG_LENGTH = 16
const HEADER_LENGTH = IV_LENGTH + TAG_LENGTH
const KEY_PATTERN = /^[0-9a-fA-F]{64}$/

/**
 * Decrypts as bytes arrive instead of after they all have.
 *
 * The `[iv][tag][ciphertext]` layout is what makes this possible at all: GCM
 * needs the tag before it can decrypt, and here it leads the object rather
 * than trailing it. The header may straddle several chunks, so it is
 * accumulated until complete and whatever followed it in that chunk is fed
 * onward — a 12-byte first chunk would otherwise be dropped.
 */
class GcmDecryptStream extends Transform {
	#header = Buffer.alloc(0)
	#decipher: DecipherGCM | null = null

	constructor(private readonly key: Buffer) {
		super()
	}

	override _transform(
		chunk: Buffer,
		_encoding: BufferEncoding,
		done: TransformCallback
	): void {
		let body = chunk
		if (!this.#decipher) {
			this.#header = Buffer.concat([this.#header, chunk])
			if (this.#header.length < HEADER_LENGTH) return done()

			this.#decipher = createDecipheriv(
				'aes-256-gcm',
				this.key,
				this.#header.subarray(0, IV_LENGTH)
			) as DecipherGCM
			this.#decipher.setAuthTag(this.#header.subarray(IV_LENGTH, HEADER_LENGTH))
			body = this.#header.subarray(HEADER_LENGTH)
			if (body.length === 0) return done()
		}

		try {
			this.push(this.#decipher.update(body))
			done()
		} catch (error) {
			done(error as Error)
		}
	}

	override _flush(done: TransformCallback): void {
		if (!this.#decipher) {
			return done(new Error('Encrypted object ended before its header'))
		}
		try {
			// Throws when the tag does not match. By now the consumer already has
			// the plaintext, so tampering surfaces as a broken stream, not as a
			// clean rejection — the cost of streaming, stated in `CryptoHooks`.
			this.push(this.#decipher.final())
			done()
		} catch (error) {
			done(error as Error)
		}
	}
}

/**
 * Reference cipher for `encrypt: true` scopes: AES-256-GCM, layout
 * `[iv 12][auth tag 16][ciphertext]`. Injecting different {@link CryptoHooks}
 * into `createStorage` stays fully supported.
 *
 * The key must be exactly 64 hex chars — no passphrase derivation, so two
 * instances can never run "almost the same" secret and silently write
 * mutually unreadable files. `openssl rand -hex 32`.
 *
 * @see AGENTS.md §4.4
 */
export const createAesGcmCrypto = (hexKey: string): StreamingCryptoHooks => {
	if (!KEY_PATTERN.test(hexKey)) {
		throw new ScopeError(
			'createAesGcmCrypto: the key must be exactly 64 hex characters (32 bytes). Generate one with `openssl rand -hex 32`.'
		)
	}
	const key = Buffer.from(hexKey, 'hex')

	return {
		encrypt: data => {
			const iv = randomBytes(IV_LENGTH)
			const cipher = createCipheriv('aes-256-gcm', key, iv)
			const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
			return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
		},
		decrypt: data => {
			const buffer = Buffer.from(data)
			const iv = buffer.subarray(0, IV_LENGTH)
			const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
			const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH)
			const decipher = createDecipheriv('aes-256-gcm', key, iv)
			decipher.setAuthTag(tag)
			return Buffer.concat([decipher.update(ciphertext), decipher.final()])
		},
		decryptStream: source =>
			(source as NodeJS.ReadableStream).pipe(new GcmDecryptStream(key)),
	}
}
