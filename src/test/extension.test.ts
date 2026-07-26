import * as assert from 'assert';
import * as vscode from 'vscode';
import { getMappingValidationError, mapRemotePath, type Mapping } from '../pathMapping';

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

	test('keeps configured mapping precedence', () => {
		const mappings: Mapping[] = [
			{ remote: '/srv', local: 'Z:/broad' },
			{ remote: '/srv/project', local: 'Z:/specific' },
		];

		assert.strictEqual(mapRemotePath('/srv/project/main.ts', mappings), 'Z:/broad/project/main.ts');
	});

	test('rejects traversal paths and invalid mapping roots', () => {
		const mappings: Mapping[] = [{ remote: '/srv/project', local: 'Z:/projects/project' }];

		assert.strictEqual(mapRemotePath('/srv/project/../secret.txt', mappings), null);
		assert.match(
			getMappingValidationError({ remote: '/srv/project', local: 'Z:\\projects/project' }) ?? '',
			/mix slash and backslash/,
		);
		assert.match(
			getMappingValidationError({ remote: '/srv/project', local: 'projects/project' }) ?? '',
			/absolute path/,
		);
	});
});
