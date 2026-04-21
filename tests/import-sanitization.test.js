const { Redirect } = require('../js/redirect.js');

// Simulate the import sanitization logic from importexport.js
function sanitizeImportEntry(raw) {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return null;
	}
	return {
		description: typeof raw.description === 'string' ? raw.description.substring(0, 1000) : '',
		exampleUrl: typeof raw.exampleUrl === 'string' ? raw.exampleUrl.substring(0, 2000) : '',
		includePattern: typeof raw.includePattern === 'string' ? raw.includePattern.substring(0, 2000) : '',
		excludePattern: typeof raw.excludePattern === 'string' ? raw.excludePattern.substring(0, 2000) : '',
		redirectUrl: typeof raw.redirectUrl === 'string' ? raw.redirectUrl.substring(0, 2000) : '',
		patternDesc: typeof raw.patternDesc === 'string' ? raw.patternDesc.substring(0, 1000) : '',
		patternType: (raw.patternType === 'W' || raw.patternType === 'R') ? raw.patternType : 'W',
		processMatches: ['noProcessing','urlEncode','urlDecode','doubleUrlDecode','base64decode'].indexOf(raw.processMatches) !== -1 ? raw.processMatches : 'noProcessing',
		disabled: !!raw.disabled,
		appliesTo: Array.isArray(raw.appliesTo) ? raw.appliesTo.filter(function(t) { return typeof t === 'string' && Object.prototype.hasOwnProperty.call(Redirect.requestTypes, t); }) : ['main_frame']
	};
}

describe('Import sanitization', () => {
	test('sanitizes a valid redirect entry', () => {
		const raw = {
			description: 'Test redirect',
			exampleUrl: 'http://a.com/test',
			includePattern: 'http://a.com/*',
			excludePattern: '',
			redirectUrl: 'http://b.com/$1',
			patternDesc: 'Test',
			patternType: 'W',
			processMatches: 'noProcessing',
			disabled: false,
			appliesTo: ['main_frame', 'script']
		};
		const sanitized = sanitizeImportEntry(raw);
		expect(sanitized.description).toBe('Test redirect');
		expect(sanitized.patternType).toBe('W');
		expect(sanitized.appliesTo).toEqual(['main_frame', 'script']);
	});

	test('rejects null entry', () => {
		expect(sanitizeImportEntry(null)).toBeNull();
	});

	test('rejects array entry', () => {
		expect(sanitizeImportEntry([1, 2, 3])).toBeNull();
	});

	test('rejects string entry', () => {
		expect(sanitizeImportEntry('not an object')).toBeNull();
	});

	test('rejects number entry', () => {
		expect(sanitizeImportEntry(42)).toBeNull();
	});

	test('defaults non-string description', () => {
		const sanitized = sanitizeImportEntry({ description: 12345 });
		expect(sanitized.description).toBe('');
	});

	test('truncates long description to 1000 chars', () => {
		const long = 'a'.repeat(2000);
		const sanitized = sanitizeImportEntry({ description: long });
		expect(sanitized.description.length).toBe(1000);
	});

	test('truncates long includePattern to 2000 chars', () => {
		const long = 'x'.repeat(5000);
		const sanitized = sanitizeImportEntry({ includePattern: long });
		expect(sanitized.includePattern.length).toBe(2000);
	});

	test('truncates long redirectUrl to 2000 chars', () => {
		const long = 'http://example.com/' + 'x'.repeat(5000);
		const sanitized = sanitizeImportEntry({ redirectUrl: long });
		expect(sanitized.redirectUrl.length).toBe(2000);
	});

	test('defaults invalid patternType', () => {
		const sanitized = sanitizeImportEntry({ patternType: 'EVIL' });
		expect(sanitized.patternType).toBe('W');
	});

	test('defaults invalid processMatches', () => {
		const sanitized = sanitizeImportEntry({ processMatches: 'executePayload' });
		expect(sanitized.processMatches).toBe('noProcessing');
	});

	test('filters out invalid appliesTo types', () => {
		const sanitized = sanitizeImportEntry({
			appliesTo: ['main_frame', 'EVIL', '__proto__', 'constructor', 'script']
		});
		expect(sanitized.appliesTo).toEqual(['main_frame', 'script']);
	});

	test('defaults appliesTo when non-array', () => {
		const sanitized = sanitizeImportEntry({ appliesTo: 'main_frame' });
		expect(sanitized.appliesTo).toEqual(['main_frame']);
	});

	test('strips extra properties not in the schema', () => {
		const raw = {
			description: 'test',
			patternType: 'W',
			evilProp: '<script>alert(1)</script>',
			__proto__: { isAdmin: true },
			constructor: 'hacked'
		};
		const sanitized = sanitizeImportEntry(raw);
		expect(Object.keys(sanitized)).not.toContain('evilProp');
		expect(Object.keys(sanitized)).not.toContain('constructor');
		expect(sanitized).not.toHaveProperty('isAdmin');
	});

	test('handles non-string values for URL fields', () => {
		const sanitized = sanitizeImportEntry({
			exampleUrl: { toString: () => 'http://evil.com' },
			includePattern: 123,
			redirectUrl: true,
			excludePattern: ['array']
		});
		expect(sanitized.exampleUrl).toBe('');
		expect(sanitized.includePattern).toBe('');
		expect(sanitized.redirectUrl).toBe('');
		expect(sanitized.excludePattern).toBe('');
	});

	test('coerces disabled to boolean', () => {
		expect(sanitizeImportEntry({ disabled: 1 }).disabled).toBe(true);
		expect(sanitizeImportEntry({ disabled: 0 }).disabled).toBe(false);
		expect(sanitizeImportEntry({ disabled: 'yes' }).disabled).toBe(true);
		expect(sanitizeImportEntry({ disabled: null }).disabled).toBe(false);
		expect(sanitizeImportEntry({ disabled: undefined }).disabled).toBe(false);
	});

	test('sanitized entry creates a valid Redirect', () => {
		const raw = {
			description: 'Good redirect',
			exampleUrl: 'http://a.com/test',
			includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1',
			patternType: 'W',
			appliesTo: ['main_frame']
		};
		const sanitized = sanitizeImportEntry(raw);
		const r = new Redirect(sanitized);
		r.updateExampleResult();
		expect(r.error).toBeNull();
		expect(r.exampleResult).toBe('http://b.com/test');
	});
});
