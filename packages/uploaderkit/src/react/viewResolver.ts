export type BlobUrlResolverOptions = {
	/** Prefix for app-relative urls (`/storage/...`) — usually the api origin. */
	baseUrl: string
	/** Evaluated per request, so a rotating JWT is read at fetch time. */
	headers?: () => Record<string, string>
	/**
	 * Forwarded to `fetch` for urls the app owns. Cookie-session apps need
	 * `'include'`: their api lives on a different origin than the SPA, so the
	 * browser omits the session cookie under the default.
	 *
	 * @defaultValue `fetch`'s own (`'same-origin'`)
	 */
	credentials?: RequestCredentials
}

/**
 * True when `baseUrl` serves this url: app-relative, or absolute on the same
 * origin. The persisted url of an encrypted scope is whatever the server's
 * `encryptedUrl` returned, which is commonly absolute — treating it as foreign
 * would fetch the app's own authenticated endpoint with no credentials.
 */
const isOwnUrl = (url: string, baseUrl: string): boolean => {
	if (url.startsWith('/')) return true
	try {
		return new URL(url).origin === new URL(baseUrl).origin
	} catch {
		return false
	}
}

/**
 * The one rule both resolvers follow — a change to the `/view` shape lands
 * here, not once per output format.
 *
 * @see AGENTS.md §3 — why a foreign url must never carry the app's headers
 */
const fetchStored = async (
	url: string,
	{ baseUrl, headers, credentials }: BlobUrlResolverOptions
): Promise<Response> => {
	const own = isOwnUrl(url, baseUrl)
	const response = await fetch(
		url.startsWith('/') ? `${baseUrl.replace(/\/$/, '')}${url}` : url,
		own ? { headers: headers?.(), credentials } : undefined
	)
	if (!response.ok) {
		throw new Error('No se pudo cargar el archivo')
	}
	return response
}

/**
 * An object URL carries the response's Content-Type, and that alone decides how
 * a browser renders a `blob:` — a PDF served as `octet-stream` never reaches
 * the built-in viewer, it silently downloads. When the file declares a type and
 * the response does not, believe the file.
 */
const retyped = (blob: Blob, mimeType?: string): Blob =>
	mimeType && (!blob.type || blob.type === 'application/octet-stream')
		? new Blob([blob], { type: mimeType })
		: blob

/**
 * `resolveUrl` for the FileViewer over authenticated endpoints. An `<img>` or
 * `<iframe>` cannot send an Authorization header or a cross-site cookie, so
 * protected content (the decrypting `/view` route of encrypted scopes) is
 * fetched here with the app's credentials and handed to the viewer as an
 * object URL.
 *
 * Urls on a foreign origin pass through untouched — public objects and legacy
 * hosts render directly. `FileViewer` owns what this mints: it revokes the
 * object URL when it moves to another file and when it closes.
 */
export const createBlobUrlResolver =
	(options: BlobUrlResolverOptions) =>
	async (file: { url: string; mimeType?: string }): Promise<string> => {
		if (!isOwnUrl(file.url, options.baseUrl)) return file.url
		const blob = await (await fetchStored(file.url, options)).blob()
		return URL.createObjectURL(retyped(blob, file.mimeType))
	}

/**
 * The same read, as BYTES — for code that processes a stored file rather than
 * displaying it: a pdf-lib render, a canvas, a parser.
 *
 * Takes the url directly, not a `{ url }`: its sibling's shape is dictated by
 * the viewer's `resolveUrl` prop, while this one is called from app code that
 * usually holds a `StoredFile.url` and nothing else.
 */
export const createBytesResolver =
	(options: BlobUrlResolverOptions) =>
	async (url: string): Promise<Uint8Array> =>
		new Uint8Array(await (await fetchStored(url, options)).arrayBuffer())

/**
 * Display name of a persisted url. Understands the `/view?key=…` shape the
 * decrypting endpoint uses (the file name is the key's last segment) and
 * falls back to the url's own last segment for direct links.
 */
export const viewUrlFileName = (url: string): string | undefined => {
	const query = url.split('?')[1]
	const key = query ? new URLSearchParams(query).get('key') : null
	return (key ?? url.split('?')[0]!).split('/').pop() || undefined
}
