# Remote Open

This extension provides a flexible way to handle remote file paths by mapping them to your local machine. You can copy the local path directly or apply custom transformations to it, which can be used to trigger local scripts or open files in specific applications.

## Features

*   **Copy Local Mapped Path:** Right-click on a file in a remote explorer and instantly copy its corresponding local path to your clipboard.
*   **Custom Transformers:** Define your own rules to transform the mapped path into any string format you need. This is useful for integrating with local scripts or tools that monitor the clipboard.

## Configuration

This extension contributes the following settings, which you can configure in your `settings.json` file:

*   `remote-open.mappings`: An array of remote-to-local path mappings.
    ```json
    "remote-open.mappings": [
      {
        "remote": "/home/user/project-a",
        "local": "C:\\Users\\user\\dev\\project-a"
      }
    ]
    ```
    `remote` must be an absolute POSIX path. `local` must be an absolute client path and must use one separator style consistently. The extension preserves that style in copied paths, so both `Z:/projects/app` and `Z:\\projects\\app` are supported.

*   `remote-open.mappingFilePath`: Path to a YAML file containing additional path mappings. This is useful for sharing mappings across a team.
    **Example `mappings.yaml`:**
    ```yaml
mappings:
  - remote: "/var/www/html"
    local: "C:\\Users\\user\\projects\\company-website"
    ```

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
