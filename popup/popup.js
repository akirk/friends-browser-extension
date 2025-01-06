document.addEventListener("DOMContentLoaded", () => {
	const browser = window.browser || window.chrome;
	browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const activeTab = tabs[0];
		browser.scripting.executeScript(
		{
			target: { tabId: activeTab.id },
			func: detectFeeds
		},
		(results) => {
			const feedList = document.querySelector('#feedList ul');
			const postCollections = document.querySelector('#postCollections ul');
			const meList = document.querySelector('#meList ul');
			const friendsSection = document.querySelector('#friendsSection ul');
			const message = results[0].result;
			const feeds = message.feeds;
			if ( ! feeds ) {
				return;
			}
			const mastodon = message.mastodon;
			let a, li;
			li = document.createElement("li");
			li.classList.add("panel-list-item");

			a = document.createElement("a");
			a.href = browser.runtime.getURL('settings/options.html');
			a.title = a.href;
			a.target = '_blank';
			a.textContent = 'Please set your personal URL';

			li.appendChild(a);
			friendsSection.appendChild(li);

			browser.storage.sync.get().then((result) => {
				const personalHomeUrl = result.personalHomeUrl;
				if ( ! personalHomeUrl ) {
					return;
				}
				const addFriendUrl = personalHomeUrl + '?add-friend=' + encodeURIComponent( message.currentHost );
				const personalFriendsUrl = result.personalFriendsUrl;
				let replytoFriendsUrl = false;
				let boostatFriendsUrl = false;
				if ( Object.keys(mastodon).length > 0 ) {
					replytoFriendsUrl = personalFriendsUrl + '/type/status/?in_reply_to=' + encodeURIComponent( message.currentUrl );
					boostatFriendsUrl = personalFriendsUrl + '/type/status/?boost=' + encodeURIComponent( message.currentUrl );
				}
				document.getElementById('friendsHeader').textContent = personalHomeUrl.replace( /https?:\/\//, '' ).replace( /\/$/, '' );
				friendsSection.innerHTML = '';
				li = document.createElement("li");
				li.classList.add("panel-list-item");
				a = document.createElement('a');
				a.href = addFriendUrl;
				a.title = a.href;
				a.target = '_blank';
				if ( feeds.friendsPluginInstalled ) {
					a.textContent = 'Add ' + message.currentHost + ' as a friend';
				} else if ( mastodon && mastodon.username ) {
					a.textContent = 'Follow ' + mastodon.username;
					a = document.createElement('a');
					a.href = personalHomeUrl + '?add-friend=' + encodeURIComponent( '@' + mastodon.username );
					a.title = a.href;
					a.target = '_blank';
					li.appendChild(a);
				} else {
					a.textContent = 'Subscribe ' + message.currentHost;
				}
				li.appendChild(a);
				friendsSection.appendChild(li);

				if ( replytoFriendsUrl && mastodon && mastodon.title ) {
					li = document.createElement("li");
					li.classList.add("panel-list-item");
					a = document.createElement('a');
					a.href = replytoFriendsUrl;
					a.title = a.href;
					a.target = '_blank';
					a.textContent = 'Reply to ' + mastodon.title.substr( 0, 50 );
					li.appendChild(a);
					friendsSection.appendChild(li);
				}

				if ( boostatFriendsUrl && mastodon && mastodon.title ) {
					li = document.createElement("li");
					li.classList.add("panel-list-item");
					a = document.createElement('a');
					a.href = boostatFriendsUrl;
					a.title = a.href;
					a.target = '_blank';
					a.textContent = 'Boost ' + mastodon.title.substr( 0, 50 );
					li.appendChild(a);
					friendsSection.appendChild(li);
				}

				li = document.createElement("li");
				li.classList.add("panel-list-item");
				a = document.createElement('a');
				a.href = personalFriendsUrl;
				a.title = a.href;
				a.target = '_blank';
				a.textContent = 'Your Friends\' Latest Posts';

				li.appendChild(a);
				friendsSection.appendChild(li);

				postCollections.parentNode.style.display = 'none';
				console.log(result.postCollections)
				for (const postCollection of result.postCollections) {
					li = document.createElement("li");
					li.classList.add("panel-list-item");
					form = document.createElement("form");
					form.classList.add("panel-list-item");
					form.action = personalHomeUrl + '?user=' + postCollection.id + '&collect-post=' + encodeURIComponent( message.currentUrl );
					form.target = '_blank';
					form.method = 'post';

					const input = document.createElement('input');
					input.type = 'hidden';
					input.name = 'body';
					input.value = message.html;
					form.appendChild(input);

					a = document.createElement('button');
					a.title = form.action;
					a.textContent = 'Add to ' + postCollection.name;

					form.appendChild(a);
					li.appendChild(form);
					postCollections.appendChild(li);
					postCollections.parentNode.style.display = 'block';
				}
			});

			const mes = feeds.mes;

			meList.parentNode.style.display = 'none';
			for (me_url in mes) {
				if (mes.hasOwnProperty(me_url)) {

					li = document.createElement("li");
					li.classList.add("panel-list-item");
					a = document.createElement('a');
					a.href = me_url;
					a.title = a.href;
					a.target = '_blank';
					a.classList.add("text");
					a.textContent = mes[me_url];

					li.appendChild(a);
					meList.appendChild(li);
					meList.parentNode.style.display = 'block';
				}
			}

			feedList.parentNode.style.display = 'none';
			for (feed_url in feeds) {
				if (feeds.hasOwnProperty(feed_url)) {

					li = document.createElement("li");
					li.classList.add("panel-list-item");
					a = document.createElement('a');
					a.href = feed_url;
					a.title = a.href;
					a.target = '_blank';
					a.classList.add("text");
					a.textContent = feeds[feed_url];

					li.appendChild(a);
					feedList.appendChild(li);
					feedList.parentNode.style.display = 'block';
				}
			}

			document.querySelectorAll(".panel-list-item").forEach( (elem) => {
				elem.addEventListener('click', (event) => {

					const url = elem.getAttribute("data-href");
					if ( typeof chrome != 'undefined' && typeof browser == 'undefined' ) {
						browser = chrome;
					}

					if (url) {
						browser.tabs.create({url: url});
					} else {
						browser.runtime.openOptionsPage();
					}

				});

			});

		});
	});
	function detectFeeds() {
		let feeds = {
			feeds: {},
			mes: {},
			mastodon: {},
			friendsPluginInstalled: false,
			currentHost: window.location.host,
			currentUrl: window.location.href,
			html: document.documentElement.outerHTML
		};
		let url = document.querySelector("link[rel='canonical']");
		if ( url && url.href ) {
				feeds.currentUrl = url.href;
		}

		document.querySelectorAll("link[rel='alternate']").forEach( (elem) => {
			let type_attr = elem.getAttribute('type');
			if (!type_attr) {
				return;
			}

			let type = type_attr.toLowerCase();
			if (type.includes('rss') || type.includes('atom') || type.includes('feed')) {
				let title = elem.getAttribute('title');
				let url = elem.href;

				if (url) {
					feeds.feeds[url] = (title ? title : url);
				}
			}
			if (type.includes('application/activity+json')) {
				let url = elem.href;
				if (url) {
					try {
						feeds.mastodon.name = document.querySelector('meta[property="og:title"]').getAttribute('content');
						feeds.mastodon.username = document.querySelector('meta[property="profile:username"]').getAttribute('content');
						feeds.mastodon.title = document.querySelector('title').textContent;
						feeds.mastodon.url = url;
					} catch (e){
					}
				}
			}
		});
		document.querySelectorAll("link[rel='me'],a[rel='me']").forEach( (elem) => {
			let title = elem.getAttribute('title');
			let url = elem.href;

			if (url) {
				feeds.mes[url] = (title ? title : url);
			}
		});
		document.querySelectorAll("link[rel='friends-base-url']").forEach( (elem) => {
			let title = elem.getAttribute('title');
			let url = elem.href;

			if (url) {
				feeds.friendsPluginInstalled = url.replace( /wp-json\/friends\/v\d/, '' );
			}
		});

		return feeds;
	}
});
