import { useState } from 'react'
import { useUploader } from 'uploaderkit/react'
import { Dropzone, FileViewer, type ViewableFile } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1800 })

/**
 * The gallery recipe: a thumbnail grid over the headless hook. Each tile is
 * the file's own preview; hover reveals the actions, the progress washes over
 * the tile while it uploads, and a click opens the full-screen viewer.
 */
export const GalleryExample = () => {
	const [viewing, setViewing] = useState<ViewableFile | null>(null)
	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-image',
		entityId: 'gallery',
		strategy,
		multiple: true,
		uploadOn: 'select',
	})

	const stored = uploader.files
		.filter(file => file.stored)
		.map(file => file.stored!)

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Galería del producto'>
						<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
							{uploader.files.map(file => (
								<div
									key={file.id}
									className='group animate-ui-fade-in relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-shadow duration-200 hover:shadow-md'
								>
									{file.preview && (
										<img
											src={file.preview}
											alt={file.file.name}
											className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
										/>
									)}

									{/* Upload wash: darkens while travelling, clears on success. */}
									{file.status === 'uploading' && (
										<div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-[2px]'>
											<span className='text-sm font-semibold text-white'>
												{file.progress}%
											</span>
											<div className='h-1 w-2/3 overflow-hidden rounded-full bg-white/30'>
												<div
													className='h-full bg-white transition-all duration-150'
													style={{ width: `${file.progress}%` }}
												/>
											</div>
										</div>
									)}

									{file.status === 'error' && (
										<div className='absolute inset-0 flex items-center justify-center bg-red-900/60 p-2 backdrop-blur-[2px]'>
											<p className='text-center text-[11px] leading-tight text-white'>
												{file.error}
											</p>
										</div>
									)}

									{/* Actions stay hidden until hover, over a scrim. */}
									{file.status === 'success' && (
										<div className='absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
											<button
												type='button'
												onClick={() => file.stored && setViewing(file.stored)}
												className='rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-800 shadow-sm backdrop-blur-sm transition-colors hover:bg-white'
											>
												Ver
											</button>
											<button
												type='button'
												onClick={() => uploader.removeFile(file.id)}
												className='rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-red-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white'
											>
												Quitar
											</button>
										</div>
									)}
								</div>
							))}

							{/* The add tile IS the dropzone, kept square with the grid. */}
							<Dropzone
								accept={uploader.accept}
								multiple
								size='sm'
								onFiles={files => void uploader.addFiles(files)}
								className='flex aspect-square flex-col items-center justify-center'
							>
								<span className='text-3xl leading-none font-light text-slate-400'>
									+
								</span>
								<span className='mt-1 text-xs text-slate-500'>Agregar</span>
							</Dropzone>
						</div>
					</DemoCard>

					<Hint>
						Cada tile usa <code>files[i].preview</code> — la imagen se ve al
						instante, antes de que el byte uno viaje. Abre una y navega con las
						flechas <kbd>←</kbd> <kbd>→</kbd>: el visor recibe la colección
						completa.
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
			<FileViewer
				file={viewing}
				files={stored}
				onClose={() => setViewing(null)}
			/>
		</DemoSplit>
	)
}
