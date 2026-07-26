export interface Mapping {
    remote: string;
    local: string;
}

export interface MappingConfigResult {
    mappings: Mapping[];
    errors: string[];
}

function hasParentSegments(value: string, separator: '/' | '\\'): boolean {
    return value.split(separator).some(segment => segment === '.' || segment === '..');
}

function getLocalSeparator(localRoot: string): '/' | '\\' | null {
    const hasSlash = localRoot.includes('/');
    const hasBackslash = localRoot.includes('\\');

    if (hasSlash && hasBackslash) {
        return null;
    }

    return hasBackslash ? '\\' : '/';
}

function getMappingValidationError(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
        return 'mapping must be an object';
    }

    const mapping = value as Partial<Mapping>;
    if (typeof mapping.remote !== 'string' || mapping.remote.length === 0) {
        return 'remote must be a non-empty string';
    }
    if (!mapping.remote.startsWith('/') || mapping.remote.includes('\\')) {
        return 'remote must be an absolute POSIX path';
    }
    if (hasParentSegments(mapping.remote, '/')) {
        return 'remote cannot contain . or .. segments';
    }
    if (typeof mapping.local !== 'string' || mapping.local.length === 0) {
        return 'local must be a non-empty string';
    }

    const separator = getLocalSeparator(mapping.local);
    if (!separator) {
        return 'local cannot mix slash and backslash separators';
    }

    const isAbsolute = separator === '\\'
        ? /^[A-Za-z]:\\/.test(mapping.local) || /^\\\\[^\\]+\\[^\\]+/.test(mapping.local)
        : mapping.local.startsWith('/') || /^[A-Za-z]:\//.test(mapping.local);
    if (!isAbsolute) {
        return 'local must be an absolute path';
    }
    if (hasParentSegments(mapping.local, separator)) {
        return 'local cannot contain . or .. segments';
    }

    return null;
}

export function isMapping(value: unknown): value is Mapping {
    return getMappingValidationError(value) === null;
}

export function parseMappingConfig(value: unknown): MappingConfigResult {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { mappings: [], errors: ['mappings must be an object'] };
    }

    const mappings: Mapping[] = [];
    const errors: string[] = [];
    for (const [remote, local] of Object.entries(value)) {
        const mapping = { remote, local };
        const error = getMappingValidationError(mapping);
        if (error) {
            errors.push(`${remote || '<empty>'}: ${error}`);
        } else if (isMapping(mapping)) {
            mappings.push(mapping);
        }
    }

    return { mappings, errors };
}

export function mapRemotePath(remotePath: string, mappings: readonly Mapping[]): string | null {
    if (!remotePath.startsWith('/') || remotePath.includes('\\') || hasParentSegments(remotePath, '/')) {
        return null;
    }

    let selected: { mapping: Mapping; remoteRoot: string } | null = null;
    for (const mapping of mappings) {
        const remoteRoot = mapping.remote === '/' ? '/' : mapping.remote.replace(/\/+$/, '');
        const matchesRoot = remoteRoot === '/'
            ? remotePath.startsWith('/')
            : remotePath === remoteRoot || remotePath.startsWith(`${remoteRoot}/`);

        if (matchesRoot && (!selected || remoteRoot.length > selected.remoteRoot.length)) {
            selected = { mapping, remoteRoot };
        }
    }

    if (!selected) {
        return null;
    }

    const { mapping, remoteRoot } = selected;
    const relativePath = remotePath === remoteRoot
        ? ''
        : remoteRoot === '/'
            ? remotePath.slice(1)
            : remotePath.slice(remoteRoot.length + 1);
    if (!relativePath) {
        return mapping.local;
    }

    const separator = getLocalSeparator(mapping.local);
    if (!separator) {
        return null;
    }

    const localRoot = mapping.local.replace(/[\\/]+$/, '');
    return `${localRoot}${separator}${relativePath.replaceAll('/', separator)}`;
}
