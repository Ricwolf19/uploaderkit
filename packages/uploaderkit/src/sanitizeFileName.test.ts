import { describe, expect, it } from 'vitest'

import { defineScopes } from './defineScopes'
import { resolveKey, sanitizeFileName } from './sanitizeFileName'

describe('sanitizeFileName', () => {
	/**
	 * The name that crashed production. It ends in `p.m.` + `.png`, so the raw
	 * string contains `..` and uploaderkit's traversal guard rejected the key —
	 * which the storage route then dropped as an unhandled rejection, killing
	 * the dyno. This case is the regression; it must never produce `..` again.
	 */
	it('survives the macOS screenshot that took the API down', () => {
		// The space before "p.m." is U+202F, which is what macOS actually writes.
		const result = sanitizeFileName(
			'Screenshot 2026-08-31 at 4.18.54\u202fp.m..png'
		)

		expect(result).toBe('screenshot-2026-08-31-at-4-18-54-p-m.png')
		expect(result).not.toContain('..')
	})

	it('keeps the extension instead of folding it into the stem', () => {
		// The reason `slugify` could not be reused: it collapses the dot too.
		expect(sanitizeFileName('Reporte Final.pdf')).toBe('reporte-final.pdf')
	})

	it.each([
		['acentos y ñ.PNG', 'acentos-y-n.png'],
		['  espacios   varios .jpeg', 'espacios-varios.jpeg'],
		['guiones---repetidos.webp', 'guiones-repetidos.webp'],
	])('normalizes %s', (input, expected) => {
		expect(sanitizeFileName(input)).toBe(expected)
	})

	describe('path syntax never survives', () => {
		it.each([
			'../../etc/passwd.pdf',
			'/absolute/path.pdf',
			'C:\\Windows\\evil.pdf',
		])('flattens %s to its last segment', input => {
			const result = sanitizeFileName(input)

			expect(result).not.toContain('/')
			expect(result).not.toContain('\\')
			expect(result).not.toContain('..')
		})

		/** A name that IS the traversal, with nothing else to keep. */
		it('falls back rather than emitting a dot segment', () => {
			expect(sanitizeFileName('..')).toBe('archivo')
			expect(sanitizeFileName('...')).toBe('archivo')
		})
	})

	describe('degenerate names', () => {
		it('falls back when nothing survives the slug', () => {
			expect(sanitizeFileName('')).toBe('archivo')
			expect(sanitizeFileName('¿¡!?')).toBe('archivo')
			// Punctuation stem, real extension: the extension is still worth keeping.
			expect(sanitizeFileName('***.png')).toBe('archivo.png')
		})

		it('keeps a name that has no extension', () => {
			expect(sanitizeFileName('CONTRATO firmado')).toBe('contrato-firmado')
		})

		/** A dotfile has no stem — treating the leading dot as a separator would
        leave an empty name carrying a suffix. */
		it('does not read a leading dot as an extension', () => {
			expect(sanitizeFileName('.env')).toBe('env')
		})

		it('keeps only the last extension of a double one', () => {
			expect(sanitizeFileName('backup.tar.gz')).toBe('backup-tar.gz')
		})
	})

	it('caps the length without leaving a trailing separator', () => {
		const long = `${'a b '.repeat(100)}.png`

		const result = sanitizeFileName(long)

		expect(result.length).toBeLessThanOrEqual(85)
		expect(result.endsWith('.png')).toBe(true)
		expect(result).not.toContain('-.')
	})

	it('is idempotent, so re-sanitizing a stored key is a no-op', () => {
		const once = sanitizeFileName(
			'Screenshot 2026-08-31 at 4.18.54\u202fp.m..png'
		)

		expect(sanitizeFileName(once)).toBe(once)
	})
})

describe('resolveKey', () => {
	const registry = defineScopes({
		docs: {
			path: (id, file) => `Docs/${id}/${sanitizeFileName(file.name)}`,
			visibility: 'private',
			accept: ['png'],
			maxBytes: 1024,
		},
	})
	const fileOf = (name: string) => ({
		name,
		size: 1,
		type: 'image/png',
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
	})

	/**
	 * Regression for the guard this shadows. The core tests `includes('..')`,
	 * which a macOS screenshot trips through `p.m.` meeting `.png` — in a
	 * consumer that dropped the rejected promise it took a whole API down.
	 */
	it('accepts a name whose dots are not a path segment', () => {
		expect(
			resolveKey(registry, 'docs', 'c1', fileOf('a. b..png'))
		).not.toContain('..')
	})

	it('still blocks a real traversal segment', () => {
		const raw = defineScopes({
			docs: {
				path: (id, file) => `Docs/${id}/${file.name}`,
				visibility: 'private',
				accept: ['png'],
				maxBytes: 1024,
			},
		})

		expect(() =>
			resolveKey(raw, 'docs', 'c1', fileOf('../../etc/passwd.png'))
		).toThrow(/unsafe key/)
	})
})
