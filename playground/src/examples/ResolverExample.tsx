import { useState } from 'react'
import { createBlobUrlResolver, createBytesResolver } from 'uploaderkit/react'
import { FileViewer, type ViewableFile } from 'uploaderkit/ui'

import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

/** Stands in for the app's api origin; nothing here leaves the browser. */
const BASE_URL = 'https://api.example.com'

const AUTH_HEADERS = () => ({ Authorization: 'Bearer demo-token' })

/**
 * Two files that exercise both halves of the rule: one served by the app's own
 * `/storage/.../view` route, one public and absolute.
 */
const FILES: ViewableFile[] = [
	{
		url: '/storage/demo-doc/1/view?key=Demos%2F1%2Fmanual.pdf',
		fileName: 'manual.pdf',
		mimeType: 'application/pdf',
	},
	{
		url: 'https://storage.googleapis.com/demo-public/portada.png',
		fileName: 'portada.png',
		mimeType: 'image/png',
	},
	// Deliberately unreachable: the url resolves, the object does not exist.
	{
		url: 'https://storage.googleapis.com/demo-public/no-existe.png',
		fileName: 'no-existe.png',
		mimeType: 'image/png',
	},
]

/** What a resolver decided, so the difference is visible without a network tab. */
type Decision = {
	file: string
	requestedUrl: string
	sentHeaders: string
}

const decide = (file: ViewableFile): Decision => {
	const isAppHosted = file.url.startsWith('/')
	return {
		file: file.fileName ?? file.url,
		requestedUrl: isAppHosted ? `${BASE_URL}${file.url}` : file.url,
		sentHeaders: isAppHosted
			? 'Authorization: Bearer demo-token'
			: '— (ninguno)',
	}
}

/**
 * The read helpers side by side. `createBlobUrlResolver` ends in an object URL
 * for the viewer; `createBytesResolver` ends in a `Uint8Array` for code that
 * processes the file. Both route through the same rule, shown here as a table:
 * an app-relative url is ours and travels with the app's headers, an absolute
 * one is already reachable and is fetched bare.
 */
export const ResolverExample = () => {
	const [viewing, setViewing] = useState<ViewableFile | null>(null)
	const [bytes, setBytes] = useState<string>()

	const resolveUrl = createBlobUrlResolver({
		baseUrl: BASE_URL,
		headers: AUTH_HEADERS,
	})
	const resolveBytes = createBytesResolver({
		baseUrl: BASE_URL,
		headers: AUTH_HEADERS,
	})

	const readBytes = async (file: ViewableFile) => {
		try {
			const data = await resolveBytes(file.url)
			setBytes(`${file.fileName}: ${data.byteLength} bytes`)
		} catch (error) {
			// The demo host does not exist, which is the point: the failure
			// proves the request was attempted at the resolved url.
			setBytes(
				`${file.fileName}: ${error instanceof Error ? error.message : 'falló'}`
			)
		}
	}

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Resolvers de lectura'>
						<div className='space-y-3'>
							{FILES.map(file => (
								<div
									key={file.url}
									className='rounded-xl border border-slate-200 p-3'
								>
									<p className='text-sm font-medium text-slate-800'>
										{file.fileName}
									</p>
									<p className='mt-0.5 truncate font-mono text-xs text-slate-500'>
										{file.url}
									</p>
									<div className='mt-2 flex gap-2'>
										<button
											type='button'
											onClick={() => setViewing(file)}
											className='rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-85'
										>
											Ver (object URL)
										</button>
										<button
											type='button'
											onClick={() => void readBytes(file)}
											className='rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50'
										>
											Leer bytes
										</button>
									</div>
								</div>
							))}
						</div>
					</DemoCard>

					<Hint>
						Una url que empieza con <code>/</code> es nuestra: se le antepone el{' '}
						<code>baseUrl</code> y viaja con los headers de la app. Una absoluta
						ya es alcanzable y se pide desnuda — mandarle el JWT a un host ajeno
						sería filtrarlo. Los dos resolvers comparten esa decisión; solo
						difieren en el formato de salida.
					</Hint>

					<Hint>
						El visor trae <strong>Descargar</strong> junto a «Abrir en pestaña»,
						con <kbd>D</kbd> y <kbd>O</kbd> anunciados en el propio botón. En
						touch las tres acciones se vuelven glifos — el título más tres
						etiquetas no cabe en un teléfono.
					</Hint>
				</>
			}
			aside={
				<ResultPanel
					label={bytes ? `Bytes · ${bytes}` : 'Decisión por archivo'}
					data={FILES.map(decide)}
				/>
			}
		>
			<FileViewer
				file={viewing}
				files={FILES}
				resolveUrl={resolveUrl}
				onClose={() => setViewing(null)}
			/>
		</DemoSplit>
	)
}
