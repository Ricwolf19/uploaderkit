import type { Bucket } from '@google-cloud/storage'

import type { StreamingStorageProvider } from '../server/storage'

export type GcsProviderOptions = {
	/** Objects with `visibility: 'public'` land here and get a direct URL. */
	publicBucket: Bucket
	/** Objects with `visibility: 'private'` land here; access is signed-only. */
	privateBucket: Bucket
	/**
	 * Direct URL for a public object.
	 * @defaultValue `https://storage.googleapis.com/{bucket}/{key}`
	 */
	publicUrl?: (bucketName: string, key: string) => string
}

const defaultPublicUrl = (bucketName: string, key: string): string =>
	`https://storage.googleapis.com/${bucketName}/${encodeURI(key)}`

/**
 * Google Cloud Storage provider over a two-bucket layout: public assets on
 * one bucket, sensitive documents on another that is never world-readable.
 *
 * `@google-cloud/storage` is an optional peer — importing this module without
 * it installed fails, but only for the app that chose GCS.
 *
 * Reads probe the private bucket first and fall back to the public one; keys
 * are unique per scope path, so a hit in both cannot happen.
 *
 * @see AGENTS.md §6 — why the probe exists
 */
export const createGcsProvider = ({
	publicBucket,
	privateBucket,
	publicUrl = defaultPublicUrl,
}: GcsProviderOptions): StreamingStorageProvider => {
	// Under uniform bucket-level access, per-object `makePublic()` fails
	// silently and a "public" upload 403s in every <img> — a bug that only
	// shows as broken avatars. Probe the first public upload's URL once and
	// say exactly how to fix the bucket.
	let publicAccessChecked = false
	const checkPublicAccess = (url: string, bucketName: string): void => {
		if (publicAccessChecked) return
		publicAccessChecked = true
		void fetch(url, { method: 'HEAD' })
			.then(response => {
				if (!response.ok) {
					console.error(
						`[uploaderkit] gcs: public objects in "${bucketName}" answer ${response.status} — the bucket is not publicly readable. Grant it once with:\n` +
							`  gcloud storage buckets add-iam-policy-binding gs://${bucketName} --member=allUsers --role=roles/storage.objectViewer`
					)
				}
			})
			.catch(() => undefined)
	}

	const locate = async (key: string): Promise<Bucket> => {
		const [inPrivate] = await privateBucket.file(key).exists()
		return inPrivate ? privateBucket : publicBucket
	}

	return {
		name: 'gcs',
		capabilities: { signedUrl: true, resumable: false, rangeRead: true },

		put: async ({ key, body, contentType, visibility, metadata }) => {
			const bucket = visibility === 'private' ? privateBucket : publicBucket
			const file = bucket.file(key)

			await file.save(Buffer.from(body), {
				contentType,
				resumable: false,
				metadata: { metadata },
			})

			if (visibility === 'public') {
				// Buckets with uniform public access reject per-object ACLs; when
				// the bucket itself grants allUsers read, this failure is benign —
				// and when it does not, the probe below reports it loudly.
				await file.makePublic().catch(() => undefined)
			}

			const url = publicUrl(bucket.name, key)
			if (visibility === 'public') checkPublicAccess(url, bucket.name)
			return { key, url }
		},

		get: async key => {
			const bucket = await locate(key)
			const [data] = await bucket.file(key).download()
			return new Uint8Array(data)
		},

		// `download()` buffers the whole object; a 20MB document costs that per
		// concurrent request, and materialization serves many at once.
		getStream: async key => {
			const bucket = await locate(key)
			return bucket.file(key).createReadStream()
		},

		delete: async key => {
			const bucket = await locate(key)
			return bucket
				.file(key)
				.delete()
				.then(() => true)
				.catch(() => false)
		},

		signedUrl: async (key, { expiresIn, download }) => {
			const bucket = await locate(key)
			const [url] = await bucket.file(key).getSignedUrl({
				version: 'v4',
				action: 'read',
				expires: Date.now() + expiresIn * 1000,
				...(download ? { responseDisposition: 'attachment' } : {}),
			})
			return url
		},

		list: async prefix => {
			const [privateFiles] = await privateBucket.getFiles({ prefix })
			const [publicFiles] = await publicBucket.getFiles({ prefix })
			return [...privateFiles, ...publicFiles].map(file => ({
				key: file.name,
				size: Number(file.metadata.size ?? 0),
			}))
		},
	}
}
