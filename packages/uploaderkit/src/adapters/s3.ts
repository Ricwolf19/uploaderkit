import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { StorageProvider } from '../types'
export type S3ProviderOptions = {
	client: S3Client
	bucket: string
	/**
	 * Direct URL for a public object — your CDN, an R2 public domain, or the
	 * bucket website. Required before the first `visibility: 'public'` upload:
	 * modern buckets block per-object ACLs, so the adapter cannot invent a
	 * stable public URL on its own.
	 */
	publicUrl?: (key: string) => string
}

/**
 * S3-compatible provider. One adapter covers AWS S3, Cloudflare R2, Backblaze
 * B2, MinIO and Wasabi — they all speak this protocol; only the client's
 * `endpoint`/credentials change.
 *
 * The bucket is treated as private (objects readable through signed URLs);
 * `publicUrl` maps the keys a CDN or public domain exposes. Both `@aws-sdk`
 * packages are optional peers — importing this module without them installed
 * fails, but only for the app that chose S3.
 */
export const createS3Provider = ({
	client,
	bucket,
	publicUrl,
}: S3ProviderOptions): StorageProvider => ({
	name: 's3',
	capabilities: { signedUrl: true, resumable: false, rangeRead: true },

	put: async ({ key, body, contentType, visibility, metadata }) => {
		if (visibility === 'public' && !publicUrl) {
			throw new Error(
				's3 provider: a public scope needs the "publicUrl" option — per-object ACLs are blocked on modern buckets, so pass the CDN/public-domain mapping'
			)
		}

		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: body,
				ContentType: contentType,
				Metadata: metadata,
			})
		)

		return {
			key,
			url:
				visibility === 'public'
					? publicUrl!(key)
					: await getSignedUrl(
							client,
							new GetObjectCommand({ Bucket: bucket, Key: key }),
							{ expiresIn: 300 }
						),
		}
	},

	get: async key => {
		const result = await client.send(
			new GetObjectCommand({ Bucket: bucket, Key: key })
		)
		if (!result.Body) throw new Error(`s3 provider: no object at "${key}"`)
		return result.Body.transformToByteArray()
	},

	delete: async key => {
		try {
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
			return true
		} catch {
			return false
		}
	},

	signedUrl: (key, { expiresIn, download }) =>
		getSignedUrl(
			client,
			new GetObjectCommand({
				Bucket: bucket,
				Key: key,
				...(download ? { ResponseContentDisposition: 'attachment' } : {}),
			}),
			{ expiresIn }
		),

	list: async prefix => {
		const result = await client.send(
			new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
		)
		return (result.Contents ?? []).map(object => ({
			key: object.Key ?? '',
			size: object.Size ?? 0,
		}))
	},
})
