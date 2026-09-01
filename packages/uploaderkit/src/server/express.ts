import { pipeline } from 'node:stream/promises'

import { fromMulterFile, getMimeType } from '../file'
import { ScopeError } from '../scopes'
import type { ScopeConfig } from '../types'
import { StorageRequestError, type StorageService } from './storage'

/**
 * Structural request/response shapes instead of Express types on purpose: the
 * package stays dependency-free and any Express 4/5 app satisfies them. The
 * app keeps ownership of multer (memory storage) and mounts these as the last
 * handler of each route.
 */
export type ExpressishRequest = {
	params: Record<string, string | undefined>
	body?: unknown
	query?: Record<string, unknown>
	/** Populated by `multer({ storage: memoryStorage() }).single('file')`. */
	file?: {
		originalname: string
		size: number
		mimetype: string
		buffer: Uint8Array
	}
}

export type ExpressishResponse = {
	status: (code: number) => ExpressishResponse
	json: (body: unknown) => unknown
	setHeader: (name: string, value: string) => unknown
	send: (body: unknown) => unknown
}

export type ExpressStorageOptions = {
	/**
	 * Gate every request. Return the acting user (or `{}` for "allowed") to
	 * proceed; return `null` to answer 401. Typically reads `req.user` set by
	 * the app's auth middleware.
	 */
	authorize?: (
		req: ExpressishRequest,
		context: { scope: string; entityId: string }
	) => Promise<{ userId?: string } | null>
}

const param = (req: ExpressishRequest, name: string): string => {
	const value = req.params[name]
	if (!value) throw new StorageRequestError('Solicitud incompleta', 400)
	return value
}

const fail = (res: ExpressishResponse, error: unknown): void => {
	if (error instanceof StorageRequestError) {
		res.status(error.status).json({ message: error.message })
		return
	}
	if (error instanceof ScopeError) throw error
	res.status(500).json({ message: 'No se pudo procesar el archivo' })
}

/**
 * Express-shaped handlers over a {@link StorageService}. Wire them as:
 *
 * ```ts
 * const upload = multer({ storage: multer.memoryStorage() })
 * router.post('/:scope/:entityId/upload', useAuth, upload.single('file'), handlers.upload)
 * router.delete('/:scope/:entityId', useAuth, handlers.remove)
 * router.get('/:scope/:entityId/signed-url', useAuth, handlers.signedUrl)
 * ```
 */
export const createExpressStorageHandlers = <
	T extends Record<string, ScopeConfig>,
>(
	storage: StorageService<T>,
	{ authorize }: ExpressStorageOptions = {}
) => {
	const guard = async (
		req: ExpressishRequest,
		scope: string,
		entityId: string
	): Promise<{ userId?: string }> => {
		if (!authorize) return {}
		const user = await authorize(req, { scope, entityId })
		if (user === null) throw new StorageRequestError('No autorizado', 401)
		return user
	}

	return {
		upload: async (req: ExpressishRequest, res: ExpressishResponse) => {
			try {
				const scope = param(req, 'scope')
				const entityId = param(req, 'entityId')
				const user = await guard(req, scope, entityId)

				if (!req.file) throw new StorageRequestError('Archivo requerido', 400)

				const stored = await storage.upload({
					scope,
					entityId,
					file: fromMulterFile(req.file),
					...(user.userId ? { uploadedBy: user.userId } : {}),
				})
				res.status(200).json(stored)
			} catch (error) {
				fail(res, error)
			}
		},

		remove: async (req: ExpressishRequest, res: ExpressishResponse) => {
			try {
				const scope = param(req, 'scope')
				const entityId = param(req, 'entityId')
				await guard(req, scope, entityId)

				const key = (req.body as { key?: string } | undefined)?.key
				if (!key) throw new StorageRequestError('Solicitud incompleta', 400)

				res.status(200).json({ deleted: await storage.remove({ scope, key }) })
			} catch (error) {
				fail(res, error)
			}
		},

		/**
		 * Serves the DECRYPTED bytes of an object, inline. The only readable
		 * route for encrypted scopes — their bucket objects are ciphertext, so
		 * neither the stored URL nor a signed one can render without this.
		 */
		view: async (req: ExpressishRequest, res: ExpressishResponse) => {
			try {
				const scope = param(req, 'scope')
				const entityId = param(req, 'entityId')
				await guard(req, scope, entityId)

				const key = req.query?.key
				if (typeof key !== 'string' || !key) {
					throw new StorageRequestError('Solicitud incompleta', 400)
				}

				const body = await storage.readStream({ scope, key })
				const fileName = key.split('/').pop() ?? 'archivo'
				res.setHeader('Content-Type', getMimeType(fileName))
				res.setHeader(
					'Content-Disposition',
					`${req.query?.download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`
				)
				// Decrypted content must never land in a shared cache.
				res.setHeader('Cache-Control', 'private, no-store')

				// Piped, not buffered: a 20MB document would otherwise sit in
				// memory in full, per concurrent reader. `pipeline` is what
				// destroys the response if the source fails — which for an
				// encrypted object includes a failed authentication tag, since
				// that is only known once the last byte has gone out.
				try {
					await pipeline(body, res as unknown as NodeJS.WritableStream)
				} catch {
					// The status line and part of the body are already out, so
					// there is nothing left to answer with: `pipeline` destroyed
					// the socket, and `fail()` here would throw
					// ERR_HTTP_HEADERS_SENT over the real error.
					return
				}
			} catch (error) {
				fail(res, error)
			}
		},

		signedUrl: async (req: ExpressishRequest, res: ExpressishResponse) => {
			try {
				const scope = param(req, 'scope')
				const entityId = param(req, 'entityId')
				await guard(req, scope, entityId)

				const key = req.query?.key
				if (typeof key !== 'string' || !key) {
					throw new StorageRequestError('Solicitud incompleta', 400)
				}

				const url = await storage.signedUrl({
					scope,
					key,
					download: req.query?.download === '1',
				})
				res.status(200).json({ url })
			} catch (error) {
				fail(res, error)
			}
		},
	}
}
