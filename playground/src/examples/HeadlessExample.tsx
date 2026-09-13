import { useRef } from 'react'
import { formatFileSize } from 'uploaderkit'
import { useUploader } from 'uploaderkit/react'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 2200 })

/**
 * No `/ui` at all: the hook drives a completely custom interface — the proof
 * that an app with its own design system loses nothing. Manual `upload()`
 * with uploadOn manual, per-file progress ring, abort button.
 */
export const HeadlessExample = () => {
	const inputRef = useRef<HTMLInputElement>(null)
	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-image',
		entityId: 'headless',
		strategy,
		multiple: true,
	})

	return (
		<div className='mx-auto w-full max-w-lg space-y-4'>
			<DemoCard>
				<div className='flex items-center gap-2'>
					<input
						ref={inputRef}
						type='file'
						accept={uploader.accept}
						multiple
						className='hidden'
						onChange={event => {
							if (event.target.files) void uploader.addFiles(event.target.files)
							event.target.value = ''
						}}
					/>
					<button
						type='button'
						onClick={() => inputRef.current?.click()}
						className='rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700'
					>
						Elegir imágenes
					</button>
					<button
						type='button'
						onClick={() => void uploader.upload()}
						disabled={uploader.isUploading}
						className='rounded-full border border-violet-600 px-4 py-2 text-sm font-medium text-violet-600 disabled:opacity-40'
					>
						Subir todo
					</button>
					{uploader.isUploading && (
						<button
							type='button'
							onClick={() => uploader.abort()}
							className='text-sm text-red-500 hover:underline'
						>
							Cancelar todo
						</button>
					)}
				</div>

				<ul className='space-y-1'>
					{uploader.files.map(file => (
						<li
							key={file.id}
							className='flex items-center gap-3 rounded-xl bg-violet-50 px-3 py-2 text-sm'
						>
							<span
								className='grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white'
								style={{
									background: `conic-gradient(#7c3aed ${file.progress * 3.6}deg, #ddd6fe 0deg)`,
								}}
							>
								{file.status === 'success' ? '✓' : `${file.progress}`}
							</span>
							<span className='min-w-0 flex-1 truncate'>{file.file.name}</span>
							<span className='text-xs text-gray-400'>
								{formatFileSize(file.file.size)}
							</span>
							<button
								type='button'
								onClick={() => uploader.removeFile(file.id)}
								className='text-xs text-gray-400 hover:text-red-500'
							>
								✕
							</button>
						</li>
					))}
				</ul>
			</DemoCard>
		</div>
	)
}
