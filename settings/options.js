const browser = window.browser || window.chrome;

function saveOptions(e) {
	e.preventDefault();
	try {
		var url = document.getElementById("personalHomeUrl").value;
		if ( url.substr( 0, 7 ) !== 'http://' && url.substr( 0, 8 ) !== 'https://' ) {
			url = 'https://' + url;
		}
		const save = {
			personalHomeUrl: url
		};
		var apiKey = document.getElementById("apiKey").value;
		if ( apiKey ) {
			save.apiKey = apiKey;
		}
		getVersion( save );

		document.getElementById("note").style.display = 'block';
		document.getElementById("note").textContent = 'Saved!';

	} catch (e) {
		document.getElementById("note").style.display = 'block';
		document.getElementById("note").textContent = 'Error: ' + e;
		onError(e);
	}
}

function updateLink(e) {
	const url = document.getElementById("personalHomeUrl").value;
	const save = {
		personalHomeUrl: url
	};
	var apiKey = document.getElementById("apiKey").value;
	if ( apiKey ) {
		save.apiKey = apiKey;
	}
	getVersion( save );

}

function onError(error) {
	console.log(`Error: ${error}`);
	document.getElementById("note").style.display = 'block';
	document.getElementById("note").textContent = 'Error: ' + error;
}

function getVersion( result ) {
	document.getElementById("friendsVersion").textContent = 'Friends Version: loading...';
	let base = '';
	if ( result.baseUrl ) {
		return updateVersion( result );
	}
	fetch(result.personalHomeUrl).then(response => response.text()).then(text => {
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, 'text/html');
			const link = doc.querySelector('link[rel="friends-base-url"]');
			if (link) {
				base = link.getAttribute('href');
			}
		} catch (e) {
			console.log('Error parsing base url', e);
		}
	}).then(() => {
		if ( base ) {
			result.baseUrl = base;

			result = updateVersion( result );
			browser.storage.sync.set( result );
			return;
		}
		document.getElementById("friendsVersion").textContent = 'Friends Version: Error, REST base could not be found.';
	}
	);

	function updateVersion( result ) {
		if ( ! result || ! result.baseUrl ) {
			return result;
		}
		const extensionVersion = browser.runtime.getManifest().version;
		const options = {};
		if ( result.apiKey ) {
			options.method = 'POST';
			options.body = 'key=' + encodeURIComponent(result.apiKey);
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded'
			};
		}

		fetch(result.baseUrl + '/extension?version=' + extensionVersion, options).then(response => response.json()).then(json => {
			document.getElementById("friendsVersion").textContent = 'Friends Version: ' + json.version;
			document.getElementById("settingsUrl").href = json.settings_url;
			document.getElementById("keyInput").style.display = 'table-row';
			result.personalFriendsUrl = json.friends_url;

			if ( json.post_collections ) {
				document.getElementById("postCollectionsHolder").style.display = 'block';
				document.getElementById("postCollections").innerHTML = '';
				for ( let i = 0; i < json.post_collections.length; i++ ) {
					const collection = json.post_collections[i];
					const li = document.createElement('li');
					const a = document.createElement('a');
					a.href = collection.url;
					a.textContent = collection.name;
					li.appendChild(a);
					document.getElementById("postCollections").appendChild(li);
				}
				result.postCollections = json.post_collections;
				browser.storage.sync.set( result );
			}

		} );

		return result;
	}
}


function restoreOptions() {

	function onResult(result) {
		console.log( result );
		document.getElementById("personalHomeUrl").value = result.personalHomeUrl;
		document.getElementById("apiKey").value = result.apiKey;
		document.getElementById("personalHomeUrl").focus();
		try {
			if ( result.personalHomeUrl ) {
				getVersion( result );
			}
		} catch (e) {
			console.log('Error updating version', e);
		}
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}
	document.getElementById('icon').src = browser.runtime.getURL('icons/icon-19.png');
	try {
		var getting = browser.storage.sync.get({
			personalHomeUrl: null,
			personalFriendsUrl: null,
			apiKey: null,
			baseUrl: null,
			postCollections: null
		});
		getting.then(onResult, onError);
	} catch (e) {
		onError(e);
	}
}



document.addEventListener("DOMContentLoaded", restoreOptions);

// save when clicking the button #save
document.querySelector("#save").addEventListener("click", saveOptions);
document.querySelector("#personalHomeUrl").addEventListener("keyup", updateLink);

