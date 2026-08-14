import type { ScopeConfig } from '../index'
import { getMimeType, ScopeError } from '../index'
import { StorageRequestError, type StorageService } from './storage'

export type NextRouteContext = {
	params: Promise<Record<string, string | string[] | undefined>>
}

export type NextStorageOptions = {
	/**
	 * Gate every request. Return the acting user (or `{}` for "allowed,
	 * anonymous") to proceed; return `null` to answer 401. Omitting it leaves
	 * the router OPEN — only acceptable behind an authenticated proxy.
	 */
	authorize?: (
		request: Request,
		context: { scope: string; entityId: string }
	) => Promise<{ userId?: string } | null>
}

const param = async (
	context: NextRouteContext,
	name: string
): Promise<string> => {
	const value = (await context.params)[name]
	if (typeof value !== 'string' || value.length === 0) {
		throw new StorageRequestError('Solicitud incompleta', 400)
	}
	return value
}

const fail = (error: unknown): Response => {
	if (error instanceof StorageRequestError) {
		return Response.json({ message: error.message }, { status: error.status })
	}
	// ScopeError is a wiring bug: surface it to the developer via the thrown
	// stack (Next logs it), never its text to the user.
	if (error instanceof ScopeError) throw error
	return Response.json(
		{ message: 'No se pudo procesar el archivo' },
		{ status: 500 }
	)
}

/**
 * App Router handlers over a {@link StorageService}. Mount under
 * `app/api/storage/[scope]/[entityId]/…`:
 *
 * ```ts
 * // app/api/storage/[scope]/[entityId]/upload/route.ts
 * export const POST = handlers.upload
 * ```
 */
export const createNextStorageHandlers = <
	T extends Record<string, ScopeConfig>,
>(
	storage: StorageService<T>,
	{ authorize }: NextStorageOptions = {}
) => {
	const guard = async (
		request: Request,
		scope: string,
		entityId: string
	): Promise<{ userId?: string }> => {
		if (!authorize) return {}
		const user = await authorize(request, { scope, entityId })
		if (user === null) throw new StorageRequestError('No autorizado', 401)
		return user
	}

	return {
		upload: async (
			request: Request,
			context: NextRouteContext
		): Promise<Response> => {
			try {
				const scope = await param(context, 'scope')
				const entityId = await param(context, 'entityId')
				const user = await guard(request, scope, entityId)

				const form = await request.formData()
				const file = form.get('file')
				if (!(file instanceof File)) {
					throw new StorageRequestError('Archivo requerido', 400)
				}

				const stored = await storage.upload({
					scope,
					entityId,
					file,
					...(user.userId ? { uploadedBy: user.userId } : {}),
				})
				return Response.json(stored)
			} catch (error) {
				return fail(error)
			}
		},

		remove: async (
			request: Request,
			context: NextRouteContext
		): Promise<Response> => {
			try {
				const scope = await param(context, 'scope')
				const entityId = await param(context, 'entityId')
				await guard(request, scope, entityId)

				const { key } = (await request.json()) as { key?: string }
				if (!key) throw new StorageRequestError('Solicitud incompleta', 400)

				const deleted = await storage.remove({ scope, key })
				return Response.json({ deleted })
			} catch (error) {
				return fail(error)
			}
		},

		/** Decrypted bytes served inline — see the express adapter's note. */
		view: async (
			request: Request,
			context: NextRouteContext
		): Promise<Response> => {
			try {
				const scope = await param(context, 'scope')
				const entityId = await param(context, 'entityId')
				await guard(request, scope, entityId)

				const url = new URL(request.url)
				const key = url.searchParams.get('key')
				if (!key) throw new StorageRequestError('Solicitud incompleta', 400)

				const bytes = await storage.read({ scope, key })
				const fileName = key.split('/').pop() ?? 'archivo'
				return new Response(new Uint8Array(bytes), {
					headers: {
						'Content-Type': getMimeType(fileName),
						'Content-Disposition': `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`,
						'Cache-Control': 'private, no-store',
					},
				})
			} catch (error) {
				return fail(error)
			}
		},

		signedUrl: async (
			request: Request,
			context: NextRouteContext
		): Promise<Response> => {
			try {
				const scope = await param(context, 'scope')
				const entityId = await param(context, 'entityId')
				await guard(request, scope, entityId)

				const url = new URL(request.url)
				const key = url.searchParams.get('key')
				if (!key) throw new StorageRequestError('Solicitud incompleta', 400)

				const signed = await storage.signedUrl({
					scope,
					key,
					download: url.searchParams.get('download') === '1',
				})
				return Response.json({ url: signed })
			} catch (error) {
				return fail(error)
			}
		},
	}
}
