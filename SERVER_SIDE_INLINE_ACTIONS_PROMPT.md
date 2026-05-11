# Prompt: Add Inline Browser Extension Actions to the Friends WordPress Plugin

I have a browser extension for the Friends WordPress plugin that receives generic actions from the server via the `/wp-json/friends/v1/extension` endpoint. The extension now supports backward-compatible inline actions, so please update the server-side plugin to return suitable action definitions and add an endpoint to handle saving without navigating away from the current page.

## Goal

Add generic inline action support for saving the current browser page to a Friends/Post Collection destination without opening a new tab. The user should be able to optionally edit the page title and add tags before saving.

## Current Client-Side Contract

The extension still supports existing actions shaped like this:

```json
{
  "name": "Save this page",
  "category": "Save",
  "url": "https://example.com/some-target?collect-post={current_url}",
  "method": "POST",
  "fields": {
    "body": "{page_html}"
  }
}
```

For inline behavior, return actions with `run: "inline"`, `target: "inline"`, or `inline: true`.

## New Inline Action Shape

Return actions similar to this from `/wp-json/friends/v1/extension`:

```json
{
  "id": "save-to-post-collection-123",
  "name": "Save to Reading List",
  "category": "Save",
  "url": "https://example.com/wp-json/friends/v1/extension/action/save",
  "method": "POST",
  "run": "inline",
  "submit_label": "Save",
  "progress_message": "Saving…",
  "success_message": "Saved.",
  "fields": {
    "key": "THE_BROWSER_EXTENSION_KEY",
    "collection_id": "123",
    "url": "{current_url}",
    "html": "{page_html}"
  },
  "inputs": [
    {
      "name": "title",
      "label": "Title",
      "type": "text",
      "default": "{page_title}",
      "required": true
    },
    {
      "name": "tags",
      "label": "Tags",
      "type": "tags",
      "placeholder": "tag-one, tag-two"
    }
  ]
}
```

The extension replaces these placeholders:

- `{current_url}` / `{page_url}`: the active tab URL.
- `{current_host}`: the active tab origin.
- `{page_title}` / `{current_title}`: the active tab title.
- `{page_html}`: the full active tab document HTML.

## Save Endpoint

Create a REST endpoint such as:

```text
POST /wp-json/friends/v1/extension/action/save
```

It should accept `application/x-www-form-urlencoded` fields:

- `key`: the browser extension key, same authentication concept used by the existing extension endpoint.
- `collection_id`: destination collection/feed/list identifier.
- `url`: original page URL.
- `html`: captured page HTML, if needed by existing post collection logic.
- `title`: editable page title from the popup.
- `tags`: comma-separated or free-form tag text from the popup.

## Response Contract

Return JSON. On success:

```json
{
  "success": true,
  "message": "Saved to Reading List.",
  "edit_url": "https://example.com/wp-admin/post.php?post=456&action=edit",
  "url": "https://example.com/friends/collection/reading-list/example-post/",
  "link_label": "Open"
}
```

On failure, return an appropriate non-2xx HTTP status and JSON like:

```json
{
  "success": false,
  "message": "Invalid browser extension key."
}
```

## Implementation Notes

- Keep existing non-inline actions working for older extension versions.
- If the extension version sent to `/extension?version=...` is older than `1.6.0`, continue returning the previous URL/form actions.
- Expose a WordPress filter named `friends_browser_extension_actions` so other plugins can append custom actions. Pass the current action list and a context array/object with useful data such as the current user, extension version, Friends URLs, and whether the browser extension key was valid.
- Reuse the existing browser extension key validation instead of introducing a new auth system.
- Reuse existing Post Collection save/import code where possible so inline saving produces the same data as the current navigational flow.
- Sanitize and validate all submitted fields server-side. Treat `title`, `tags`, `url`, and `html` as untrusted input.
- Parse `tags` into the same taxonomy/metadata structure already used by Friends/Post Collections.
- Prefer returning both `edit_url` and public `url` when available; the extension will show an “Open” link for either.

## Acceptance Criteria

- `/wp-json/friends/v1/extension` returns at least one inline save action when a valid extension key is available.
- Clicking that action in the extension opens an inline form with title and tags fields.
- Submitting the form saves the current page without navigating the active tab or opening a new tab.
- The endpoint returns a success message that the extension displays in the popup.
- Existing old-style actions remain available or are returned for older extension versions.
