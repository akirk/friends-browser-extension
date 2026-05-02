const browser = window.browser || window.chrome;

function saveOptions(e) {
	e.preventDefault();
	try {
		var url = document.getElementById("personalHomeUrl").value;
		if ( url.substr( 0, 7 ) !== 'http://' && url.substr( 0, 8 ) !== 'https://' ) {
			url = 'https://' + url;
		}
		const save = {
			personalHomeUrl: url,
			baseUrl: null,
			actions: [],
		};
		var apiKey = document.getElementById("apiKey").value;
		if ( apiKey ) {
			save.apiKey = apiKey;
		}
		document.getElementById("actionsHolder").style.display = 'none';
		document.getElementById("actionsList").textContent = '';
		browser.storage.sync.set( save );
		browser.storage.sync.get({ hiddenActions: [], actionOverrides: {} }).then( stored => {
			getVersion( Object.assign( save, stored ) );
		} );

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
	const base = { personalHomeUrl: url };
	var apiKey = document.getElementById("apiKey").value;
	if ( apiKey ) {
		base.apiKey = apiKey;
	}
	browser.storage.sync.get({ hiddenActions: [], actionOverrides: {} }).then( stored => {
		getVersion( Object.assign( base, stored ) );
	} );
}

function onError(error) {
	console.log(`Error: ${error}`);
	document.getElementById("note").style.display = 'block';
	document.getElementById("note").textContent = 'Error: ' + error;
}

function getVersion( result ) {
	document.getElementById("friendsVersion").textContent = 'Friends Version: loading...';
	if ( result.baseUrl ) {
		updateVersion( result.baseUrl );
		return;
	}

	const homeUrl = result.personalHomeUrl.replace( /\/$/, '' );
	updateVersion( homeUrl + '/wp-json/friends/v1' )
		.catch( () => {
			fetch( result.personalHomeUrl )
				.then( response => response.text() )
				.then( text => {
					let base = '';
					try {
						const parser = new DOMParser();
						const doc = parser.parseFromString( text, 'text/html' );
						const friendsLink = doc.querySelector( 'link[rel="friends-base-url"]' );
						if ( friendsLink ) {
							base = friendsLink.getAttribute( 'href' );
						} else {
							const wpApiLink = doc.querySelector( 'link[rel="https://api.w.org/"]' );
							if ( wpApiLink ) {
								base = wpApiLink.getAttribute( 'href' ) + 'friends/v1';
							}
						}
					} catch (e) {
						console.log( 'Error parsing base url', e );
					}
					if ( base ) {
						updateVersion( base );
					} else {
						document.getElementById("friendsVersion").textContent = 'Friends Version: Error, REST base could not be found.';
					}
				} )
				.catch( () => {
					document.getElementById("friendsVersion").textContent = 'Friends Version: Error, REST base could not be found.';
				} );
		} );

	function updateVersion( base ) {
		const extensionVersion = browser.runtime.getManifest().version;
		const options = {};
		if ( result.apiKey ) {
			options.method = 'POST';
			options.body = 'key=' + encodeURIComponent( result.apiKey );
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded'
			};
		}

		return fetch( base + '/extension?version=' + extensionVersion, options )
			.then( response => {
				if ( ! response.ok ) throw new Error( 'HTTP ' + response.status );
				return response.json();
			} )
			.then( json => {
				result.baseUrl = base;
				browser.storage.sync.set( result );

				document.getElementById("friendsVersion").textContent = 'Friends Version: ' + json.version;
				document.getElementById("settingsUrl").href = json.settings_url;
				document.getElementById("keyInput").style.display = 'flex';
				result.personalFriendsUrl = json.friends_url;

				const actions = json.actions || ( json.post_collections || [] ).map( ( c ) => ( {
					name: c.name,
					url: c.url,
				} ) );

				const hiddenActions = new Set( result.hiddenActions || [] );
				const actionOverrides = Object.assign( {}, result.actionOverrides );

				if ( actions.length ) {
					renderActionsList();
				} else if ( result.apiKey ) {
					document.getElementById("note").style.display = 'block';
					document.getElementById("note").textContent = 'Key not accepted — no actions available.';
				}

				result.actions = actions;
				browser.storage.sync.set( result );

				function renderActionsList() {
					document.getElementById("actionsHolder").style.display = 'block';
					const actionsList = document.getElementById("actionsList");
					actionsList.textContent = '';

					const categorized = new Map();
					for ( const action of actions ) {
						const override = actionOverrides[ action.url ] || {};
						const effectiveName = override.name !== undefined ? override.name : action.name;
						const effectiveCategory = override.category !== undefined ? override.category : ( action.category || '' );
						const effective = { ...action, name: effectiveName, category: effectiveCategory };
						if ( ! categorized.has( effectiveCategory ) ) categorized.set( effectiveCategory, [] );
						categorized.get( effectiveCategory ).push( effective );
					}

					const sortedCategories = [ ...categorized.keys() ].sort( ( a, b ) => {
						if ( a === '' ) return 1;
						if ( b === '' ) return -1;
						return a.localeCompare( b );
					} );

					for ( const category of sortedCategories ) {
						const categoryActions = categorized.get( category ).sort( ( a, b ) => a.name.localeCompare( b.name ) );

						const headerLi = document.createElement( 'li' );
						headerLi.className = 'category-header';
						headerLi.textContent = category || 'Actions';
						actionsList.appendChild( headerLi );

						for ( const action of categoryActions ) {
							const origAction = actions.find( a => a.url === action.url );
							const origName = origAction ? origAction.name : action.name;
							const origCategory = origAction ? ( origAction.category || '' ) : action.category;

							const li = document.createElement( 'li' );
							li.className = 'category-item';

							const viewDiv = document.createElement( 'div' );
							viewDiv.className = 'action-view';

							const label = document.createElement( 'label' );
							const checkbox = document.createElement( 'input' );
							checkbox.type = 'checkbox';
							checkbox.checked = ! hiddenActions.has( action.url );
							checkbox.addEventListener( 'change', () => {
								if ( checkbox.checked ) {
									hiddenActions.delete( action.url );
								} else {
									hiddenActions.add( action.url );
								}
								browser.storage.sync.set( { hiddenActions: [ ...hiddenActions ] } );
							} );
							label.appendChild( checkbox );
							label.appendChild( document.createTextNode( ' ' + action.name ) );
							viewDiv.appendChild( label );

							const editBtn = document.createElement( 'button' );
							editBtn.type = 'button';
							editBtn.className = 'action-edit-btn';
							editBtn.textContent = 'edit';
							viewDiv.appendChild( editBtn );
							li.appendChild( viewDiv );

							const editDiv = document.createElement( 'div' );
							editDiv.className = 'action-edit';
							editDiv.style.display = 'none';

							const nameInput = document.createElement( 'input' );
							nameInput.type = 'text';
							nameInput.value = action.name;
							nameInput.placeholder = origName;

							const catInput = document.createElement( 'input' );
							catInput.type = 'text';
							catInput.value = action.category;
							catInput.placeholder = origCategory || 'Category';

							const saveBtn = document.createElement( 'button' );
							saveBtn.type = 'button';
							saveBtn.className = 'action-save-btn';
							saveBtn.textContent = 'Save';

							const cancelBtn = document.createElement( 'button' );
							cancelBtn.type = 'button';
							cancelBtn.textContent = 'Cancel';

							const resetBtn = document.createElement( 'button' );
							resetBtn.type = 'button';
							resetBtn.textContent = 'Reset';

							editDiv.appendChild( nameInput );
							editDiv.appendChild( catInput );
							editDiv.appendChild( saveBtn );
							editDiv.appendChild( cancelBtn );
							editDiv.appendChild( resetBtn );
							li.appendChild( editDiv );

							editBtn.addEventListener( 'click', () => {
								viewDiv.style.display = 'none';
								editDiv.style.display = '';
								nameInput.focus();
							} );

							cancelBtn.addEventListener( 'click', () => {
								viewDiv.style.display = '';
								editDiv.style.display = 'none';
							} );

							saveBtn.addEventListener( 'click', () => {
								const newName = nameInput.value.trim() || origName;
								const newCategory = catInput.value.trim();
								const override = {};
								if ( newName !== origName ) override.name = newName;
								if ( newCategory !== origCategory ) override.category = newCategory;

								if ( Object.keys( override ).length > 0 ) {
									actionOverrides[ action.url ] = override;
								} else {
									delete actionOverrides[ action.url ];
								}
								browser.storage.sync.set( { actionOverrides: { ...actionOverrides } } );
								renderActionsList();
							} );

							resetBtn.addEventListener( 'click', () => {
								delete actionOverrides[ action.url ];
								browser.storage.sync.set( { actionOverrides: { ...actionOverrides } } );
								renderActionsList();
							} );

							actionsList.appendChild( li );
						}
					}
				}
			} );
	}
}


function restoreOptions() {

	function onResult(result) {
		document.getElementById("personalHomeUrl").value = result.personalHomeUrl;
		document.getElementById("apiKey").value = result.apiKey || '';
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
			actions: [],
			hiddenActions: [],
			actionOverrides: {},
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
