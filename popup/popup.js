document.addEventListener("DOMContentLoaded", function(event) {
	const feedList = document.getElementById('feedList');
	const meList = document.getElementById('meList');
	const friendsSection = document.getElementById('friendsSection');

	const url = new URL(location.href);
	const feeds = JSON.parse(url.searchParams.get('feeds'));
	let a, li;

	feedList.style.display = 'none';
	for (feed_url in feeds) {
		if (feeds.hasOwnProperty(feed_url)) {

			li = document.createElement("div");
			li.classList.add("panel-list-item");
			li.setAttribute("data-href", feed_url);

			a = document.createElement("div");
			a.classList.add("text");
			a.innerText = feeds[feed_url];

			li.appendChild(a);
			feedList.appendChild(li);
			feedList.style.display = 'block';
		}
	}

	const mes = JSON.parse(url.searchParams.get('mes'));

	meList.style.display = 'none';
	for (me_url in mes) {
		if (mes.hasOwnProperty(me_url)) {

			li = document.createElement("div");
			li.classList.add("panel-list-item");
			li.setAttribute("data-href", me_url);

			a = document.createElement("div");
			a.classList.add("text");
			a.innerText = mes[me_url];

			li.appendChild(a);
			meList.appendChild(li);
			meList.style.display = 'block';
		}
	}

	const personalHomeUrl = url.searchParams.get('personalHomeUrl');
	if ( personalHomeUrl ) {
		document.getElementById('friendsHeader').innerText = personalHomeUrl.replace( /https?:\/\//, '' ).replace( /\/$/, '' );

		li = document.createElement("div");
		li.classList.add("panel-list-item");
		li.setAttribute("data-href", url.searchParams.get('addFriendUrl'));

		a = document.createElement("div");
		a.classList.add("text");
		if ( url.searchParams.get('friendsPluginInstalled') ) {
			a.innerText = 'Add ' + url.searchParams.get('currentHost') + ' as a friend';
		} else {
			a.innerText = 'Subscribe ' + url.searchParams.get('currentHost');
		}
		li.appendChild(a);
		friendsSection.appendChild(li);

		li = document.createElement("div");
		li.classList.add("panel-list-item");
		li.setAttribute("data-href", url.searchParams.get('personalFriendsUrl'));

		a = document.createElement("div");
		a.classList.add("text");
		a.innerText = 'Your Friends\' Latest Posts';

		li.appendChild(a);
		friendsSection.appendChild(li);
	} else {
		li = document.createElement("div");
		li.classList.add("panel-list-item");

		a = document.createElement("div");
		a.classList.add("text");
		a.innerText = 'Please set your personal URL';

		li.appendChild(a);
		friendsSection.appendChild(li);
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
