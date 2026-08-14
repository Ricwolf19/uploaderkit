/**
 * uploaderkit/server — the server side of the contract.
 *
 * `createStorage` re-validates with the same functions the browser ran and
 * talks to a `StorageProvider`. Framework adapters live in `./server/express`
 * and `./server/next`.
 */

export { createAesGcmCrypto } from './server/crypto'
export {
	createStorage,
	type CreateStorageOptions,
	StorageRequestError,
	type StorageService,
	type UploadInput,
} from './server/storage'
