/**
 * uploaderkit/presets — the recipes, as components.
 *
 * Compositions of `./react` + `./ui` that kept being rebuilt by hand in every
 * app: the whole window as a drop target, a picture that is its own control,
 * a thumbnail grid. Each is one import away and themed by the same `--color-ui-*`
 * tokens; when a preset does not fit, `useUploader` + `Dropzone` + `FileItem`
 * are still there.
 */

export {
	AvatarUploader,
	type AvatarUploaderProps,
} from './presets/AvatarUploader'
export {
	DropAnywhereOverlay,
	type DropAnywhereOverlayProps,
} from './presets/DropAnywhereOverlay'
export {
	GalleryUploader,
	type GalleryUploaderProps,
} from './presets/GalleryUploader'
export {
	type DropAnywhere,
	useDropAnywhere,
	type UseDropAnywhereOptions,
} from './presets/useDropAnywhere'
