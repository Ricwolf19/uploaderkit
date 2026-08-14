/**
 * uploaderkit/ui — styled, opt-in presentation layer.
 *
 * Two skins over the same machine: `Uploader` (one zone, one or many files)
 * and `SlottedUploader` (named slots, one file each). Register the package's
 * classes with Tailwind v4 by importing
 * `uploaderkit/tailwind.css` from the app's CSS entry.
 */

export { cn } from './ui/cn'
export { ConfirmDialog, type ConfirmDialogProps } from './ui/ConfirmDialog'
export { Dropzone, type DropzoneProps } from './ui/Dropzone'
export { FileItem, type FileItemProps } from './ui/FileItem'
export {
	FileViewer,
	type FileViewerProps,
	type ViewableFile,
} from './ui/FileViewer'
export {
	SlottedUploader,
	type SlottedUploaderProps,
} from './ui/SlottedUploader'
export { Uploader, type UploaderProps } from './ui/Uploader'
export {
	useFileViewer,
	type UseFileViewerOptions,
	type UseFileViewerReturn,
} from './ui/useFileViewer'
