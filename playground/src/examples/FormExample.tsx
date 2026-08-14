import { type FormEvent, useState } from 'react'
import type { StoredFile } from 'uploaderkit'
import { useUploader } from 'uploaderkit/react'
import { Dropzone, FileItem } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1200 })

/**
 * `uploadOn: 'manual'` — the file does NOT travel on selection. It waits in
 * `idle` until the form validates and submits, so the document and the rest
 * of the fields commit as one action. `onUploadStart` marks the moment the
 * batch actually leaves.
 */
export const FormExample = () => {
	const [name, setName] = useState('')
	const [events, setEvents] = useState<string[]>([])
	const [saved, setSaved] = useState<StoredFile[]>([])
	const log = (line: string) =>
		setEvents(previous => [
			...previous,
			`${new Date().toLocaleTimeString()} — ${line}`,
		])

	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-document',
		entityId: 'form',
		strategy,
		uploadOn: 'manual',
		onUploadStart: files =>
			log(`upload disparado con ${files.length} archivo(s)`),
		onUploaded: stored => {
			setSaved(stored)
			log('el servidor confirmó la subida')
		},
	})

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (!name.trim() || !uploader.hasPending) return
		log('submit del formulario')
		await uploader.upload()
	}

	const canSubmit =
		name.trim().length > 0 && uploader.hasPending && !uploader.isUploading

	return (
		<DemoSplit
			main={
				<form onSubmit={onSubmit} className='space-y-4'>
					<DemoCard title='Nuevo registro'>
						<div className='space-y-4'>
							<label className='block'>
								<span className='text-sm font-medium text-slate-700'>
									Nombre
								</span>
								<input
									value={name}
									onChange={event => setName(event.target.value)}
									placeholder='Requerido antes de poder enviar'
									className='mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none'
								/>
							</label>

							{uploader.files.map(file => (
								<FileItem
									key={file.id}
									file={file}
									onRemove={() => uploader.removeFile(file.id)}
									onAbort={() => uploader.abort(file.id)}
								/>
							))}

							<Dropzone
								accept={uploader.accept}
								onFiles={files => void uploader.addFiles(files)}
							>
								<p className='text-sm text-slate-600'>
									Adjunta el documento — se sube hasta el submit
								</p>
							</Dropzone>

							<button
								type='submit'
								disabled={!canSubmit}
								className='w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/30 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none'
							>
								{uploader.isUploading ? 'Enviando…' : 'Guardar registro'}
							</button>
						</div>
					</DemoCard>
				</form>
			}
			aside={
				events.length > 0 || saved.length > 0 ? (
					<>
						{events.length > 0 && (
							<ol className='animate-ui-fade-in space-y-1.5 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs text-slate-600 backdrop-blur-sm'>
								{events.map((line, index) => (
									<li key={index} className='flex items-center gap-2'>
										<span className='h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400' />
										{line}
									</li>
								))}
							</ol>
						)}
						{saved.length > 0 && (
							<ResultPanel
								label='payload del submit'
								data={{ name, file: saved[0]?.key }}
							/>
						)}
					</>
				) : undefined
			}
		/>
	)
}
