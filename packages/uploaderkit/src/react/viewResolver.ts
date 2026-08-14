export type BlobUrlResolverOptions = {
	/** Prefix for app-relative urls (`/storage/...`) — usually the api origin. */
	baseUrl: string
	/** Evaluated per request, so a rotating JWT is read at fetch time. */
	headers?: () => Record<string, string>
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
	({ baseUrl, headers }: BlobUrlResolverOptions) =>
	async (file: { url: string }): Promise<string> => {
		if (!file.url.startsWith('/')) return file.url

		const response = await fetch(`${baseUrl.replace(/\/$/, '')}${file.url}`, {
			headers: headers?.(),
		})
		if (!response.ok) {
			throw new Error('No se pudo cargar el archivo')
		}
		return URL.createObjectURL(await response.blob())
	}

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
