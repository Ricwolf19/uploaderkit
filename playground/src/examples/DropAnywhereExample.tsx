import { type DragEvent as ReactDragEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUploader } from 'uploaderkit/react'
import { FileItem } from 'uploaderkit/ui'

import { createFakeStrategy } from '../fakeStrategy'
import { demoScopes } from '../scopes'
import { DemoCard, DemoSplit, Hint, ResultPanel } from '../shell/ui'

const strategy = createFakeStrategy({ duration: 1600 })

/**
 * The drop-anywhere recipe: the whole page is the target. A window-level drag
 * counter raises a full-screen glass overlay; dropping anywhere routes the
 * files into the uploader.
 */
export const DropAnywhereExample = () => {
	const [draggingOver, setDraggingOver] = useState(false)
	const uploader = useUploader({
		scopes: demoScopes,
		scope: 'demo-image',
		entityId: 'anywhere',
		strategy,
		multiple: true,
		uploadOn: 'select',
	})

	useEffect(() => {
		// Depth counter — same reason as the package's Dropzone.
		let depth = 0
		const onEnter = (event: globalThis.DragEvent) => {
			if (!event.dataTransfer?.types.includes('Files')) return
			depth += 1
			setDraggingOver(true)
		}
		const onLeave = () => {
			depth = Math.max(0, depth - 1)
			if (depth === 0) setDraggingOver(false)
		}
		const onOver = (event: globalThis.DragEvent) => event.preventDefault()
		const onDrop = () => {
			depth = 0
			setDraggingOver(false)
		}
		window.addEventListener('dragenter', onEnter)
		window.addEventListener('dragleave', onLeave)
		window.addEventListener('dragover', onOver)
		window.addEventListener('drop', onDrop)
		return () => {
			window.removeEventListener('dragenter', onEnter)
			window.removeEventListener('dragleave', onLeave)
			window.removeEventListener('dragover', onOver)
			window.removeEventListener('drop', onDrop)
		}
	}, [])

	const onOverlayDrop = (event: ReactDragEvent) => {
		event.preventDefault()
		setDraggingOver(false)
		if (event.dataTransfer.files.length > 0) {
			void uploader.addFiles(event.dataTransfer.files)
		}
	}

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
						El truco es un <strong>contador de profundidad</strong> en
						<code> dragenter/dragleave</code> a nivel window — un boolean
						parpadea al cruzar hijos. El overlay portalea a{' '}
						<code>document.body</code> y solo existe mientras el drag vive.
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
			{draggingOver &&
				createPortal(
					<div
						onDrop={onOverlayDrop}
						onDragOver={event => event.preventDefault()}
						className='animate-ui-fade-in fixed inset-0 z-1000 flex items-center justify-center bg-blue-600/20 p-6 backdrop-blur-sm'
					>
						<div className='pointer-events-none flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-blue-400 bg-white/90 px-12 py-10 shadow-2xl backdrop-blur-md'>
							<span className='text-5xl'>📥</span>
							<p className='text-lg font-semibold text-slate-800'>
								Suelta los archivos
							</p>
							<p className='text-sm text-slate-500'>
								Cualquier lugar de la pantalla cuenta
							</p>
						</div>
					</div>,
					document.body
				)}
		</DemoSplit>
	)
}
