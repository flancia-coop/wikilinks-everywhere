import browser from 'webextension-polyfill';
browser.runtime.onMessage.addListener(
  function (request: {url:string}, sender, sendResponse) {
    fetch(request.url,{'method': 'HEAD'}).then(res => sendResponse({response: res.status}))
    return true;
  });