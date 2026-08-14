import { useState } from 'react'
import { formatFileSize } from 'uploaderkit'
import { useUploader } from 'uploaderkit/react'
import { Dropzone } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 900 })

/**
 * The `compress` pipeline: the avatar scope downscales to 512px and
 * re-encodes at 0.75 — the strategy receives the trimmed file, and EXIF
 * (GPS, camera) is dropped in the process. Compare both sizes below.
 */
export const CompressionExample = () => {
	const [result, setResult] = useState<{ original: number; sent: number }>()

	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-avatar',
		entityId: 'compress',
		strategy: async (file, scope, entityId, options) => {
			const stored = await strategy(file, scope, entityId, options)
			setResult(previous => ({
				original: previous?.original ?? 0,
				sent: file.size,
			}))
			return stored
		},
		uploadOn: 'select',
		onError: message => alert(message),
	})

	const current = uploader.files[0]
	const saving =
		result && result.sent > 0
			? Math.max(0, Math.round((1 - result.sent / result.original) * 100))
			: null

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Antes y después'>
						<Dropzone
							accept={uploader.accept}
							onFiles={files => {
								setResult({ original: files[0]!.size, sent: 0 })
								void uploader.addFiles(files)
							}}
						>
							<p className='text-sm text-slate-600'>
								Suelta una foto grande (idealmente de cámara)
							</p>
						</Dropzone>

						{current?.preview && (
							<div className='flex items-center gap-4'>
								<img
									src={current.preview}
									alt=''
									className='animate-ui-fade-in h-28 w-28 rounded-xl object-cover shadow-md ring-1 ring-slate-200'
								/>
								{saving !== null && (
									<div className='animate-ui-fade-in space-y-1'>
										<p className='text-sm text-slate-600'>
											Original:{' '}
											<strong className='text-slate-800'>
												{formatFileSize(result!.original)}
											</strong>
										</p>
										<p className='text-sm text-slate-600'>
											Enviado:{' '}
											<strong className='text-slate-800'>
												{formatFileSize(result!.sent)}
											</strong>
										</p>
										<p className='inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700'>
											−{saving}% de peso
										</p>
									</div>
								)}
							</div>
						)}
					</DemoCard>

					<Hint>
						La re-codificación por canvas elimina el EXIF: el GPS de la foto
						nunca sale del dispositivo. Si comprimir no ayuda (ya era chica), el
						archivo original pasa intacto.
					</Hint>
				</>
			}
			aside={
				current?.stored ? (
					<ResultPanel label='StoredFile' data={current.stored} />
				) : undefined
			}
		/>
	)
}
