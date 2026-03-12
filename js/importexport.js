// Shows a message explaining how many redirects were imported.
function showImportedMessage(imported, existing) {
	if (imported == 0 && existing == 0) {
		showMessage('No redirects existed in the file.');
	}
	if (imported > 0 && existing == 0) {
		showMessage('Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's.' : '.'), true);
	}
	if (imported == 0 && existing > 0) {
		showMessage('All redirects in the file already existed and were ignored.');
	}
	if (imported > 0 && existing > 0) {
		var m = 'Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's' : '') + '. ';
		if (existing == 1) {
			m += '1 redirect already existed and was ignored.';
		} else {
			m += existing + ' redirects already existed and were ignored.'; 
		}
		showMessage(m, true);
	}
}

function importRedirects(ev) {
	
	let file = ev.target.files[0];
	if (!file) {
		return;
	}
	// Reject files larger than 5 MB to prevent DoS
	var maxFileSize = 5 * 1024 * 1024;
	if (file.size > maxFileSize) {
		showMessage('Import file is too large (max 5 MB).');
		return;
	}
	var reader = new FileReader();
	
	reader.onload = function(e) {
		var data;
		try {
			data = JSON.parse(reader.result);
		} catch(e) {
			showMessage('Failed to parse JSON data, invalid JSON: ' + (e.message||'').substr(0,100));
			return;
		}

		if (!data.redirects || !Array.isArray(data.redirects)) {
			showMessage('Invalid JSON, missing or invalid "redirects" property');
			return;
		}

		var maxImportSize = 5000;
		if (data.redirects.length > maxImportSize) {
			showMessage('Import rejected: file contains more than ' + maxImportSize + ' redirects.');
			return;
		}

		var imported = 0, existing = 0;
		for (var i = 0; i < data.redirects.length; i++) {
			var raw = data.redirects[i];
			if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
				continue;
			}
			// Sanitize: only allow known properties with correct types
			var sanitized = {
				description: typeof raw.description === 'string' ? raw.description.substring(0, 1000) : '',
				exampleUrl: typeof raw.exampleUrl === 'string' ? raw.exampleUrl.substring(0, 2000) : '',
				includePattern: typeof raw.includePattern === 'string' ? raw.includePattern.substring(0, 2000) : '',
				excludePattern: typeof raw.excludePattern === 'string' ? raw.excludePattern.substring(0, 2000) : '',
				redirectUrl: typeof raw.redirectUrl === 'string' ? raw.redirectUrl.substring(0, 2000) : '',
				patternDesc: typeof raw.patternDesc === 'string' ? raw.patternDesc.substring(0, 1000) : '',
				patternType: (raw.patternType === 'W' || raw.patternType === 'R') ? raw.patternType : 'W',
				processMatches: ['noProcessing','urlEncode','urlDecode','doubleUrlDecode','base64decode'].indexOf(raw.processMatches) !== -1 ? raw.processMatches : 'noProcessing',
				disabled: !!raw.disabled,
				appliesTo: Array.isArray(raw.appliesTo) ? raw.appliesTo.filter(function(t) { return typeof t === 'string' && t in Redirect.requestTypes; }) : ['main_frame']
			};
			var r = new Redirect(sanitized);
			r.updateExampleResult();
			if (REDIRECTS.some(function(i) { return new Redirect(i).equals(r);})) {
				existing++;
			} else {
				REDIRECTS.push(r.toObject());
				imported++;
			}
		}
		
		showImportedMessage(imported, existing);

		saveChanges();
		renderRedirects();
	};

	try {
		reader.readAsText(file, 'utf-8');
	} catch(e) {
		showMessage('Failed to read import file');
	}
}

function updateExportLink() {
	var redirects = REDIRECTS.map(function(r) {
		return new Redirect(r).toObject();
	});

	let	version = chrome.runtime.getManifest().version;

	var exportObj = { 
		createdBy : 'Redirector v' + version, 
		createdAt : new Date(), 
		redirects : redirects 
	};

	var json = JSON.stringify(exportObj, null, 4);

	//Using encodeURIComponent here instead of base64 because base64 always messed up our encoding for some reason...
	el('#export-link').href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(json); 
}

updateExportLink();

function setupImportExportEventListeners() {
	el("#import-file").addEventListener('change', importRedirects);
	el("#export-link").addEventListener('mousedown', updateExportLink);
}

setupImportExportEventListeners();