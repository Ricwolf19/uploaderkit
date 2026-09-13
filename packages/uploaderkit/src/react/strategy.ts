import type { StoredFile } from '../types'
import type { UploadStrategy } from './types'

export type XhrUploadStrategyOptions = {
	/** Base URL of the storage router, e.g. `${apiUrl}/storage`. */
	endpoint: string
	/** Evaluated per upload so a rotating JWT is read at send time, not at setup. */
	headers?: () => Record<string, string>
	/** Multipart field name the server reads. @defaultValue 'file' */
	fieldName?: string
}

/**
 * Default transport: `POST {endpoint}/{scope}/{entityId}/upload` as multipart.
 *
 * XHR instead of `fetch` on purpose — `fetch` still has no usable upload
 * progress in browsers, and per-file progress is half the point of the hook.
 */
export const createXhrUploadStrategy =
	({
		endpoint,
		headers,
		fieldName = 'file',
	}: XhrUploadStrategyOptions): UploadStrategy =>
	(file, scope, entityId, { onProgress, signal }) =>
		new Promise<StoredFile>((resolve, reject) => {
			const xhr = new XMLHttpRequest()
			const url = `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(scope)}/${encodeURIComponent(entityId)}/upload`
			xhr.open('POST', url)
			xhr.responseType = 'json'
			for (const [name, value] of Object.entries(headers?.() ?? {})) {
				xhr.setRequestHeader(name, value)
			}

			const abort = () => xhr.abort()
			signal.addEventListener('abort', abort, { once: true })

			xhr.upload.onprogress = event => {
				if (event.lengthComputable) {
					onProgress(Math.round((event.loaded / event.total) * 100))
				}
			}

			xhr.onload = () => {
				signal.removeEventListener('abort', abort)
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(xhr.response as StoredFile)
					return
				}
				// The server handler answers { message } in the user's language.
				const message =
					(xhr.response as { message?: string } | null)?.message ??
					'No se pudo subir el archivo'
				reject(new Error(message))
			}

			xhr.onerror = () => {
				signal.removeEventListener('abort', abort)
				reject(new Error('No se pudo subir el archivo. Revisa tu conexión'))
			}

			xhr.onabort = () => {
				signal.removeEventListener('abort', abort)
				const error = new Error('Carga cancelada')
				error.name = 'AbortError'
				reject(error)
			}

			const form = new FormData()
			form.append(fieldName, file)
			xhr.send(form)
		})
