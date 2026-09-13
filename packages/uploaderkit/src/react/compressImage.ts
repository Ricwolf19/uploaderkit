import type { CompressOptions } from '../types'
// Formats a canvas can re-encode. GIF would lose animation and SVG would
// rasterize, so both pass through untouched.
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Client-side image trim before upload: downscale to the scope's box and
 * re-encode at the scope's quality. Re-encoding through a canvas drops EXIF as
 * a side effect — GPS and camera metadata never leave the device, regardless
 * of `stripExif` (a canvas cannot keep it).
 *
 * Falls back to the original file whenever it cannot help: non-compressible
 * formats, environments without `createImageBitmap`, decode failures, or a
 * "compressed" result that came out larger.
 */
export const compressImage = async (
	file: File,
	{ maxWidth, maxHeight, quality = 0.8 }: CompressOptions
): Promise<File> => {
	if (!COMPRESSIBLE.has(file.type)) return file
	if (typeof createImageBitmap !== 'function') return file

	try {
		const bitmap = await createImageBitmap(file)
		const scale = Math.min(
			1,
			(maxWidth ?? Infinity) / bitmap.width,
			(maxHeight ?? Infinity) / bitmap.height
		)

		const canvas = document.createElement('canvas')
		canvas.width = Math.max(1, Math.round(bitmap.width * scale))
		canvas.height = Math.max(1, Math.round(bitmap.height * scale))
		const context = canvas.getContext('2d')
		if (!context) return file
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
		bitmap.close()

		const blob = await new Promise<Blob | null>(resolve =>
			canvas.toBlob(resolve, file.type, quality)
		)
		if (!blob || blob.size >= file.size) return file

		return new File([blob], file.name, { type: file.type })
	} catch {
		return file
	}
}
