
function saveOptions(e) {
  e.preventDefault();

  browser.storage.sync.set({
    friendsUrl: document.querySelector("#friendsUrl").value
  });
}


function restoreOptions() {

  function onResult(result) {
    document.querySelector("#friendsUrl").value = result.friendsUrl;
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  var getting = browser.storage.sync.get({
    friendsUrl: null
  });
  getting.then(onResult, onError);

}



document.addEventListener("DOMContentLoaded", restoreOptions);

document.querySelectorAll('.validate').forEach((elem) => {
  elem.addEventListener('change', saveOptions);
});
