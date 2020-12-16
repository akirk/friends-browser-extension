document.addEventListener("DOMContentLoaded", function(event) {
	const feedList = document.getElementById('feedList');
	const meList = document.getElementById('meList');
	const addFriend = document.getElementById('addFriend');

	const url = new URL(location.href);
	const feeds = JSON.parse(url.searchParams.get('feeds'));

	feedList.style.display = 'none';
	for (feed_url in feeds) {
		if (feeds.hasOwnProperty(feed_url)) {

			let li = document.createElement("div");
			li.classList.add("panel-list-item");
			li.setAttribute("data-href", feed_url);

			let a = document.createElement("div");
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

			let li = document.createElement("div");
			li.classList.add("panel-list-item");
			li.setAttribute("data-href", me_url);

			let a = document.createElement("div");
			a.classList.add("text");
			a.innerText = mes[me_url];

			li.appendChild(a);
			meList.appendChild(li);
			meList.style.display = 'block';
		}
	}

	const friendsUrl = url.searchParams.get('friendsUrl');
	if ( friendsUrl ) {
		let li = document.createElement("div");
		li.classList.add("panel-list-item");
		li.setAttribute("data-href", friendsUrl);

		let a = document.createElement("div");
		a.classList.add("text");
		a.innerText = 'Add as a friend / Subscribe';

		li.appendChild(a);
		addFriend.appendChild(li);
	} else {
		addFriend.style.display = 'none';
	}

	document.querySelectorAll(".panel-list-item").forEach( (elem) => {
		elem.addEventListener('click', (event) => {

			let url = elem.getAttribute("data-href");
			if (url) {
				if ( chrome ) {
					chrome.tabs.create({url: url});
				} else {
					browser.tabs.create({url: url});
				}
			}

		});

	});

});
