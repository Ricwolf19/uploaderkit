import { defineScopes, MB } from 'uploaderkit'

/** Every scope the demos use — one registry, exactly like a real app. */
export const demoScopes = defineScopes({
	'demo-document': {
		path: (id, file) => `Demo/${id}/documents/${file.name}`,
		visibility: 'private',
		accept: ['pdf', 'doc', 'docx', 'xlsx', 'csv'],
		maxBytes: 8 * MB,
		category: 'document',
	},
	'demo-image': {
		path: (id, file) => `Demo/${id}/images/${file.name}`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
	},
	'demo-avatar': {
		path: id => `Demo/${id}/avatar`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		compress: { maxWidth: 512, quality: 0.75 },
		overwrite: true,
	},
	'demo-strict-pdf': {
		path: (id, file) => `Demo/${id}/strict/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 1 * MB,
		category: 'pdf',
	},
	'demo-identity': {
		path: (id, file) => `Demo/${id}/identity/${file.name}`,
		visibility: 'public',
		accept: ['pdf', 'png', 'svg', 'jpg'],
		maxBytes: 5 * MB,
	},
})
