import * as assert from 'assert';
import * as vscode from 'vscode';
import { mapRemotePath, parseMappingConfig, type Mapping } from '../pathMapping';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('preserves slash-style Windows paths', () => {
		const mappings: Mapping[] = [{ remote: '/srv/project', local: 'Z:/projects/project' }];

		assert.strictEqual(
			mapRemotePath('/srv/project/src/main.ts', mappings),
			'Z:/projects/project/src/main.ts',
		);
	});

	test('preserves backslash-style Windows and UNC paths', () => {
		assert.strictEqual(
			mapRemotePath('/srv/project/src/main.ts', [
				{ remote: '/srv/project', local: 'Z:\\projects\\project' },
			]),
			'Z:\\projects\\project\\src\\main.ts',
		);
		assert.strictEqual(
			mapRemotePath('/srv/project/src/main.ts', [
				{ remote: '/srv/project', local: '\\\\fileserver\\share\\project' },
			]),
			'\\\\fileserver\\share\\project\\src\\main.ts',
		);
	});

	test('preserves POSIX paths and exact root mappings', () => {
		const mappings: Mapping[] = [{ remote: '/srv/project/', local: '/Users/me/project/' }];

		assert.strictEqual(mapRemotePath('/srv/project/src/main.ts', mappings), '/Users/me/project/src/main.ts');
		assert.strictEqual(mapRemotePath('/srv/project', mappings), '/Users/me/project/');
	});

	test('matches remote roots only at directory boundaries', () => {
		const mappings: Mapping[] = [{ remote: '/srv/project', local: 'Z:/projects/project' }];

		assert.strictEqual(mapRemotePath('/srv/project-old/main.ts', mappings), null);
	});

	test('uses the most specific matching root', () => {
		const mappings: Mapping[] = [
			{ remote: '/srv', local: 'Z:/broad' },
			{ remote: '/srv/project', local: 'Z:/specific' },
		];

		assert.strictEqual(mapRemotePath('/srv/project/main.ts', mappings), 'Z:/specific/main.ts');
	});

	test('parses object mappings and reports invalid entries', () => {
		const result = parseMappingConfig({
			'/srv/project': 'Z:/projects/project',
			'/srv/mixed': 'Z:\\projects/mixed',
			'/srv/relative': 'projects/relative',
		}, 'windows');

		assert.deepStrictEqual(result.mappings, [
			{ remote: '/srv/project', local: 'Z:/projects/project' },
		]);
		assert.strictEqual(result.errors.length, 2);
	});

	test('rejects traversal paths and malformed mapping configs', () => {
		const mappings: Mapping[] = [{ remote: '/srv/project', local: 'Z:/projects/project' }];

		assert.strictEqual(mapRemotePath('/srv/project/../secret.txt', mappings), null);
		assert.deepStrictEqual(parseMappingConfig([], 'windows').errors, ['mappings must be an object']);
	});

	test('validates mapping roots against the client platform', () => {
		const windowsResult = parseMappingConfig({
			'/srv/drive-slash': 'Z:/projects/app',
			'/srv/drive-backslash': 'Z:\\projects\\app',
			'/srv/unc-slash': '//server/share/app',
			'/srv/unc-backslash': '\\\\server\\share\\app',
			'/srv/posix': '/home/user/app',
		}, 'windows');
		assert.strictEqual(windowsResult.mappings.length, 4);
		assert.match(windowsResult.errors[0], /posix path syntax/);

		const posixResult = parseMappingConfig({
			'/srv/posix': '/home/user/app',
			'/srv/windows': 'Z:/projects/app',
			'/srv/unc': '//server/share/app',
		}, 'posix');
		assert.deepStrictEqual(posixResult.mappings, [
			{ remote: '/srv/posix', local: '/home/user/app' },
		]);
		assert.strictEqual(posixResult.errors.length, 2);
		assert.ok(posixResult.errors.every(error => /windows path syntax/.test(error)));
	});
});
