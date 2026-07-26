import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { getMappingValidationError, isMapping, mapRemotePath, type Mapping } from './pathMapping';

interface Transformer {
    name: string;
    rule: string;
}

let cachedMappings: Mapping[] = [];

function getValidMappings(value: unknown, source: string): Mapping[] {
    if (!Array.isArray(value)) {
        vscode.window.showErrorMessage(`${source} mappings must be an array.`);
        return [];
    }

    const invalidMappings = value
        .map((mapping, index) => ({ index, error: getMappingValidationError(mapping) }))
        .filter((result): result is { index: number; error: string } => result.error !== null);
    if (invalidMappings.length > 0) {
        const details = invalidMappings.map(({ index, error }) => `#${index + 1}: ${error}`).join('; ');
        vscode.window.showErrorMessage(`Ignored invalid ${source} mappings: ${details}`);
    }

    return value.filter(isMapping);
}

function loadMappings(): Mapping[] {
    const config = vscode.workspace.getConfiguration('remote-open');
    const settingsMappings = getValidMappings(config.get<unknown>('mappings') || [], 'settings');
    const yamlPath = config.get<string>('mappingFilePath');

    let fileMappings: Mapping[] = [];
    if (yamlPath) {
        try {
            if (fs.existsSync(yamlPath)) {
                const fileContent = fs.readFileSync(yamlPath, 'utf8');
                const yamlContent = yaml.load(fileContent) as { mappings?: unknown } | null;
                if (yamlContent?.mappings !== undefined) {
                    fileMappings = getValidMappings(yamlContent.mappings, 'YAML');
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading mapping file: ${(error as Error).message}`);
        }
    }

    cachedMappings = [...settingsMappings, ...fileMappings];
    return cachedMappings;
}

function getMappedPath(remoteUri: vscode.Uri): string | null {
    if (remoteUri.scheme !== 'vscode-remote') {
        return null;
    }

    return mapRemotePath(remoteUri.path, cachedMappings);
}

export function activate(context: vscode.ExtensionContext) {
    loadMappings();

    const copyCommand = vscode.commands.registerCommand('remote-open.copyMappedPath', async (uri?: vscode.Uri) => {
        const resourceUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        const mappedPath = resourceUri ? getMappedPath(resourceUri) : null;
        if (mappedPath) {
            await vscode.env.clipboard.writeText(mappedPath);
            vscode.window.showInformationMessage('Copied local mapped path to clipboard.');
        } else {
            vscode.window.showWarningMessage('No local mapping found for this remote path.');
        }
    });

    const applyTransformerCommand = vscode.commands.registerCommand('remote-open.applyTransformer', async (uri?: vscode.Uri) => {
        const resourceUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        const mappedPath = resourceUri ? getMappedPath(resourceUri) : null;
        if (!mappedPath) {
            vscode.window.showWarningMessage('No local mapping found for this remote path.');
            return;
        }

        const config = vscode.workspace.getConfiguration('remote-open');
        const transformers = config.get<Transformer[]>('transformers');

        if (!transformers || transformers.length === 0) {
            vscode.window.showWarningMessage('No transformers configured. Please check your settings.');
            return;
        }

        const transformerNames = transformers.map(t => t.name);
        const selectedName = await vscode.window.showQuickPick(transformerNames);

        if (selectedName) {
            const selectedTransformer = transformers.find(t => t.name === selectedName);
            if (selectedTransformer) {
                const transformedString = selectedTransformer.rule.replace(/\${mapped}/g, mappedPath);
                await vscode.env.clipboard.writeText(transformedString);
                vscode.window.showInformationMessage(`Transformed path copied to clipboard: ${transformedString}`);
            }
        }
    });

    const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('remote-open')) {
            loadMappings();
        }
    });

    context.subscriptions.push(copyCommand, applyTransformerCommand, onDidChangeConfiguration);
}

export function deactivate() {}
