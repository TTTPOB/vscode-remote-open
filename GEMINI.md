# Proposal: Remote Path Mapping Feature

This document outlines the plan to add a new feature to the VS Code extension that allows users to copy and open local paths that are mapped to remote paths.

## 1. Feature Overview

When a user is connected to a remote host in VS Code, right-clicking on a file or folder in the file explorer will present two new options:

1.  **Copy Local Mapped Path**: Copies the corresponding local path to the clipboard.
2.  **Open Local Mapped Path**: Opens the corresponding local path in the local file explorer.

The visibility of these menu items will be conditional on a successful path mapping.

## 2. Configuration

The path mappings will be configured through two sources, which are combined at runtime:

1.  **VS Code Setting**: A setting `remote-open.mappings` will allow users to define a list of mappings directly in their `settings.json`. This is for quick additions and user-specific overrides.

    ```json
    "remote-open.mappings": [
      {
        "remote": "/home/user/project-a",
        "local": "C:\Users\user\dev\project-a"
      }
    ]
    ```

2.  **YAML File**: A setting `remote-open.mappingFilePath` will specify the path to a YAML file containing a list of mappings. This is intended for project-wide or team-wide configurations.

    **Example `mappings.yaml`:**
    ```yaml
    mappings:
      - remote: "/var/www/html"
        local: "/mnt/c/Users/user/projects/company-website"
      - remote: "/home/user/another-project"
        local: "C:\Users\user\dev\another-project"
    ```

The mappings from the VS Code setting will be prepended to the list from the YAML file, allowing them to be prioritized.

## 3. Implementation Details

### 3.1. `package.json`

-   **Commands**:
    -   `remote-open.copyMappedPath`: "Remote Open: Copy Local Mapped Path"
    -   `remote-open.openMappedPath`: "Remote Open: Open Local Mapped Path"

-   **Menus (`explorer/context`)**:
    -   The two commands will be added to the `explorer/context` menu.
    -   Their visibility will be controlled by a new context key, e.g., `remote-open.hasMappedPath`, which will be set when a valid local mapping exists for the selected resource.

-   **Configuration**:
    -   `remote-open.mappings`: An `array` of `object`s, with `remote` and `local` string properties.
    -   `remote-open.mappingFilePath`: A `string` to specify the path to the YAML mapping file.

### 3.2. `src/extension.ts`

-   **Activation**:
    -   Register the two new commands (`remote-open.copyMappedPath` and `remote-open.openMappedPath`).
    -   The command handlers will be responsible for:
        1.  Getting the URI of the right-clicked resource from the command argument.
        2.  Loading and combining the mappings from both the VS Code settings and the YAML file.
        3.  Finding the first matching mapping for the selected resource's remote path.
        4.  Constructing the final local path.
        5.  Performing the "copy" or "open" action.

-   **Path Mapping Logic**:
    -   A new function will be created to handle the path mapping logic. It will take a remote path as input and return a local path if a mapping is found, otherwise `null`.
    -   This function will cache the mappings to avoid re-reading the files on every right-click. A file watcher will be used to invalidate the cache when the YAML file changes.

-   **Context Key Management**:
    -   A function will be triggered on explorer selection changes to update the `remote-open.hasMappedPath` context key. This will ensure the menu items only appear when a valid mapping exists.

### 3.3. Dependencies

-   The `js-yaml` library will be added to parse the YAML mapping file.

## 4. Workflow Example

1.  User right-clicks on `/var/www/html/images/logo.png` in the remote file explorer.
2.  The extension gets the remote path.
3.  It loads the mappings from `settings.json` and `mappings.yaml`.
4.  It finds that `/var/www/html` maps to `/mnt/c/Users/user/projects/company-website`.
5.  It constructs the local path: `/mnt/c/Users/user/projects/company-website/images/logo.png`.
6.  Because a mapping was found, the `remote-open.hasMappedPath` context key is set to `true`, and the two menu items appear.
7.  User clicks "Copy Local Mapped Path".
8.  The string `/mnt/c/Users/user/projects/company-website/images/logo.png` is copied to the clipboard.
