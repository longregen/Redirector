const { Redirect } = require('../js/redirect.js');

describe('Redirect._isSafeRedirectUrl', () => {
	function isSafe(url) {
		const r = new Redirect();
		return r._isSafeRedirectUrl(url);
	}

	test('allows http and https URLs', () => {
		expect(isSafe('http://example.com')).toBe(true);
		expect(isSafe('https://example.com/path?q=1')).toBe(true);
	});

	test('blocks javascript: scheme', () => {
		expect(isSafe('javascript:alert(1)')).toBe(false);
	});

	test('blocks javascript: with mixed case', () => {
		expect(isSafe('JaVaScRiPt:alert(1)')).toBe(false);
	});

	test('blocks javascript: with leading whitespace', () => {
		expect(isSafe('  javascript:alert(1)')).toBe(false);
	});

	test('blocks data: scheme', () => {
		expect(isSafe('data:text/html,<script>alert(1)</script>')).toBe(false);
	});

	test('blocks vbscript: scheme', () => {
		expect(isSafe('vbscript:MsgBox("XSS")')).toBe(false);
	});

	test('blocks blob: scheme', () => {
		expect(isSafe('blob:http://example.com/uuid')).toBe(false);
	});

	test('blocks file: scheme', () => {
		expect(isSafe('file:///etc/passwd')).toBe(false);
	});

	test('blocks FILE: with uppercase', () => {
		expect(isSafe('FILE:///etc/passwd')).toBe(false);
	});

	test('allows ftp and other schemes', () => {
		expect(isSafe('ftp://example.com')).toBe(true);
	});

	test('allows empty string', () => {
		expect(isSafe('')).toBe(true);
	});
});

describe('Redirect._init input validation', () => {
	test('defaults patternType to W for invalid values', () => {
		const r = new Redirect({ patternType: 'INVALID' });
		expect(r.patternType).toBe('W');
	});

	test('accepts W patternType', () => {
		const r = new Redirect({ patternType: 'W' });
		expect(r.patternType).toBe('W');
	});

	test('accepts R patternType', () => {
		const r = new Redirect({ patternType: 'R' });
		expect(r.patternType).toBe('R');
	});

	test('defaults patternType when missing', () => {
		const r = new Redirect({});
		expect(r.patternType).toBe('W');
	});

	test('defaults processMatches for invalid values', () => {
		const r = new Redirect({ processMatches: 'evalCode' });
		expect(r.processMatches).toBe('noProcessing');
	});

	test('accepts all valid processMatches values', () => {
		for (const val of ['noProcessing', 'urlEncode', 'urlDecode', 'doubleUrlDecode', 'base64decode']) {
			const r = new Redirect({ processMatches: val });
			expect(r.processMatches).toBe(val);
		}
	});

	test('filters appliesTo to only known request types', () => {
		const r = new Redirect({
			appliesTo: ['main_frame', 'EVIL_TYPE', 'script', '__proto__']
		});
		expect(r.appliesTo).toEqual(['main_frame', 'script']);
	});

	test('defaults appliesTo when all entries are invalid', () => {
		const r = new Redirect({ appliesTo: ['EVIL', 'FAKE'] });
		expect(r.appliesTo).toEqual(['main_frame']);
	});

	test('defaults appliesTo when not an array', () => {
		const r = new Redirect({ appliesTo: 'main_frame' });
		expect(r.appliesTo).toEqual(['main_frame']);
	});

	test('defaults appliesTo when empty array', () => {
		const r = new Redirect({ appliesTo: [] });
		expect(r.appliesTo).toEqual(['main_frame']);
	});

	test('coerces disabled to boolean', () => {
		expect(new Redirect({ disabled: 1 }).disabled).toBe(true);
		expect(new Redirect({ disabled: 0 }).disabled).toBe(false);
		expect(new Redirect({ disabled: 'yes' }).disabled).toBe(true);
		expect(new Redirect({ disabled: '' }).disabled).toBe(false);
		expect(new Redirect({ disabled: null }).disabled).toBe(false);
	});

	test('handles missing init object', () => {
		const r = new Redirect();
		expect(r.patternType).toBe('W');
		expect(r.processMatches).toBe('noProcessing');
		expect(r.appliesTo).toEqual(['main_frame']);
		expect(r.disabled).toBe(false);
	});
});

describe('Redirect.compile and pattern matching', () => {
	test('wildcard pattern matches correctly', () => {
		const r = new Redirect({
			includePattern: 'http://example.com/*',
			redirectUrl: 'http://other.com/$1',
			patternType: 'W',
			exampleUrl: 'http://example.com/test',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/hello');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com/hello');
	});

	test('regex pattern matches correctly', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/(\\w+)',
			redirectUrl: 'http://other.com/$1',
			patternType: 'R',
			exampleUrl: 'http://example.com/test',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/hello');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com/hello');
	});

	test('exclude pattern prevents match', () => {
		const r = new Redirect({
			includePattern: 'http://example.com/*',
			excludePattern: 'http://example.com/keep*',
			redirectUrl: 'http://other.com/$1',
			patternType: 'W',
			exampleUrl: 'http://example.com/test',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/keepme');
		expect(match.isExcludeMatch).toBe(true);
		expect(match.isMatch).toBe(false);
	});

	test('disabled redirect returns isDisabledMatch', () => {
		const r = new Redirect({
			includePattern: 'http://example.com/*',
			redirectUrl: 'http://other.com/$1',
			patternType: 'W',
			disabled: true,
			exampleUrl: 'http://example.com/test',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/hello');
		expect(match.isDisabledMatch).toBe(true);
		expect(match.isMatch).toBe(false);
	});

	test('no match returns isMatch false', () => {
		const r = new Redirect({
			includePattern: 'http://example.com/*',
			redirectUrl: 'http://other.com/$1',
			patternType: 'W',
			exampleUrl: 'http://example.com/test',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://different.com/hello');
		expect(match.isMatch).toBe(false);
	});
});

describe('Redirect blocks dangerous URL schemes in redirect results', () => {
	function makeRedirect(redirectUrl) {
		return new Redirect({
			includePattern: 'http://example.com/*',
			redirectUrl: redirectUrl,
			patternType: 'W',
			exampleUrl: 'http://example.com/test',
			appliesTo: ['main_frame']
		});
	}

	test('blocks redirect to javascript: URL', () => {
		const r = makeRedirect('javascript:alert(document.cookie)');
		const match = r.getMatch('http://example.com/test');
		expect(match.isMatch).toBe(false);
	});

	test('blocks redirect to data: URL', () => {
		const r = makeRedirect('data:text/html,<script>alert(1)</script>');
		const match = r.getMatch('http://example.com/test');
		expect(match.isMatch).toBe(false);
	});

	test('blocks redirect to file: URL', () => {
		const r = makeRedirect('file:///etc/passwd');
		const match = r.getMatch('http://example.com/test');
		expect(match.isMatch).toBe(false);
	});

	test('blocks redirect to blob: URL', () => {
		const r = makeRedirect('blob:http://evil.com/uuid');
		const match = r.getMatch('http://example.com/test');
		expect(match.isMatch).toBe(false);
	});

	test('allows redirect to http: URL', () => {
		const r = makeRedirect('http://safe.com/$1');
		const match = r.getMatch('http://example.com/test');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://safe.com/test');
	});

	test('allows redirect to https: URL', () => {
		const r = makeRedirect('https://safe.com/$1');
		const match = r.getMatch('http://example.com/test');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('https://safe.com/test');
	});

	test('blocks javascript: constructed via regex capture', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/(.*)',
			redirectUrl: '$1',
			patternType: 'R',
			exampleUrl: 'http://example.com/http://safe.com',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/javascript:alert(1)');
		expect(match.isMatch).toBe(false);
	});
});

describe('Redirect URL decoding (decodeURIComponent replacement)', () => {
	test('urlDecode processes matches correctly', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/redir\\?url=(.*)',
			redirectUrl: '$1',
			patternType: 'R',
			processMatches: 'urlDecode',
			exampleUrl: 'http://example.com/redir?url=http%3A%2F%2Fother.com',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/redir?url=http%3A%2F%2Fother.com');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com');
	});

	test('urlDecode handles malformed percent encoding gracefully', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/(.*)',
			redirectUrl: 'http://other.com/$1',
			patternType: 'R',
			processMatches: 'urlDecode',
			exampleUrl: 'http://example.com/%ZZ',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/%ZZ');
		expect(match.isMatch).toBe(true);
		// Should leave the malformed sequence unchanged
		expect(match.redirectTo).toBe('http://other.com/%ZZ');
	});

	test('doubleUrlDecode processes matches correctly', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/redir\\?url=(.*)',
			redirectUrl: '$1',
			patternType: 'R',
			processMatches: 'doubleUrlDecode',
			exampleUrl: 'http://example.com/redir?url=http%253A%252F%252Fother.com',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/redir?url=http%253A%252F%252Fother.com');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com');
	});

	test('doubleUrlDecode handles malformed encoding gracefully', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/(.*)',
			redirectUrl: 'http://other.com/$1',
			patternType: 'R',
			processMatches: 'doubleUrlDecode',
			exampleUrl: 'http://example.com/%ZZ',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/%ZZ');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com/%ZZ');
	});

	test('urlEncode processes matches correctly', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/(.*)',
			redirectUrl: 'http://proxy.com/?url=$1',
			patternType: 'R',
			processMatches: 'urlEncode',
			exampleUrl: 'http://example.com/path/to/page',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/path/to/page');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://proxy.com/?url=path%2Fto%2Fpage');
	});

	test('base64decode processes matches correctly', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/redir\\?url=(.*)',
			redirectUrl: '$1',
			patternType: 'R',
			processMatches: 'base64decode',
			exampleUrl: 'http://example.com/redir?url=aHR0cDovL290aGVyLmNvbQ==',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/redir?url=aHR0cDovL290aGVyLmNvbQ==');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com');
	});

	test('base64decode handles invalid base64 gracefully', () => {
		const r = new Redirect({
			includePattern: 'http://example\\.com/(.*)',
			redirectUrl: 'http://other.com/$1',
			patternType: 'R',
			processMatches: 'base64decode',
			exampleUrl: 'http://example.com/not-valid-base64!!!',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/not-valid-base64!!!');
		expect(match.isMatch).toBe(true);
		// Should leave unchanged on invalid base64
		expect(match.redirectTo).toBe('http://other.com/not-valid-base64!!!');
	});
});

describe('Redirect.toObject and equals', () => {
	test('toObject returns only known properties', () => {
		const r = new Redirect({
			description: 'test',
			exampleUrl: 'http://example.com',
			includePattern: '*',
			redirectUrl: 'http://other.com',
			patternType: 'W',
			appliesTo: ['main_frame'],
			_evilProp: 'should not appear',
			__proto__hack: 'should not appear'
		});
		const obj = r.toObject();
		const keys = Object.keys(obj);
		expect(keys).not.toContain('_evilProp');
		expect(keys).not.toContain('__proto__hack');
		expect(keys).toEqual([
			'description', 'exampleUrl', 'exampleResult', 'error',
			'includePattern', 'excludePattern', 'patternDesc',
			'redirectUrl', 'patternType', 'processMatches',
			'disabled', 'grouped', 'appliesTo'
		]);
	});

	test('equals compares two identical redirects', () => {
		const a = new Redirect({
			description: 'test', includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1', patternType: 'W',
			exampleUrl: 'http://a.com/x', appliesTo: ['main_frame']
		});
		const b = new Redirect({
			description: 'test', includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1', patternType: 'W',
			exampleUrl: 'http://a.com/x', appliesTo: ['main_frame']
		});
		expect(a.equals(b)).toBe(true);
	});

	test('equals detects different redirects', () => {
		const a = new Redirect({
			description: 'test', includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1', patternType: 'W',
			exampleUrl: 'http://a.com/x', appliesTo: ['main_frame']
		});
		const b = new Redirect({
			description: 'different', includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1', patternType: 'W',
			exampleUrl: 'http://a.com/x', appliesTo: ['main_frame']
		});
		expect(a.equals(b)).toBe(false);
	});
});

describe('Redirect.updateExampleResult validation', () => {
	test('rejects missing example URL', () => {
		const r = new Redirect({
			includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1',
			patternType: 'W',
			appliesTo: ['main_frame']
		});
		r.updateExampleResult();
		expect(r.error).toBe('No example URL defined.');
	});

	test('rejects invalid regex in include pattern', () => {
		const r = new Redirect({
			includePattern: '(unclosed',
			redirectUrl: 'http://b.com/$1',
			patternType: 'R',
			exampleUrl: 'http://a.com/test',
			appliesTo: ['main_frame']
		});
		r.updateExampleResult();
		expect(r.error).toBe('Invalid regular expression in Include pattern.');
	});

	test('rejects invalid regex in exclude pattern', () => {
		const r = new Redirect({
			includePattern: 'http://a\\.com/(.*)',
			excludePattern: '(unclosed',
			redirectUrl: 'http://b.com/$1',
			patternType: 'R',
			exampleUrl: 'http://a.com/test',
			appliesTo: ['main_frame']
		});
		r.updateExampleResult();
		expect(r.error).toBe('Invalid regular expression in Exclude pattern.');
	});

	test('rejects empty appliesTo', () => {
		const r = new Redirect({
			includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1',
			patternType: 'W',
			exampleUrl: 'http://a.com/test'
		});
		// Force empty appliesTo after init (since init defaults it)
		r.appliesTo = [];
		r.updateExampleResult();
		expect(r.error).toBe('At least one request type must be chosen.');
	});

	test('sets exampleResult on valid redirect', () => {
		const r = new Redirect({
			includePattern: 'http://a.com/*',
			redirectUrl: 'http://b.com/$1',
			patternType: 'W',
			exampleUrl: 'http://a.com/hello',
			appliesTo: ['main_frame']
		});
		r.updateExampleResult();
		expect(r.error).toBeNull();
		expect(r.exampleResult).toBe('http://b.com/hello');
	});
});

describe('Redirect wildcard escaping', () => {
	test('escapes regex special characters in wildcard patterns', () => {
		const r = new Redirect({
			includePattern: 'http://example.com/path?q=*',
			redirectUrl: 'http://other.com/?q=$1',
			patternType: 'W',
			exampleUrl: 'http://example.com/path?q=test',
			appliesTo: ['main_frame']
		});
		const match = r.getMatch('http://example.com/path?q=hello');
		expect(match.isMatch).toBe(true);
		expect(match.redirectTo).toBe('http://other.com/?q=hello');
	});

	test('does not match special regex chars as wildcards', () => {
		const r = new Redirect({
			includePattern: 'http://example.com/path',
			redirectUrl: 'http://other.com/',
			patternType: 'W',
			exampleUrl: 'http://example.com/path',
			appliesTo: ['main_frame']
		});
		// The dot in "example.com" should be literal, not regex wildcard
		const match = r.getMatch('http://exampleXcom/path');
		expect(match.isMatch).toBe(false);
	});
});

describe('Redirect prototype pollution guards', () => {
	test('appliesToText uses hasOwnProperty', () => {
		const r = new Redirect({
			appliesTo: ['main_frame', 'script'],
			patternType: 'W'
		});
		// Should not throw even if someone polluted Object.prototype
		expect(typeof r.appliesToText).toBe('string');
		expect(r.appliesToText).toContain('Main window');
		expect(r.appliesToText).toContain('Scripts');
	});

	test('processMatchesExampleText uses hasOwnProperty', () => {
		const r = new Redirect({ processMatches: 'urlEncode' });
		expect(typeof r.processMatchesExampleText).toBe('string');
		expect(r.processMatchesExampleText).toContain('%2F');
	});

	test('processMatchesExampleText returns empty for unknown value', () => {
		const r = new Redirect({});
		r.processMatches = 'unknownValue';
		expect(r.processMatchesExampleText).toBe('');
	});
});
