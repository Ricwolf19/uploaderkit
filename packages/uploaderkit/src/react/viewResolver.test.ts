import { describe, expect, it } from 'vitest'

import { viewUrlFileName } from './viewResolver'

describe('viewUrlFileName', () => {
	it('recovers the name from a /view url — the key travels percent-encoded', () => {
		expect(
			viewUrlFileName(
				'/storage/po-payment-receipt/abc/view?key=PurchaseOrders%2Fabc%2Fpayments%2Ffactura.pdf'
			)
		).toBe('factura.pdf')
	})

	it('falls back to the last path segment for direct links', () => {
		expect(
			viewUrlFileName('https://cdn.example.com/Customers/c1/logo.png')
		).toBe('logo.png')
	})

	it('answers undefined when nothing resembles a name', () => {
		expect(viewUrlFileName('')).toBeUndefined()
	})
})
