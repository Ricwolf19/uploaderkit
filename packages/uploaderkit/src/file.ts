import { MIME_TYPES } from './constants'
import type { FileExtension, FileLike } from './types'

/** Lower-case extension without the dot, or `''` when the name has none. */
export const getFileExtension = (fileName: string): string => {
	const dot = fileName.lastIndexOf('.')
	if (dot < 1 || dot === fileName.length - 1) return ''
	return fileName.slice(dot + 1).toLowerCase()
}

export const getMimeType = (fileName: string): string => {
	const ext = getFileExtension(fileName) as FileExtension
	return MIME_TYPES[ext] ?? 'application/octet-stream'
}

export const isKnownExtension = (value: string): value is FileExtension =>
	value in MIME_TYPES

export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	const units = ['KB', 'MB', 'GB', 'TB']
	let size = bytes / 1024
	let unit = 0
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024
		unit++
	}
	return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`
}

/** Longest stem kept. Object stores cap the whole key and the prefix spends part of it. */
const MAX_STEM_LENGTH = 80

/** What an all-punctuation name degrades to, so a key never ends in a bare dot. */
const FALLBACK_STEM = 'file'

const slugSegment = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

/**
 * Turns a user's file name into a safe key segment: ASCII, lower case, one
 * extension, no path syntax.
 *
 * Call it INSIDE your scope's `path()`, not around it:
 *
 * ```ts
 * path: (id, file) => `Docs/${id}/${sanitizeFileName(file.name)}`
 * ```
 *
 * `resolveKey` deliberately does not apply it for you. It would rewrite the key
 * your `path()` returned, and a client computing the same key to decide replace
 * mode would then disagree with the server. Inside `path()` both sides run the
 * one function and cannot drift.
 *
 * This exists because a macOS screenshot took an API down. `Screenshot
 * 2026-08-31 at 4.18.54 p.m..png` ends in `p.m.` + `.png`, so the raw name
 * carries `..`; the traversal guard rejected the key and the consumer dropped
 * the rejection, killing the process.
 *
 * Only the KEY is slugged — keep the original in `StoredFile.fileName`, which
 * is what a UI should render.
 */
export const sanitizeFileName = (fileName: string): string => {
	// A name arriving as a path is already an attempt, deliberate or not.
	const base = fileName.split(/[/\\]/).pop() ?? ''

	const dot = base.lastIndexOf('.')
	// A leading dot is a dotfile, not an extension: `.env` has no stem.
	const hasExtension = dot > 0
	const stem = slugSegment(hasExtension ? base.slice(0, dot) : base).slice(
		0,
		MAX_STEM_LENGTH
	)
	const extension = hasExtension ? slugSegment(base.slice(dot + 1)) : ''

	// A trailing `-` can reappear when the length cut lands mid-separator.
	const safeStem = stem.replace(/-+$/, '') || FALLBACK_STEM

	return extension ? `${safeStem}.${extension}` : safeStem
}

/** Value for an `<input accept="…">` built from an extension list. */
export const toAcceptAttribute = (extensions: FileExtension[]): string =>
	extensions.length === 0
		? '*/*'
		: extensions.map(extension => `.${extension}`).join(',')

/**
 * Adapts a multer memory-storage file to `FileLike` so server code validates
 * with the very same function the browser ran.
 */
export const fromMulterFile = (file: {
	originalname: string
	size: number
	mimetype: string
	buffer: Uint8Array
}): FileLike => ({
	name: file.originalname,
	size: file.size,
	type: file.mimetype,
	arrayBuffer: async () =>
		file.buffer.buffer.slice(
			file.buffer.byteOffset,
			file.buffer.byteOffset + file.buffer.byteLength
		) as ArrayBuffer,
})
