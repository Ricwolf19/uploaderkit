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
