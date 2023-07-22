
function saveOptions(e) {
	e.preventDefault();
	try {
		var url = document.querySelector("#personalHomeUrl").value;
		if ( url.substr( 0, 7 ) !== 'http://' && url.substr( 0, 8 ) !== 'https://' ) {
			url = 'https://' + url;
		}
		browser.storage.sync.set({
			personalHomeUrl: url
		});
	} catch (e) {
		onError(e);
	}
}


function restoreOptions() {

	function onResult(result) {
		document.querySelector("#personalHomeUrl").value = result.personalHomeUrl;
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	try {
		var getting = browser.storage.sync.get({
			personalHomeUrl: null
		});
		getting.then(onResult, onError);
	} catch (e) {
		onError(e);
	}
}



document.addEventListener("DOMContentLoaded", restoreOptions);

document.querySelectorAll('.validate').forEach((elem) => {
	elem.addEventListener('change', saveOptions);
	elem.addEventListener('keyup', saveOptions);
});
