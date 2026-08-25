/**
 * uploaderkit/react — headless client layer.
 *
 * State, validation, compression, progress and abort; zero markup. The styled
 * components in `./ui` are skins over these hooks — both uploaders run the
 * same machine, so a behavioral fix lands in every presentation at once.
 */

export { compressImage } from './react/compressImage'
export {
	matchSlotByExtension,
	matchSlotByName,
	type SlotDefinition,
	slotFileName,
	type SlotMatcher,
	slotOfStored,
	type SlottedFile,
} from './react/slots'
export {
	createRemoveStrategy,
	createXhrUploadStrategy,
	type RemoveStrategyOptions,
	type XhrUploadStrategyOptions,
} from './react/strategy'
export type {
	RemoveStrategy,
	UploaderFile,
	UploadStrategy,
	UploadStrategyOptions,
} from './react/types'
export {
	type UploaderLanguage,
	UploaderProvider,
	type UploaderProviderProps,
	useUploaderLabels,
} from './react/UploaderProvider'
export {
	type SlotState,
	useSlottedUploader,
	type UseSlottedUploaderOptions,
	type UseSlottedUploaderReturn,
} from './react/useSlottedUploader'
export {
	type RetryOptions,
	type UploadTrigger,
	useUploader,
	type UseUploaderOptions,
	type UseUploaderReturn,
} from './react/useUploader'
export {
	type BlobUrlResolverOptions,
	createBlobUrlResolver,
	createBytesResolver,
	viewUrlFileName,
} from './react/viewResolver'
