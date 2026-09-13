/**
 * Every user-facing string the package renders, so no copy is hardcoded
 * inside a component and apps translate or reword without forking.
 *
 * English is the default so the kit ships globalized; `ES_LABELS` ships for
 * Spanish apps, selected once through `UploaderProvider language='es'`. Hooks
 * take `labels` in their options, components as a prop — always a `Partial`,
 * merged over the provider's base.
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
	/**
	 * Suffix on a row holding a picked file that has NOT been sent yet.
	 * Distinct from {@link UploaderLabels.ready}, which means the server
	 * confirmed it — two states, two strings.
	 */
	staged: string
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
	/** The request never reached the server — offline, DNS, CORS preflight. */
	uploadNetworkFailed: string
	/** Message when the DELETE transport refused or failed. */
	removeFailed: string
	/** A stored file could not be fetched for preview or for bytes. */
	readFailed: string
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
	/** Second line of the error panel — what the reader can do about it. */
	viewerErrorHint: string
	/** Viewer: button that retries the resolution. */
	viewerRetry: string
	/** Viewer: open the file in a browser tab. */
	openInTab: string
	/** Header action; the long `download` names a file, this labels a button. */
	downloadShort: string
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
	/** `DropAnywhereOverlay` heading while a drag is over the window. */
	dropAnywhereTitle: string
	/** `DropAnywhereOverlay` second line. */
	dropAnywhereHint: string
	/** `AvatarUploader`: hover label and aria-label of the picture. */
	avatarChange: string
	/** `AvatarUploader`: overlay while a file hovers the picture. */
	avatarDropHere: string
	/** `AvatarUploader`: the remove link under the picture. */
	avatarRemove: string
	/** `GalleryUploader`: caption of the add tile. */
	galleryAdd: string

	// Validation — `validateFile` and everything that calls it. These run on
	// BOTH sides: the browser shows them, the server answers them as JSON.
	/** A name the extension check cannot read at all. */
	fileHasNoExtension: string
	/** The extension is not on the scope's list. Receives that list. */
	formatNotAllowed: (extensions: string[]) => string
	/** Zero bytes — a failed drag, a cancelled save. */
	fileIsEmpty: string
	/** Over the scope ceiling. Receives both sizes already formatted. */
	fileTooLarge: (size: string, max: string) => string
	/** Fewer bytes than the signature needs: a truncated transfer. */
	fileIncomplete: string
	/** The leading bytes contradict the extension — renamed, or corrupt. */
	contentDoesNotMatchExtension: string

	// Server — the HTTP surface. `createStorage` and both framework adapters
	// resolve the same object, so one `labels` wires the whole round trip.
	/** 400: a route parameter or body field the handler needs is missing. */
	requestIncomplete: string
	/** 401: `getUser` answered null. */
	unauthorized: string
	/** 400: an upload arrived with no file part. */
	fileRequired: string
	/** 404: the URL named a scope the registry does not declare. */
	unknownScope: string
	/** 500: the catch-all when a handler throws something unrecognized. */
	processingFailed: string
	/** Download name for a key that ends in nothing usable. */
	unnamedFile: string
}

/** Spanish copy — select it once: `<UploaderProvider language='es'>`. */
export const ES_LABELS: UploaderLabels = {
	dropPrompt: 'Selecciona un archivo o arrástralo aquí',
	tapPrompt: 'Toca para elegir un archivo',
	bulkDropPrompt: 'Arrastra varios archivos — cada uno cae en su documento',
	bulkTapPrompt: 'Toca para agregar varios archivos',
	uploadAll: 'Subir archivos',
	view: 'Ver',
	remove: 'Quitar',
	cancel: 'Cancelar',
	ready: 'Listo',
	staged: 'Listo para subir',
	upload: 'Subir',
	replace: 'Reemplazar',
	dropToReplace: 'Suelta para reemplazar',
	previous: 'Anterior',
	next: 'Siguiente',
	uploadFailed: 'No se pudo subir el archivo',
	uploadNetworkFailed: 'No se pudo subir el archivo. Revisa tu conexión',
	removeFailed: 'No se pudo borrar el archivo del almacenamiento',
	readFailed: 'No se pudo cargar el archivo',
	maxFilesReached: max => `Máximo ${max} archivo(s)`,
	slotFormatNotAllowed: (slotLabel, extensions) =>
		`${slotLabel}: formato no permitido. Se aceptan: ${extensions.join(', ')}`,
	fileWithoutSlot: fileName =>
		`"${fileName}" no corresponde a ningún documento`,
	viewerLoading: 'Cargando…',
	viewerError: 'No se pudo cargar la vista previa',
	viewerErrorHint:
		'El archivo puede haberse movido o el enlace expiró. Puedes reintentar o descargarlo.',
	viewerRetry: 'Reintentar',
	openInTab: 'Abrir en pestaña',
	downloadShort: 'Descargar',
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
	dropAnywhereTitle: 'Suelta los archivos aquí',
	dropAnywhereHint: 'Cualquier lugar de la pantalla cuenta',
	avatarChange: 'Cambiar foto',
	avatarDropHere: 'Suelta aquí',
	avatarRemove: 'Quitar foto',
	galleryAdd: 'Agregar',

	fileHasNoExtension: 'El archivo no tiene extensión',
	formatNotAllowed: extensions =>
		`Formato no permitido. Se aceptan: ${extensions.join(', ')}`,
	fileIsEmpty: 'El archivo está vacío',
	fileTooLarge: (size, max) => `El archivo pesa ${size} y el máximo es ${max}`,
	fileIncomplete: 'El archivo está incompleto',
	contentDoesNotMatchExtension:
		'El contenido del archivo no corresponde a su extensión',

	requestIncomplete: 'Solicitud incompleta',
	unauthorized: 'No autorizado',
	fileRequired: 'Archivo requerido',
	unknownScope: 'Destino de archivo no válido',
	processingFailed: 'No se pudo procesar el archivo',
	unnamedFile: 'archivo',
}

/** English copy — the package default, so the kit ships globalized. */
export const DEFAULT_LABELS: UploaderLabels = {
	dropPrompt: 'Choose a file or drag it here',
	tapPrompt: 'Tap to choose a file',
	bulkDropPrompt: 'Drop several files — each lands on its document',
	bulkTapPrompt: 'Tap to add several files',
	uploadAll: 'Upload files',
	view: 'View',
	remove: 'Remove',
	cancel: 'Cancel',
	ready: 'Done',
	staged: 'Ready to upload',
	upload: 'Upload',
	replace: 'Replace',
	dropToReplace: 'Drop to replace',
	previous: 'Previous',
	next: 'Next',
	uploadFailed: 'The file could not be uploaded',
	uploadNetworkFailed: 'The file could not be uploaded. Check your connection',
	removeFailed: 'The file could not be removed from storage',
	readFailed: 'The file could not be loaded',
	maxFilesReached: max => `At most ${max} file(s)`,
	slotFormatNotAllowed: (slotLabel, extensions) =>
		`${slotLabel}: format not allowed. Accepted: ${extensions.join(', ')}`,
	fileWithoutSlot: fileName => `"${fileName}" does not match any document`,
	viewerLoading: 'Loading…',
	viewerError: 'The preview could not be loaded',
	viewerErrorHint:
		'The file may have moved or the link expired. You can retry or download it.',
	viewerRetry: 'Retry',
	openInTab: 'Open in tab',
	downloadShort: 'Download',
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
	dropAnywhereTitle: 'Drop the files here',
	dropAnywhereHint: 'Anywhere on the screen counts',
	avatarChange: 'Change photo',
	avatarDropHere: 'Drop here',
	avatarRemove: 'Remove photo',
	galleryAdd: 'Add',

	fileHasNoExtension: 'The file has no extension',
	formatNotAllowed: extensions =>
		`Format not allowed. Accepted: ${extensions.join(', ')}`,
	fileIsEmpty: 'The file is empty',
	fileTooLarge: (size, max) =>
		`The file weighs ${size} and the maximum is ${max}`,
	fileIncomplete: 'The file is incomplete',
	contentDoesNotMatchExtension: 'The file contents do not match its extension',

	requestIncomplete: 'Incomplete request',
	unauthorized: 'Unauthorized',
	fileRequired: 'A file is required',
	unknownScope: 'Unknown file destination',
	processingFailed: 'The file could not be processed',
	unnamedFile: 'file',
}

/** The merge every entry point runs: partial overrides over the default. */
export const resolveLabels = (
	labels?: Partial<UploaderLabels>,
	base: UploaderLabels = DEFAULT_LABELS
): UploaderLabels => (labels ? { ...base, ...labels } : base)

/**
 * @deprecated English IS {@link DEFAULT_LABELS} now. A shallow copy, kept so
 * 1.x consumers passing it keep working.
 */
export const EN_LABELS: UploaderLabels = { ...DEFAULT_LABELS }
