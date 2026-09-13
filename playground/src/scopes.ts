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
		// A gallery: the demos append to it, so uploads must not sweep.
		maxFiles: 12,
	},
	'demo-avatar': {
		path: id => `Demo/${id}/avatar`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		compress: { maxWidth: 512, quality: 0.75 },
	},
	'demo-strict-pdf': {
		path: (id, file) => `Demo/${id}/strict/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 1 * MB,
		category: 'pdf',
	},
	// Single file, key carries the name: every upload sweeps the previous one.
	'demo-replace-single': {
		path: (id, file) => `Demo/${id}/replace-single/${file.name}`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
	},
	// Keeps every version on purpose.
	'demo-replace-never': {
		path: (id, file) => `Demo/${id}/replace-never/${file.name}`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		replace: false,
	},
	// Slotted: one file per named position, so uploads must not sweep.
	'demo-identity': {
		maxFiles: 8,
		path: (id, file) => `Demo/${id}/identity/${file.name}`,
		visibility: 'public',
		accept: ['pdf', 'png', 'svg', 'jpg'],
		maxBytes: 5 * MB,
	},
})
