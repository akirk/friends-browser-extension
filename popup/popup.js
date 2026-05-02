document.addEventListener( "DOMContentLoaded", () => {
	const browser = window.browser || window.chrome;
	document.getElementById( 'settingsLink' ).href = browser.runtime.getURL( 'settings/options.html' );
	browser.tabs.query( { active: true, currentWindow: true }, ( tabs ) => {
		const activeTab = tabs[ 0 ];
		browser.scripting.executeScript(
			{
				target: { tabId: activeTab.id },
				func: detectFeeds
			},
			( results ) => {
				if ( ! results || ! results[ 0 ] ) {
					document.querySelectorAll( '.panel-section-list' ).forEach( ( el ) => el.style.display = 'none' );
					const msg = document.createElement( 'div' );
					msg.className = 'panel-section panel-section-list';
					const item = document.createElement( 'div' );
					item.className = 'panel-list-item disabled';
					item.textContent = 'Cannot run on this page.';
					msg.appendChild( item );
					document.body.appendChild( msg );
					return;
				}
				const feedList = document.querySelector( '#feedList ul' );
				const actionsList = document.querySelector( '#actions ul' );
				const meList = document.querySelector( '#meList ul' );
				const friendsSection = document.querySelector( '#friendsSection ul' );
				const message = results[ 0 ].result;
				const feeds = message.feeds;
				if ( !feeds ) {
					return;
				}
				const activitypub = message.activitypub;
				let a, li;
				li = document.createElement( "li" );
				li.classList.add( "panel-list-item" );

				a = document.createElement( "a" );
				a.href = browser.runtime.getURL( 'settings/options.html' );
				a.title = a.href;
				a.target = '_blank';
				a.textContent = 'Please set your personal URL';

				li.appendChild( a );
				friendsSection.appendChild( li );

				browser.storage.sync.get().then( ( result ) => {
					const personalHomeUrl = result.personalHomeUrl;
					if ( !personalHomeUrl ) {
						return;
					}
					const addFriendUrl = personalHomeUrl + '?add-friend=' + encodeURIComponent( message.currentHost );
					const personalFriendsUrl = result.personalFriendsUrl;
					let replytoFriendsUrl = false;
					let boostatFriendsUrl = false;
					if ( activitypub.url ) {
						replytoFriendsUrl = personalFriendsUrl + '/type/status/?in_reply_to=' + encodeURIComponent( activitypub.url );
						boostatFriendsUrl = personalFriendsUrl + '/type/status/?boost=' + encodeURIComponent( activitypub.url );
					}
					document.getElementById( 'friendsHeader' ).textContent = personalHomeUrl.replace( /https?:\/\//, '' ).replace( /\/$/, '' );
					friendsSection.innerHTML = '';
					actionsList.parentNode.style.display = 'none';

					if ( message.currentHost == personalHomeUrl ) {
						document.getElementById( 'friendsHeader' ).textContent = 'Welcome Home!';

						const friendsLi = document.createElement( "li" );
						friendsLi.classList.add( "panel-list-item" );
						const friendsA = document.createElement( 'a' );
						friendsA.href = personalFriendsUrl;
						friendsA.title = friendsA.href;
						friendsA.target = '_blank';
						friendsA.textContent = 'Visit your Friends page';
						friendsLi.appendChild( friendsA );
						friendsSection.appendChild( friendsLi );

						const settingsLi = document.createElement( "li" );
						settingsLi.classList.add( "panel-list-item" );
						const settingsA = document.createElement( 'a' );
						settingsA.href = personalHomeUrl.replace( /\/$/, '' ) + '/wp-admin/admin.php?page=friends-settings';
						settingsA.title = settingsA.href;
						settingsA.target = '_blank';
						settingsA.textContent = 'Friends Settings';
						settingsLi.appendChild( settingsA );
						friendsSection.appendChild( settingsLi );

						return;
					}


					li = document.createElement( "li" );
					li.classList.add( "panel-list-item" );
					a = document.createElement( 'a' );
					a.href = addFriendUrl;
					if ( message.friendsPluginInstalled ) {
						a.textContent = 'Add ' + ( message.name || message.currentTitle ).substr( 0, 50 ) + ' as a friend';
					} else if ( activitypub && activitypub.mastodon_username ) {
						a.textContent = 'Follow ' + activitypub.mastodon_username;
						a.href = personalHomeUrl + '?add-friend=' + encodeURIComponent( '@' + activitypub.mastodon_username );
					} else if ( activitypub && activitypub.url && message.name ) {
						a.textContent = 'Follow ' + message.name;
					} else {
						a.textContent = 'Subscribe ' + ( message.name || message.currentTitle ).substr( 0, 50 );
						if ( message.currentHost.match( /youtube\.com/ ) && Object.keys( feeds ).length > 0 ) {
							a.href = personalHomeUrl + '?add-friend=' + encodeURIComponent( Object.keys( feeds )[ 0 ] );
						}
					}
					a.title = a.href;
					a.target = '_blank';
					li.appendChild( a );
					friendsSection.appendChild( li );

					if ( replytoFriendsUrl && activitypub ) {
						li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						a = document.createElement( 'a' );
						a.href = replytoFriendsUrl;
						a.title = a.href;
						a.target = '_blank';
						a.textContent = 'Reply/React to ' + activitypub.title.substr( 0, 50 );
						li.appendChild( a );
						friendsSection.appendChild( li );
					}

					if ( boostatFriendsUrl && activitypub ) {
						li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						a = document.createElement( 'a' );
						a.href = boostatFriendsUrl;
						a.title = a.href;
						a.target = '_blank';
						a.textContent = 'Boost ' + activitypub.title.substr( 0, 50 );
						li.appendChild( a );
						friendsSection.appendChild( li );
					}

					li = document.createElement( "li" );
					li.classList.add( "panel-list-item" );
					a = document.createElement( 'a' );
					a.href = personalFriendsUrl;
					a.title = a.href;
					a.target = '_blank';
					a.textContent = 'Visit your own Friends page';

					li.appendChild( a );
					friendsSection.appendChild( li );

					const actions = result.actions || ( result.postCollections || [] ).map( ( c ) => ( {
						name: 'Save this page to ' + c.name,
						url: personalHomeUrl + '?user=' + c.id + '&post-only=1&collect-post={current_url}',
						method: 'POST',
						fields: { body: '{page_html}' },
					} ) );

					const hiddenActions = new Set( result.hiddenActions || [] );
					const actionOverrides = result.actionOverrides || {};
					const categorized = new Map();
					for ( const action of actions ) {
						if ( hiddenActions.has( action.url ) ) continue;
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

					if ( sortedCategories.length > 0 ) {
						const actionsContainer = actionsList.parentNode;
						actionsContainer.replaceChildren();

						for ( const category of sortedCategories ) {
							const categoryActions = categorized.get( category ).sort( ( a, b ) => a.name.localeCompare( b.name ) );
							const header = document.createElement( 'div' );
							header.className = 'panel-list-item disabled';
							header.textContent = category || 'Actions';
							actionsContainer.appendChild( header );

							const ul = document.createElement( 'ul' );
							for ( const action of categoryActions ) {
								li = document.createElement( 'li' );
								li.classList.add( 'panel-list-item' );

								if ( action.method === 'POST' ) {
									const form = document.createElement( 'form' );
									form.classList.add( 'panel-list-item' );
									form.action = action.url.replace( '{current_url}', encodeURIComponent( message.currentUrl ) );
									form.target = '_blank';
									form.method = 'post';
									form.enctype = 'application/x-www-form-urlencoded';

									for ( const [ name, value ] of Object.entries( action.fields || {} ) ) {
										const input = document.createElement( 'input' );
										input.type = 'hidden';
										input.name = name;
										input.value = value
											.replace( '{current_url}', message.currentUrl )
											.replace( '{page_html}', message.html );
										form.appendChild( input );
									}

									const button = document.createElement( 'button' );
									button.title = form.action;
									button.textContent = action.name;
									form.appendChild( button );
									li.appendChild( form );
								} else {
									a = document.createElement( 'a' );
									a.href = action.url.replace( '{current_url}', encodeURIComponent( message.currentUrl ) );
									a.title = a.href;
									a.target = '_blank';
									a.textContent = action.name;
									li.appendChild( a );
								}

								ul.appendChild( li );
							}
							actionsContainer.appendChild( ul );
						}

						actionsContainer.style.display = 'block';
					}
				} );

				const mes = message.feeds.mes;

				meList.parentNode.style.display = 'none';
				for ( const me_url in mes ) {
					if ( mes.hasOwnProperty( me_url ) ) {

						li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						a = document.createElement( 'a' );
						a.href = me_url;
						a.title = a.href;
						a.target = '_blank';
						a.classList.add( "text" );
						a.textContent = mes[ me_url ];

						li.appendChild( a );
						meList.appendChild( li );
						meList.parentNode.style.display = 'block';
					}
				}

				feedList.parentNode.style.display = 'none';
				for ( const feed_url in message.feeds ) {
					if ( message.feeds.hasOwnProperty( feed_url ) ) {

						li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						a = document.createElement( 'a' );
						a.href = feed_url;
						a.title = a.href;
						a.target = '_blank';
						a.classList.add( "text" );
						a.textContent = message.feeds[ feed_url ];

						li.appendChild( a );
						feedList.appendChild( li );
						feedList.parentNode.style.display = 'block';
					}
				}

				document.querySelectorAll( ".panel-list-item" ).forEach( ( elem ) => {
					elem.addEventListener( 'click', ( event ) => {

						const url = elem.getAttribute( "data-href" );
						if ( url ) {
							browser.tabs.create( { url: url } );
						} else {
							browser.runtime.openOptionsPage();
						}

					} );

				} );

			} );
	} );
	function detectFeeds() {
		// console.log( 'detectFeeds', window.location.href );
		let feeds = {
			feeds: {},
			mes: {},
			activitypub: {},
			friendsPluginInstalled: false,
			currentHost: window.location.protocol + '//' + window.location.host,
			currentTitle: document.title,
			name: null,
			currentUrl: window.location.href,
			html: document.documentElement.outerHTML
		};
		if ( document.querySelector( 'meta[property="og:site_name"]' ) ) {
			feeds.name = document.querySelector( 'meta[property="og:site_name"]' ).getAttribute( 'content' );
		} else if ( document.querySelector( '.h-card .p-name' ) ) {
			feeds.name = document.querySelector( '.h-card .p-name' ).textContent;
		}
		if ( feeds.name ) {
			feeds.name = feeds.name.replace( /^\s*/g, '' ).replace( /\s*$/g, '' );
		}
		let url = window.location.href;

		document.querySelectorAll( "link[rel='alternate']" ).forEach( ( elem ) => {
			let type_attr = elem.getAttribute( 'type' );
			if ( !type_attr ) {
				return;
			}

			let type = type_attr.toLowerCase();
			if ( type.includes( 'rss' ) || type.includes( 'atom' ) || type.includes( 'feed' ) ) {
				let title = elem.getAttribute( 'title' );
				let url = elem.href;

				if ( url ) {
					feeds.feeds[ url ] = ( title ? title : url );
				}
			}
			if ( type.includes( 'application/activity+json' ) ) {
				if ( url ) {
					try {
						const og_title = document.querySelector( 'meta[property="og:title"]' );
						if ( og_title ) {
							feeds.activitypub.name = og_title.getAttribute( 'content' );
						}
						feeds.activitypub.title = document.querySelector( 'title' ).textContent;
						feeds.activitypub.url = elem.getAttribute( 'href' );

						const username = document.querySelector( 'meta[property="profile:username"]' );
						if ( username ) {
							feeds.activitypub.mastodon_username = username.getAttribute( 'content' );
							feeds.activitypub.url = false;
							if ( url.match( /\/\d+\/?$/ ) ) {
								feeds.activitypub.url = url;
							}
						}
					} catch ( e ) {
						console.log( 'Error', e );
					}
				}
			}
		} );
		document.querySelectorAll( "link[rel='me'],a[rel='me']" ).forEach( ( elem ) => {
			let title = elem.getAttribute( 'title' );
			let url = elem.href;

			if ( url ) {
				feeds.mes[ url ] = ( title ? title : url );
			}
		} );
		document.querySelectorAll( "link[rel='friends-base-url']" ).forEach( ( elem ) => {
			let title = elem.getAttribute( 'title' );
			let url = elem.href;

			if ( url ) {
				feeds.friendsPluginInstalled = url.replace( /wp-json\/friends\/v\d/, '' );
			}
		} );
		return feeds;
	}
} );
