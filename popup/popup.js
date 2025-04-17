document.addEventListener( "DOMContentLoaded", () => {
	const browser = window.browser || window.chrome;
	browser.tabs.query( { active: true, currentWindow: true }, ( tabs ) => {
		const activeTab = tabs[ 0 ];
		browser.scripting.executeScript(
			{
				target: { tabId: activeTab.id },
				func: detectFeeds
			},
			( results ) => {
				const feedList = document.querySelector( '#feedList ul' );
				const postCollections = document.querySelector( '#postCollections ul' );
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
					postCollections.parentNode.style.display = 'none';

					if ( message.currentHost == personalHomeUrl ) {
						document.getElementById( 'friendsHeader' ).textContent = 'Welcome Home!';
						const li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						const a = document.createElement( 'a' );
						a.href = personalFriendsUrl;
						a.title = a.href;
						a.target = 'self';
						a.textContent = 'Visit your own Friends page';
						li.appendChild( a );
						friendsSection.appendChild( li );
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

					for ( const postCollection of result.postCollections ) {
						li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						form = document.createElement( "form" );
						form.classList.add( "panel-list-item" );
						form.action = personalHomeUrl + '?user=' + postCollection.id + '&post-only=1&collect-post=' + encodeURIComponent( message.currentUrl );
						form.target = '_blank';
						form.method = 'post';
						form.enctype = 'application/x-www-form-urlencoded';

						const input = document.createElement( 'input' );
						input.type = 'hidden';
						input.name = 'body';
						input.value = message.html;
						form.appendChild( input );

						a = document.createElement( 'button' );
						a.title = form.action;
						a.textContent = 'Save this page to ' + postCollection.name;

						form.appendChild( a );
						li.appendChild( form );
						postCollections.appendChild( li );
						postCollections.parentNode.style.display = 'block';
					}
				} );

				const mes = feeds.mes;

				meList.parentNode.style.display = 'none';
				for ( me_url in mes ) {
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
				for ( feed_url in feeds ) {
					if ( feeds.hasOwnProperty( feed_url ) ) {

						li = document.createElement( "li" );
						li.classList.add( "panel-list-item" );
						a = document.createElement( 'a' );
						a.href = feed_url;
						a.title = a.href;
						a.target = '_blank';
						a.classList.add( "text" );
						a.textContent = feeds[ feed_url ];

						li.appendChild( a );
						feedList.appendChild( li );
						feedList.parentNode.style.display = 'block';
					}
				}

				document.querySelectorAll( ".panel-list-item" ).forEach( ( elem ) => {
					elem.addEventListener( 'click', ( event ) => {

						const url = elem.getAttribute( "data-href" );
						if ( typeof chrome != 'undefined' && typeof browser == 'undefined' ) {
							browser = chrome;
						}

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
						console.log( 'activitypub', feeds.activitypub );
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
		console.log( feeds );
		return feeds;
	}
} );
