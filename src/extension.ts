import * as vscode from 'vscode';
import {
    mapRemotePath,
    parseMappingConfig,
    type ClientPathPlatform,
    type Mapping,
} from './pathMapping';

interface Transformer {
    name: string;
    rule: string;
}

function getMappings(resourceUri: vscode.Uri): Mapping[] {
    const config = vscode.workspace.getConfiguration('remote-open', resourceUri);
    const clientPlatform: ClientPathPlatform = process.platform === 'win32' ? 'windows' : 'posix';
    const result = parseMappingConfig(config.get<unknown>('mappings') ?? {}, clientPlatform);
    if (result.errors.length > 0) {
        vscode.window.showErrorMessage(`Ignored invalid path mappings: ${result.errors.join('; ')}`);
    }
    return result.mappings;
}

function getMappedPath(remoteUri: vscode.Uri): string | null {
    if (remoteUri.scheme !== 'vscode-remote') {
        return null;
    }

    return mapRemotePath(remoteUri.path, getMappings(remoteUri));
}

export function activate(context: vscode.ExtensionContext) {
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

        const config = vscode.workspace.getConfiguration('remote-open', resourceUri);
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

    context.subscriptions.push(copyCommand, applyTransformerCommand);
}

export function deactivate() {}
