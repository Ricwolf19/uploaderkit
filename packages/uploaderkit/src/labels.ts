/**
 * Every user-facing string the package renders, so no copy is hardcoded
 * inside a component and apps translate or reword without forking.
 *
 * Spanish is the default (AGENTS.md §4.5); `EN_LABELS` ships for apps in
 * English. Hooks take `labels` in their options, components as a prop —
 * always a `Partial`, merged over the default.
 */
export type UploaderLabels = {
	/** Prompt inside the single dropzone of `Uploader` (fine pointers). */
	dropPrompt: string
	/** Same zone on a touch device, where dragging barely exists. */
	tapPrompt: string
	/** Prompt inside the bulk dropzone of `SlottedUploader` (fine pointers). */
	bulkDropPrompt: string
	/** Same bulk zone on a touch device. */
	bulkTapPrompt: string
	/** Button that fires the batch when `uploadOn` is `'manual'`. */
	uploadAll: string
	/** Row action: preview a file. */
	view: string
	/** Row action: forget a file. */
	remove: string
	/** Row action: abort an in-flight upload. */
	cancel: string
	/** Suffix on a row the server confirmed. */
	ready: string
	/** Slot action when the position is empty. */
	upload: string
	/** Slot action when the position is filled. */
	replace: string
	/** Pill shown while a file hovers over a filled slot row. */
	dropToReplace: string
	/** Viewer: aria-label of the previous-image arrow. */
	previous: string
	/** Viewer: aria-label of the next-image arrow. */
	next: string
	/** Fallback when a strategy rejects without a message. */
	uploadFailed: string
	/** A batch past `maxFiles`. Receives the cap. */
	maxFilesReached: (max: number) => string
	/** A file picked for a slot whose extension the slot rejects. */
	slotFormatNotAllowed: (slotLabel: string, extensions: string[]) => string
	/** A bulk-dropped file no slot matched. */
	fileWithoutSlot: (fileName: string) => string
	/** Viewer: while the URL resolves. */
	viewerLoading: string
	/** Viewer: the URL could not be resolved (expired signature, network). */
	viewerError: string
	/** Viewer: button that retries the resolution. */
	viewerRetry: string
	/** Viewer: open the file in a browser tab. */
	openInTab: string
	/** Viewer: close button. */
	close: string
	/** Viewer: formats without an inline preview. */
	noPreview: string
	/** Viewer: download button. Receives the file name. */
	download: (fileName: string) => string
	/** Viewer: fallback title when the file carries no name. */
	filePreview: string
	/** Confirm dialog: affirmative button. */
	confirm: string
	/** Confirm dialog heading before forgetting a file. */
	confirmRemoveTitle: string
	/** Confirm dialog body before forgetting. Receives the file name. */
	confirmRemoveMessage: (fileName: string) => string
	/** Confirm dialog heading before replacing a slot's file. */
	confirmReplaceTitle: string
	/** Confirm dialog body before replacing. Receives current and incoming names. */
	confirmReplaceMessage: (current: string, incoming: string) => string
}

export const DEFAULT_LABELS: UploaderLabels = {
	dropPrompt: 'Selecciona un archivo o arrástralo aquí',
	tapPrompt: 'Toca para elegir un archivo',
	bulkDropPrompt: 'Arrastra varios archivos — cada uno cae en su documento',
	bulkTapPrompt: 'Toca para agregar varios archivos',
	uploadAll: 'Subir archivos',
	view: 'Ver',
	remove: 'Quitar',
	cancel: 'Cancelar',
	ready: 'Listo',
	upload: 'Subir',
	replace: 'Reemplazar',
	dropToReplace: 'Suelta para reemplazar',
	previous: 'Anterior',
	next: 'Siguiente',
	uploadFailed: 'No se pudo subir el archivo',
	maxFilesReached: max => `Máximo ${max} archivo(s)`,
	slotFormatNotAllowed: (slotLabel, extensions) =>
		`${slotLabel}: formato no permitido. Se aceptan: ${extensions.join(', ')}`,
	fileWithoutSlot: fileName =>
		`"${fileName}" no corresponde a ningún documento`,
	viewerLoading: 'Cargando…',
	viewerError: 'No se pudo cargar la vista previa',
	viewerRetry: 'Reintentar',
	openInTab: 'Abrir en pestaña',
	close: 'Cerrar',
	noPreview: 'Este formato no tiene vista previa',
	download: fileName => `Descargar ${fileName}`,
	filePreview: 'Archivo',
	confirm: 'Confirmar',
	confirmRemoveTitle: 'Quitar archivo',
	confirmRemoveMessage: fileName =>
		`¿Quitar "${fileName}"? Podrás subir otro después.`,
	confirmReplaceTitle: 'Reemplazar archivo',
	confirmReplaceMessage: (current, incoming) =>
		`¿Reemplazar "${current}" por "${incoming}"?`,
}

export const EN_LABELS: UploaderLabels = {
	dropPrompt: 'Choose a file or drag it here',
	tapPrompt: 'Tap to choose a file',
	bulkDropPrompt: 'Drop several files — each lands on its document',
	bulkTapPrompt: 'Tap to add several files',
	uploadAll: 'Upload files',
	view: 'View',
	remove: 'Remove',
	cancel: 'Cancel',
	ready: 'Done',
	upload: 'Upload',
	replace: 'Replace',
	dropToReplace: 'Drop to replace',
	previous: 'Previous',
	next: 'Next',
	uploadFailed: 'The file could not be uploaded',
	maxFilesReached: max => `At most ${max} file(s)`,
	slotFormatNotAllowed: (slotLabel, extensions) =>
		`${slotLabel}: format not allowed. Accepted: ${extensions.join(', ')}`,
	fileWithoutSlot: fileName => `"${fileName}" does not match any document`,
	viewerLoading: 'Loading…',
	viewerError: 'The preview could not be loaded',
	viewerRetry: 'Retry',
	openInTab: 'Open in tab',
	close: 'Close',
	noPreview: 'This format has no preview',
	download: fileName => `Download ${fileName}`,
	filePreview: 'File',
	confirm: 'Confirm',
	confirmRemoveTitle: 'Remove file',
	confirmRemoveMessage: fileName =>
		`Remove "${fileName}"? You can upload another one later.`,
	confirmReplaceTitle: 'Replace file',
	confirmReplaceMessage: (current, incoming) =>
		`Replace "${current}" with "${incoming}"?`,
}

/** The merge every entry point runs: partial overrides over the default. */
export const resolveLabels = (
	labels?: Partial<UploaderLabels>
): UploaderLabels =>
	labels ? { ...DEFAULT_LABELS, ...labels } : DEFAULT_LABELS
