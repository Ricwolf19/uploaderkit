import { type DragEvent, useRef, useState } from 'react'
import { useUploader } from 'uploaderkit/react'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1400 })

/**
 * The avatar recipe: the headless hook drives a circular preview that is both
 * a button and a drop target. While an upload runs the circle locks (no
 * double-fire) and a tooltip says why. The scope's `compress` downscales to
 * 512px and `overwrite: true` keeps one stable key per user.
 */
export const AvatarExample = () => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [savedUrl, setSavedUrl] = useState<string | null>(null)
	const [dropping, setDropping] = useState(false)
	// Depth counter — see the package's Dropzone.
	const depth = useRef(0)

	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-avatar',
		entityId: 'user-42',
		strategy,
		uploadOn: 'select',
		onUploaded: stored => setSavedUrl(stored[0]?.url ?? null),
	})

	const current = uploader.files[0]
	const uploading = current?.status === 'uploading'
	const shown = current?.preview ?? savedUrl

	const onDrop = (event: DragEvent) => {
		event.preventDefault()
		depth.current = 0
		setDropping(false)
		if (uploading) return
		const file = event.dataTransfer.files[0]
		if (file) void uploader.addFiles([file])
	}

	return (
		<DemoSplit
			main={
				<>
					<DemoCard title='Foto de perfil'>
						<div className='flex items-center gap-5'>
							<button
								type='button'
								onClick={() => !uploading && inputRef.current?.click()}
								onDragEnter={() => {
									depth.current += 1
									if (!uploading) setDropping(true)
								}}
								onDragOver={event => event.preventDefault()}
								onDragLeave={() => {
									depth.current = Math.max(0, depth.current - 1)
									if (depth.current === 0) setDropping(false)
								}}
								onDrop={onDrop}
								disabled={uploading}
								title={uploading ? 'Subiendo tu foto…' : 'Cambiar foto'}
								aria-busy={uploading}
								className={
									uploading
										? 'relative h-24 w-24 shrink-0 cursor-not-allowed overflow-hidden rounded-full ring-2 ring-blue-300 ring-offset-2 outline-none'
										: dropping
											? 'relative h-24 w-24 shrink-0 cursor-copy overflow-hidden rounded-full ring-4 ring-blue-400 ring-offset-2 transition-all duration-200 outline-none'
											: 'group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-blue-100 ring-offset-2 transition-all duration-200 outline-none hover:ring-blue-400 focus-visible:ring-blue-400 active:scale-95'
								}
							>
								{shown ? (
									<img
										src={shown}
										alt='Avatar'
										className='h-full w-full object-cover'
									/>
								) : (
									<span className='flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl font-bold text-blue-500'>
										RT
									</span>
								)}

								{/* One overlay per state: drop invite, progress, hover. */}
								{dropping ? (
									<span className='absolute inset-0 flex items-center justify-center bg-blue-600/60 text-xs font-semibold text-white backdrop-blur-[1px]'>
										Suelta aquí
									</span>
								) : uploading ? (
									<span className='absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white'>
										{current.progress}%
									</span>
								) : (
									<span className='absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
										Cambiar
									</span>
								)}

								{/* Progress ring while in flight. */}
								{uploading && (
									<svg
										viewBox='0 0 100 100'
										className='absolute inset-0 h-full w-full -rotate-90'
										aria-hidden
									>
										<circle
											cx='50'
											cy='50'
											r='46'
											fill='none'
											strokeWidth='6'
											className='stroke-white/30'
										/>
										<circle
											cx='50'
											cy='50'
											r='46'
											fill='none'
											strokeWidth='6'
											strokeLinecap='round'
											className='stroke-blue-400 transition-[stroke-dashoffset] duration-150'
											strokeDasharray={2 * Math.PI * 46}
											strokeDashoffset={
												2 * Math.PI * 46 * (1 - current.progress / 100)
											}
										/>
									</svg>
								)}
							</button>

							<div className='min-w-0'>
								<p className='text-sm font-medium text-slate-800'>
									Ricardo Tapia
								</p>
								<p className='text-xs text-slate-500'>
									Toca la foto o <strong>suelta una imagen encima</strong> · se
									comprime a 512px y reemplaza la anterior
								</p>
								{uploading && (
									<p className='mt-1 text-xs text-blue-600'>
										Subiendo… el círculo se libera al terminar.
									</p>
								)}
								{current?.status === 'error' && (
									<p className='mt-1 text-xs text-red-600'>{current.error}</p>
								)}
							</div>

							<input
								ref={inputRef}
								type='file'
								accept={uploader.accept}
								className='hidden'
								onChange={event => {
									if (event.target.files)
										void uploader.addFiles(event.target.files)
									event.target.value = ''
								}}
							/>
						</div>
					</DemoCard>

					<Hint>
						Cero <code>Dropzone</code>: el hook headless + un botón circular que
						también es drop target. Mientras sube queda deshabilitado — un
						segundo click no dispara nada y el tooltip lo explica.
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
