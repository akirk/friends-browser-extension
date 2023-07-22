(function() {
	/**
	 * Check and set a global guard variable.
	 * If this content script is injected into the same page again,
	 * it will do nothing next time.
	 */
	if (window.hasRun) {
		console.log('already run');
		return;
	}

	window.hasRun = true;
	if ( typeof chrome != 'undefined' && typeof browser == 'undefined' ) {
		browser = chrome;
	}

	// defaults
	var options = {
		personalHomeUrl: null
	};

	let xml_parser = new XMLSerializer();
	let html_parser = new DOMParser();

	function xhrdoc(url, type, cb) {
		let xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);

		xhr.responseType = 'document';
		xhr.overrideMimeType('text/' + type);

		xhr.onload = () => {
			if (xhr.readyState === xhr.DONE) {
				if (xhr.status === 200) {
					let resp = type == 'xml' ? xhr.responseXML : xhr.response;
					cb(resp);
				}
			}
		};

		xhr.send(null);
	}

	function applyxsl(xmlin, xsl, node, doc = document) {
		let xsltProcessor = new XSLTProcessor();
		xsltProcessor.importStylesheet(xsl);
		xsltProcessor.setParameter(null, 'fullPreview', options.fullPreview);
		xsltProcessor.setParameter(null, 'doAuthor', options.doAuthor);
		let fragment = xsltProcessor.transformToFragment(xmlin, doc);
		node.appendChild(fragment);
	}

	function getlang() {
		return browser.i18n.getUILanguage();
	}

	function formatsubtitle() {
		try {
			let feed_desc = document.getElementById('feedSubtitleRaw');

			let html_desc = html_parser.parseFromString(
				'<h2 id="feedSubtitleText">' + feed_desc.innerText + '</h2>',
				'text/html'
			);
			let xml_desc = xml_parser.serializeToString(html_desc.body.firstChild);

			feed_desc.insertAdjacentText('afterend', xml_desc);

			feed_desc.parentNode.removeChild(feed_desc);
		} catch (e) {
			console.error(e);
			console.log(feed_desc.innerText);
		}
	}

	function formatdescriptions(el = document) {
		// unescapes descriptions to html then to xml
		let tohtml = el.getElementsByClassName('feedRawContent');

		for (let i = 0; i < tohtml.length; i++) {

			try {
				let html_txt = '';
				if (tohtml[i].getAttribute('desctype') == 'text/plain') {
					html_txt = '<div class="feedEntryContent" style="white-space: pre-wrap;" >' + tohtml[i].innerHTML + '</div>';
				}
				else if (tohtml[i].getAttribute('desctype') == 'xhtml') {
					html_txt = '<div class="feedEntryContent">' + tohtml[i].innerHTML + '</div>';
				}
				else {
					html_txt = '<div class="feedEntryContent">' + tohtml[i].textContent + '</div>';
				}

				let html_desc = html_parser.parseFromString(html_txt, 'text/html');
				let xml_desc = xml_parser.serializeToString(
					html_desc.body.firstChild
				);

				tohtml[i].insertAdjacentText('afterend', xml_desc);
				tohtml[i].setAttribute('todel', 1);
			} catch (e) {
				console.error(e);
				console.log(tohtml[i]);
			}

		}

		el.querySelectorAll('.feedRawContent').forEach(a => {
			if (a.getAttribute('todel') == '1') {
				a.remove();
			}
		});
	}

	function removeemptyenclosures(el = document) {
		let encs = el.getElementsByClassName('enclosures');

		for (let i = 0; i < encs.length; i++)
			if (!encs[i].firstChild) encs[i].style.display = 'none';
	}

	function formatfilenames(el = document) {
		let encfn = el.getElementsByClassName('enclosureFilename');

		for (let i = 0; i < encfn.length; i++) {
			let url = new URL(encfn[i].innerText);

			if (url) {
				let fn = url.pathname.split('/').pop();

				if (fn != '') encfn[i].innerText = fn;
			}
		}
	}

	function formatfilesizes(el = document) {
		function humanfilesize(size) {
			let i = 0;

			if (size && size != '' && size > 0)
				i = Math.floor(Math.log(size) / Math.log(1024));

			return (
				(size / Math.pow(1024, i)).toFixed(2) * 1 +
				' ' +
				['B', 'kB', 'MB', 'GB', 'TB'][i]
			);
		}

		let encsz = el.getElementsByClassName('enclosureSize');
		for (let i = 0; i < encsz.length; i++) {
			let hsize = humanfilesize(encsz[i].innerText);

			if (hsize) encsz[i].innerText = hsize;
		}
	}

	function formattitles(el = document) {
		let et = el.getElementsByClassName('entrytitle');

		for (let i = 0; i < et.length; i++) {
			//basically removes html content if there is some
			//only do it if there's a tag to avoid doing it when text titles cointain a '&'
			//(which can be caught but still displays an error in console, which is annoying)
			if (et[i].innerText.indexOf('<') >= 0) {
				let tmp = document.createElement('span');
				try {
					tmp.textContent = et[i].innerText;
					et[i].innerText = tmp.textContent;
				} catch (e) {
					console.error(e);
					console.log(et[i].innerText);
				}
			}
		}
	}

	function formatdates(el = document) {
		let lang = getlang();
		if (!lang) return;

		let opts = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		};

		let ed = el.getElementsByClassName('lastUpdated');
		for (let i = 0; i < ed.length; i++) {
			let d = new Date(ed[i].innerText);
			if (isNaN(d)) continue;

			let dstr =
				d.toLocaleDateString(lang, opts) + ' ' + d.toLocaleTimeString(lang);

			ed[i].innerText = dstr;
		}

		let lu = el.getElementById('feedLastUpdate');
		if (lu && lu.innerText.trim() != "") {
			lu.innerText = "Last updated: " + lu.innerText;
		}
	}

	function extensionimages(el = document) {
		let extimgs = el.getElementsByClassName('extImg');

		for (let i = 0; i < extimgs.length; i++)
			extimgs[i].src = browser.runtime.getURL(
				extimgs[i].attributes['data-src'].nodeValue
			);
	}

	function applysettings() {

		document.querySelectorAll('.mediaThumb').forEach((elem) => {
			elem.style.display = options.doThumb ? "block" : "none";
		});


		document.querySelectorAll('img').forEach((elem) => {
			if (options.doMaxWidth)
				elem.style["max-width"] = options.valMaxWidth;
		});

	}

	function makepreviewhtml() {
		let doc = document.implementation.createHTMLDocument('');
		doc.body.id = "rsspreviewBody";

		let feedBody = doc.createElement('div');
		feedBody.id = 'feedBody';
		doc.body.appendChild(feedBody);

		let css = doc.createElement('link');
		css.setAttribute('rel', 'stylesheet');
		css.setAttribute('href', browser.runtime.getURL('preview.css'));
		doc.head.appendChild(css);

		if (options.enableCss && options.customCss) {
			let node = doc.createElement('style');
			node.textContent = options.customCss;
			doc.head.appendChild(node);
		}

		return doc;
	}

	function detect() {
		let rootNode = document.getRootNode().documentElement;

		// for chrome
		let d = document.getElementById('webkit-xml-viewer-source-xml');
		if (d && d.firstChild) rootNode = d.firstChild;

		const rootName = rootNode.nodeName.toLowerCase();

		let isRSS1 = false;

		if (rootName == 'rdf' || rootName == 'rdf:rdf')
			if (rootNode.attributes['xmlns'])
				isRSS1 = rootNode.attributes['xmlns'].nodeValue.search('rss') > 0;

		if (
			rootName == 'rss' ||
			rootName == 'channel' || // rss2
			rootName == 'feed' || // atom
			isRSS1
		)
			return rootNode;

		return null;
	}

	function main(feedNode) {
		let feed_url = window.location.href;
		let preview = makepreviewhtml();

		xhrdoc(browser.runtime.getURL('rss.xsl'), 'xml', xsl_xml => {
			applyxsl(feedNode, xsl_xml, preview.getElementById('feedBody'), preview);

			// replace the content with the preview document
			document.replaceChild(
				document.importNode(preview.documentElement, true),
				document.documentElement
			);

			let t0 = performance.now();

			formatsubtitle();

			formatdescriptions();
			removeemptyenclosures();
			formatfilenames();
			formatfilesizes();
			formattitles();
			formatdates();
			extensionimages();
			applysettings();

			let t1 = performance.now();
			//console.log("exec in: " + (t1 - t0) + "ms");

			document.title = document.getElementById('feedTitleText').innerText;
		});
	}

	function registerFeeds(feeds) {
		if (Object.keys(feeds.feeds).length > 0||Object.keys(feeds.mes).length > 0||Object.keys(feeds.mastodon).length > 0) {
			function handleResponse(message) {
			}

			function handleError(error) {
				console.log(error);
			}
			feeds.addFriendUrl = options.personalHomeUrl + '?add-friend=' + encodeURIComponent( window.location.href );
			feeds.personalFriendsUrl = options.personalHomeUrl + '/friends/';
			feeds.replytoFriendsUrl = options.personalHomeUrl + '/friends/type/status/?in_reply_to=' + encodeURIComponent( window.location.href );
			feeds.personalHomeUrl = options.personalHomeUrl;
			feeds.currentHost = window.location.host;
			let msg = browser.runtime.sendMessage(feeds);
			if ( msg ) {
				msg.then(handleResponse, handleError);
			}
		}
	}


	function findiTunesPodcastsFeeds() {
		let match = document.URL.match(/id(\d+)/)
		if (match) {
			let feeds = {};
			let itunesid = match[1];

			var xhr = new XMLHttpRequest();
			xhr.open('GET', "https://itunes.apple.com/lookup?id="+itunesid+"&entity=podcast");

			xhr.onload = function () {
				if (xhr.readyState === xhr.DONE) {
					if (xhr.status === 200) {
						let res = JSON.parse(xhr.responseText);

						if ("results" in res) {
							let pod = res["results"][0];
							let title = pod["collectionName"] || document.title;
							let url = pod["feedUrl"];
							if (url) {
								feeds[url] = title;
							}
						}
					}
				}

				registerFeeds({feeds});
			};
			xhr.send();
		}
	}

	function findYouTubeFeeds() {
		// YouTube's canonical channel URLs look like /channel/AlphaNumericID
		// It also supports named channels of the form /c/MyChannelName
		// Match on both of these to autodetect channel feeds on either URL
		let idPattern = /channel\/([a-zA-Z0-9_-]+)/;
		let namePattern = /(?:c|user)\/[a-zA-Z0-9_-]+/;
		let urlPattern = new RegExp(`${idPattern.source}|${namePattern.source}`);
		if (document.URL.match(urlPattern)) {
			let feeds = {};
			let canonicalUrl = document.querySelector("link[rel='canonical']").href;
			let channelId = canonicalUrl.match(idPattern)[1];
			let url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
			let title = document.title;
			feeds[url] = title;
			registerFeeds({feeds});
		}
	}

	// The default function used to find feeds if a domain-specific function doesn't exist.
	// Parse the document's HTML looking for link tags pointing to the feed URL.
	function defaultFindFeeds() {
		let feeds = {
			feeds: {},
			mes: {},
			mastodon: {},
			friendsPluginInstalled: false
		};
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
						feeds.mastodon.name = document.querySelector('meta[property=og\\\:title]').content;
						feeds.mastodon.username = document.querySelector('meta[property=profile\\\:username]').content;
						feeds.mastodon.url = url;
					} catch {}
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
		registerFeeds(feeds);
	}

	const domainFeedFinders = new Map([
		["itunes.apple.com", findiTunesPodcastsFeeds],
		["podcasts.apple.com", findiTunesPodcastsFeeds],
		["www.youtube.com", findYouTubeFeeds],
	]);

	function findFeeds() {
		// Look up a feed detection function based on the domain.
		// If a domain-specific function doesn't exist, fall back to a default.
		let finder = domainFeedFinders.get(document.domain) || defaultFindFeeds;
		finder();
	}


	function onOptions(opts) {
		if ( opts ) {
			options = opts;
		}

		let feedRoot = detect();

		if (feedRoot) {

			main(feedRoot);
		}

		else {

			findFeeds();
		}

	}

	function onError(error) {
		console.log(`Error on get options: ${error}`);
		onOptions();
	}

	try {
		let getting = browser.storage.sync.get(options);
		getting.then(onOptions, onError);
	} catch( e ) {
		onError(e);
	}

	window.addEventListener('popstate', function() {
		onOptions();
	} );
	window.addEventListener('click', function() {
		onOptions();
	} );
})();
