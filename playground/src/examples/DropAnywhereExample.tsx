import { useCallback } from 'react'
import { DropAnywhereOverlay, useDropAnywhere } from 'uploaderkit/presets'
import { useUploader } from 'uploaderkit/react'
import { FileItem } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1600 })

/**
 * The drop-anywhere recipe, now two imports: `useDropAnywhere` watches the
 * window and delivers each drop exactly once, `DropAnywhereOverlay` draws the
 * invitation while a drag is alive.
 */
export const DropAnywhereExample = () => {
	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-image',
		entityId: 'anywhere',
		strategy,
		multiple: true,
		uploadOn: 'select',
	})
	const onFiles = useCallback(
		(files: File[]) => void uploader.addFiles(files),
		[uploader]
	)
	const { dragging } = useDropAnywhere({ onFiles, accept: uploader.accept })

	const stored = uploader.files
		.filter(file => file.stored)
		.map(file => file.stored!)

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Suelta donde sea'>
						<div className='flex flex-col items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 py-10 text-center'>
							<span className='text-4xl'>🗂️</span>
							<p className='text-sm font-medium text-slate-700'>
								Arrastra una imagen sobre <em>cualquier parte</em> de la página
							</p>
							<p className='text-xs text-slate-500'>
								No hay dropzone: el overlay aparece cuando el drag entra a la
								ventana
							</p>
						</div>

						{uploader.files.map(file => (
							<FileItem
								key={file.id}
								file={file}
								onRemove={() => uploader.removeFile(file.id)}
								onAbort={() => uploader.abort(file.id)}
							/>
						))}
					</DemoCard>

					<Hint>
						<code>useDropAnywhere</code> lleva el contador de profundidad a
						nivel window y es el <strong>único</strong> que maneja{' '}
						<code>drop</code>; el overlay es <code>pointer-events-none</code>,
						así que un archivo nunca llega dos veces. <code>accept</code> filtra
						con la misma sintaxis que un <code>&lt;input&gt;</code>.
					</Hint>
				</>
			}
			aside={
				stored.length > 0 ? (
					<ResultPanel
						label={`StoredFile[] · ${stored.length}`}
						data={stored.map(item => item.key)}
					/>
				) : undefined
			}
		>
			<DropAnywhereOverlay open={dragging} />
		</DemoSplit>
	)
}
