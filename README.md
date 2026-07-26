# Remote Open

This extension provides a flexible way to handle remote file paths by mapping them to your local machine. You can copy the local path directly or apply custom transformations to it, which can be used to trigger local scripts or open files in specific applications.

## Features

*   **Copy Local Mapped Path:** Right-click on a file in a remote explorer and instantly copy its corresponding local path to your clipboard.
*   **Custom Transformers:** Define your own rules to transform the mapped path into any string format you need. This is useful for integrating with local scripts or tools that monitor the clipboard.

## Configuration

This extension contributes the following settings, which you can configure in your `settings.json` file:

*   `remote-open.mappings`: An object mapping remote POSIX roots to client path prefixes.
    ```json
    "remote-open.mappings": {
      "/home/user/project-a": "C:\\Users\\user\\dev\\project-a",
      "/var/www/html": "Z:/projects/company-website"
    }
    ```
    Remote roots must be absolute POSIX paths. Client roots must be absolute paths and use one separator style consistently. The extension preserves that style, so both `Z:/projects/app` and `Z:\\projects\\app` are supported. VS Code merges mapping objects across User, Remote, Workspace, and Workspace Folder settings; a higher-priority scope overrides the same remote root.
    The extension runs in the local UI Extension Host and validates each client root against the client's operating system. Windows accepts drive and UNC paths with either slash style; macOS and Linux accept POSIX paths.

*   `remote-open.transformers`: An array of custom transformation rules.
    ```json
    "remote-open.transformers": [
      {
        "name": "Open in Explorer",
        "rule": "exp_://${mapped}"
      },
      {
        "name": "Open in Custom Editor",
        "rule": "my-editor-uri://${mapped}"
      }
    ]
    ```
    In the `rule`, `${mapped}` will be replaced with the mapped local path.

## Usage

1.  Configure your path mappings in the settings.
2.  (Optional) Configure your transformers for custom actions.
3.  Right-click on a file or folder in a remote explorer.
4.  Select one of the "Remote Open" context menu options:
    *   **Copy Local Mapped Path:** Copies the plain local path.
    *   **Transform and Copy...:** Shows a dropdown of your configured transformers. Selecting one will apply the rule and copy the result to the clipboard.

## Release Notes

### 0.1.0

Initial release of Remote Open, with support for path mapping and custom transformers.
