
function saveOptions(e) {
	e.preventDefault();
	try {
		browser.storage.sync.set({
			personalHomeUrl: document.querySelector("#personalHomeUrl").value
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

	var getting = browser.storage.sync.get({
		personalHomeUrl: null
	});
	getting.then(onResult, onError);

}



document.addEventListener("DOMContentLoaded", restoreOptions);

document.querySelectorAll('.validate').forEach((elem) => {
	elem.addEventListener('change', saveOptions);
});
