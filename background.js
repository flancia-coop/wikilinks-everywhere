async function handleMsg(request, sender, sendResponse) {
    console.log("*** function handleMsg: request ", request)
    console.log("*** function handleMsg: sender ", sender)
    console.log("*** function handleMsg: sendResponse", sendResponse)
    await browser.contextMenus.removeAll()
    request.forEach(e => {
        let slug = e[1].replace(/ /g, "-")
        console.log("wiki link", e[0])
        browser.contextMenus.create({
            id: slug,
            title: e[0],
            contexts: ['page']
        })
    })
}
browser.runtime.onMessage.addListener(handleMsg)

browser.contextMenus.onClicked.addListener(async function (info, tab) {
    const config = await browser.storage.local.get("agora")
    console.log("info", info.menuItemId)
    let newTab = await browser.tabs.create({ 'active': true, 'url': `${config.agora}/${info.menuItemId}`, 'index': tab.index + 1 });
});

