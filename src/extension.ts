import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface Mapping {
    remote: string;
    local: string;
}

interface Transformer {
    name: string;
    rule: string;
}

let cachedMappings: Mapping[] = [];

async function loadMappings(): Promise<Mapping[]> {
    const config = vscode.workspace.getConfiguration('remote-open');
    const settingsMappings = config.get<Mapping[]>('mappings') || [];
    const yamlPath = config.get<string>('mappingFilePath');

    let fileMappings: Mapping[] = [];
    if (yamlPath && fs.existsSync(yamlPath)) {
        try {
            const fileContent = fs.readFileSync(yamlPath, 'utf8');
            const yamlContent = yaml.load(fileContent) as { mappings: Mapping[] };
            if (yamlContent && Array.isArray(yamlContent.mappings)) {
                fileMappings = yamlContent.mappings;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading mapping file: ${(error as Error).message}`);
        }
    }

    cachedMappings = [...settingsMappings, ...fileMappings];
    return cachedMappings;
}

function getMappedPath(remoteUri: vscode.Uri): string | null {
    const remotePath = remoteUri.fsPath;
    for (const mapping of cachedMappings) {
        if (remotePath.startsWith(mapping.remote)) {
            return path.join(mapping.local, remotePath.substring(mapping.remote.length));
        }
    }
    return null;
}

export function activate(context: vscode.ExtensionContext) {
    loadMappings();

    const copyCommand = vscode.commands.registerCommand('remote-open.copyMappedPath', async (uri: vscode.Uri) => {
        const mappedPath = getMappedPath(uri);
        if (mappedPath) {
            await vscode.env.clipboard.writeText(mappedPath);
            vscode.window.showInformationMessage('Copied local mapped path to clipboard.');
        } else {
            vscode.window.showWarningMessage('No local mapping found for this remote path.');
        }
    });

    const applyTransformerCommand = vscode.commands.registerCommand('remote-open.applyTransformer', async (uri: vscode.Uri) => {
        const mappedPath = getMappedPath(uri);
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

    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{yaml,yml}');
    fileWatcher.onDidChange(loadMappings);
    fileWatcher.onDidCreate(loadMappings);
    fileWatcher.onDidDelete(loadMappings);

    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('remote-open')) {
            loadMappings();
        }
    });

    context.subscriptions.push(copyCommand, applyTransformerCommand, fileWatcher);
}

export function deactivate() {}
