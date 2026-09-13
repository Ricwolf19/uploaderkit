import { resolveLabels, type UploaderLabels } from '../labels'
import type { StoredFile } from '../types'
import type { RemoveStrategy, UploadStrategy } from './types'

export type XhrUploadStrategyOptions = {
	/** Base URL of the storage router, e.g. `${apiUrl}/storage`. */
	endpoint: string
	/** Evaluated per upload so a rotating JWT is read at send time, not at setup. */
	headers?: () => Record<string, string>
	/** Multipart field name the server reads. @defaultValue 'file' */
	fieldName?: string
	/**
	 * `'include'` sends the session cookie cross-origin, which a cookie-session
	 * app needs: its api answers on a different origin than the SPA, and the
	 * browser drops the cookie otherwise. Maps to `XMLHttpRequest.withCredentials`.
	 *
	 * @defaultValue 'same-origin'
	 */
	credentials?: RequestCredentials
	/**
	 * Copy for the two failures the transport itself words. Pass the same
	 * object the uploader renders with, or the request that fails speaks a
	 * different language than the row reporting it.
	 */
	labels?: Partial<UploaderLabels>
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
		credentials,
		labels,
	}: XhrUploadStrategyOptions): UploadStrategy =>
	(file, scope, entityId, { onProgress, signal }) =>
		new Promise<StoredFile>((resolve, reject) => {
			const copy = resolveLabels(labels)
			const xhr = new XMLHttpRequest()
			const url = `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(scope)}/${encodeURIComponent(entityId)}/upload`
			xhr.open('POST', url)
			xhr.responseType = 'json'
			xhr.withCredentials = credentials === 'include'
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
				// The server handler answers { message } already worded for the
				// user; the label is only the fallback when it answered nothing.
				const message =
					(xhr.response as { message?: string } | null)?.message ??
					copy.uploadFailed
				reject(new Error(message))
			}

			xhr.onerror = () => {
				signal.removeEventListener('abort', abort)
				reject(new Error(copy.uploadNetworkFailed))
			}

			xhr.onabort = () => {
				signal.removeEventListener('abort', abort)
				const error = new Error('Upload cancelled')
				error.name = 'AbortError'
				reject(error)
			}

			const form = new FormData()
			form.append(fieldName, file)
			xhr.send(form)
		})

export type RemoveStrategyOptions = Omit<XhrUploadStrategyOptions, 'fieldName'>

/**
 * Default deletion transport: `DELETE {endpoint}/{scope}/{entityId}` with
 * `{ key }` as JSON — the route the package's own Express/Next handlers
 * document (`router.delete('/:scope/:entityId', handlers.remove)`).
 *
 * Plain `fetch`, not XHR: a delete has no body worth a progress bar, which is
 * the only reason the upload half needs XMLHttpRequest.
 */
export const createRemoveStrategy =
	({ endpoint, headers, credentials }: RemoveStrategyOptions): RemoveStrategy =>
	async (stored, scope, entityId) => {
		const url = `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(scope)}/${encodeURIComponent(entityId)}`
		const response = await fetch(url, {
			method: 'DELETE',
			credentials,
			headers: { 'Content-Type': 'application/json', ...headers?.() },
			body: JSON.stringify({ key: stored.key }),
		})
		if (!response.ok) return false
		const body = (await response.json().catch(() => null)) as {
			deleted?: boolean
		} | null
		return body?.deleted === true
	}
