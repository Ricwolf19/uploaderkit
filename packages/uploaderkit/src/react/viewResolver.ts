export type BlobUrlResolverOptions = {
	/** Prefix for app-relative urls (`/storage/...`) — usually the api origin. */
	baseUrl: string
	/** Evaluated per request, so a rotating JWT is read at fetch time. */
	headers?: () => Record<string, string>
}

/**
 * The one rule both resolvers follow — a change to the `/view` shape lands
 * here, not once per output format.
 *
 * @see AGENTS.md §3 — why absolute urls must never carry the app's headers
 */
const fetchStored = async (
	url: string,
	{ baseUrl, headers }: BlobUrlResolverOptions
): Promise<Response> => {
	const response = await fetch(
		url.startsWith('/') ? `${baseUrl.replace(/\/$/, '')}${url}` : url,
		url.startsWith('/') ? { headers: headers?.() } : undefined
	)
	if (!response.ok) {
		throw new Error('No se pudo cargar el archivo')
	}
	return response
}

/**
 * `resolveUrl` for the FileViewer over authenticated endpoints. An `<img>` or
 * `<iframe>` cannot send an Authorization header, so protected content (the
 * decrypting `/view` route of encrypted scopes) is fetched here with the
 * app's headers and handed to the viewer as an object URL.
 *
 * Absolute urls pass through untouched — public objects and legacy hosts
 * render directly. The viewer revokes the object URL when it closes.
 */
export const createBlobUrlResolver =
	(options: BlobUrlResolverOptions) =>
	async (file: { url: string }): Promise<string> => {
		if (!file.url.startsWith('/')) return file.url
		return URL.createObjectURL(
			await (await fetchStored(file.url, options)).blob()
		)
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
