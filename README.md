# Friends Browser Extension

The extension works in Firefox and Chrome and acts as a companion to the  [Friends Plugin](https://wordpress.org/plugins/friends/) for WordPress.

It allows quick insight into:
- The feeds offered by the current page as `<link rel="alternative" />`.
- Other profiles of the user shown as `<link rel="me" />`.

After you have set your WordPress URL, it can also:
- Add the current page as a friend.

If you are on a Mastodon instance, it can also:
- Follow the user on Mastodon.
- Reply to the currently viewed toot.

If you enter the browser extension key that you can find on your Friends page (link in the extension), you can:
- Submit the current page to a page collection.

![Screenshot of the Extension](screenshot.png)

![Screenshot of Settings](screenshot2.png)

## Privacy

This extension does not collect any data on behalf of the developer. All data (your WordPress site URL and API key) is stored locally in your browser and only sent to your own self-hosted WordPress instance. The `data_collection_permissions: { required: ["none"] }` in the manifest reflects this.

## Providing Custom Actions

The extension can show generic actions provided by your WordPress site through the Friends plugin extension endpoint. This lets the server decide which actions are available for the current user, while the browser extension handles rendering them in the popup.

Actions are returned by the Friends plugin from:

```
/wp-json/friends/v1/extension
```

Each action should include at least a `name` and `url`:

```json
{
  "name": "Save this page",
  "category": "Save",
  "url": "https://example.com/some-target?url={current_url}",
  "method": "GET"
}
```

For a traditional action, the extension opens the URL or submits the form in a new tab. Supported placeholders are:

- `{current_url}` / `{page_url}`: the active tab URL.
- `{current_host}`: the active tab origin.
- `{page_title}` / `{current_title}`: the active tab title.
- `{page_html}`: the full HTML of the active tab.

POST actions can send hidden fields:

```json
{
  "name": "Archive page",
  "category": "Save",
  "url": "https://example.com/wp-json/my-plugin/v1/archive",
  "method": "POST",
  "fields": {
    "url": "{current_url}",
    "title": "{page_title}",
    "html": "{page_html}"
  }
}
```

Inline actions avoid navigating away from the current page. Add `run: "inline"` and optional `inputs` to let the user edit values before submitting:

```json
{
  "name": "Save to Reading List",
  "category": "Save",
  "url": "https://example.com/wp-json/my-plugin/v1/save",
  "method": "POST",
  "run": "inline",
  "submit_label": "Save",
  "success_message": "Saved.",
  "fields": {
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

Inline endpoints should return JSON. A successful response can include a message and a URL for the extension to show:

```json
{
  "success": true,
  "message": "Saved to Reading List.",
  "edit_url": "https://example.com/wp-admin/post.php?post=123&action=edit",
  "link_label": "Open"
}
```

Server-side integrations can add their actions to the Friends plugin action list with the `friends_browser_extension_actions` WordPress filter:

```php
add_filter( 'friends_browser_extension_actions', function ( $actions, $context ) {
	$actions[] = array(
		'name' => 'Save to Reading List',
		'category' => 'Save',
		'url' => rest_url( 'my-plugin/v1/save' ),
		'method' => 'POST',
		'run' => 'inline',
		'fields' => array(
			'url' => '{current_url}',
		),
		'inputs' => array(
			array(
				'name' => 'title',
				'label' => 'Title',
				'type' => 'text',
				'default' => '{page_title}',
			),
		),
	);

	return $actions;
}, 10, 2 );
```

If your action requires authentication, validate the Friends browser extension key or use another server-side permission check before processing submitted data.

## Testing on Firefox Mobile

Follow a guide like [Debugging Firefox on Android](https://chenhuijing.com/blog/debugging-firefox-on-android/), get your device id with `adb devices -l`, go to `about:debugging` in Firefox, enable remote debugging, and run the extension with:

```
web-ext run -t firefox-android --adb-device <deviceid> --firefox-apk org.mozilla.firefox
```
