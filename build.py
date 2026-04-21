#!/usr/bin/python3

import os, os.path, re, zipfile, json

def get_files_to_zip():
	#Exclude git stuff, build scripts, test tooling etc. — anything that is
	#not part of the shipped extension. Keeping this tight matters: the
	#Firefox AMO validator rejects packages full of node_modules and AMO
	#signing has a soft file-count limit.
	exclude = [
		r'\.(py|sh|pem)$', #file endings
		r'(\\|/)\.', #hidden files / folders (.git, .github, .maestro, ...)
		r'^\.(\\|/)(package-lock\.json|playwright\.config\.js)$', #top-level tooling files
		r'package(-lock)?\.json$|icon\.html$', #file names (extension uses manifest.json, not package.json)
		r'(^|\\|/)(promo|unittest|build|node_modules|e2e|scripts|screenshots|test-results|playwright-report)(\\|/)' #folders
	]

	zippable_files = []
	skip_dirs = {'node_modules', 'e2e', 'scripts', 'screenshots', 'test-results', 'playwright-report', 'promo', 'unittest', 'build'}
	for root, folders, files in os.walk('.'):
		#Prune excluded directories in-place so os.walk doesn't descend into them.
		folders[:] = [d for d in folders if d not in skip_dirs and not d.startswith('.')]
		print(root)
		for f in files:
			file = os.path.join(root, f)
			if not any(re.search(p, file) for p in exclude):
				zippable_files.append(file)
	return zippable_files


def create_addon(files, browser):
	output_folder = 'build'
	if not os.path.isdir(output_folder):
		os.mkdir(output_folder)

	if browser == 'firefox':
		ext = 'xpi'
	else:
		ext = 'zip'

	output_file = os.path.join(output_folder, f'redirector-{browser}.{ext}')
	zf = zipfile.ZipFile(output_file, 'w', zipfile.ZIP_STORED)
	cert = 'extension-certificate.pem'

	print('')
	print(f'**** Creating addon for ${browser} ****')
	
	if browser == 'opera' and not os.path.exists(cert):
		print('Extension certificate does not exist, cannot create .nex file for Opera')
		return

	for f in files:
		print('Adding', f)
		if f.endswith('manifest.json'):
			manifest = json.load(open(f))
			if browser != 'firefox':
				del manifest['applications'] #Firefox specific, and causes warnings in other browsers...


			if browser == 'firefox':
				del manifest['background']['persistent'] #Firefox chokes on this, is always persistent anyway

			if browser == 'opera':
				manifest['options_ui']['page'] = 'redirector.html' #Opera opens options in new tab, where the popup would look really ugly
				manifest['options_ui']['chrome_style'] = False

			zf.writestr(f[2:], json.dumps(manifest, indent=2)) 
		else:
			zf.write(f[2:])

	zf.close()

	if browser == 'opera':
		#Create .nex
		os.system('./nex-build.sh %s %s %s' % (output_file, output_file.replace('.zip', '.nex'), cert))



if __name__ == '__main__':
	#Make sure we can run this from anywhere
	folder = os.path.dirname(os.path.realpath(__file__))
	os.chdir(folder)

	files = get_files_to_zip()
	
	print('******* REDIRECTOR BUILD SCRIPT *******')
	print('')

	create_addon(files, 'chrome')
	create_addon(files, 'edge')
	create_addon(files, 'opera')
	create_addon(files, 'firefox')

