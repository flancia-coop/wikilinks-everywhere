async function handleMsg(request, sender, sendResponse) {
    console.log("*** function handleMsg: request ", request)
    console.log("*** function handleMsg: sender ", sender)
    console.log("*** function handleMsg: sendResponse", sendResponse)
    await browser.contextMenus.removeAll()
    request.forEach(e => {
        browser.contextMenus.create({
            id: e,
            title: e,
            contexts: ['page']
        })
    })
}
browser.runtime.onMessage.addListener(handleMsg)

browser.browserAction.onClicked.addListener(async function (tab) {
    console.log("*** function browserAction.onClicked: tab", tab)
    const config = await browser.storage.local.get("enabled")
    console.log(config)
    console.log("enabled", config.enabled)
    if (config.enabled) {
        browser.browserAction.setIcon({
            path: "icons/agora-disabled.png",
            tabId: tab.id
        })
        browser.storage.local.set({
            enabled: false
        })
    } else {
        browser.browserAction.setIcon({
            path: "icons/agora.png",
            tabId: tab.id
        })
        browser.storage.local.set({
            enabled: true
        })
    }
})

browser.contextMenus.onClicked.addListener(async function (info, tab) {
    const config = await browser.storage.local.get("agora")
    console.log("info", info.menuItemId)
    let newTab = await browser.tabs.create({ 'active': true, 'url': `${config.agora}/${info.menuItemId}`, 'index': tab.index + 1 });
});


