import browser from 'webextension-polyfill';

async function buildAndTestUrl(url: string, page) {
    url = url.replace('{path}', page);
    var sending = await browser.runtime.sendMessage({ url: url })
    console.log(url)
    return [sending.response, url];
}

let modes = {
    'Existing': async function (_opts, _prefixes, node) {
        if (node.parentNode instanceof HTMLAnchorElement) {
            let pnode: HTMLAnchorElement = node.parentNode;
            let [status, url] = await buildAndTestUrl(pnode.href, '');
            if (status != 200) {
                return false
            } else return url;
        } else return false;
    },
    'Prefix': async function (opts, prefixes: [{ prefix: string, url: string }], node) {
        for (let prefix of prefixes) {
            if (node.nodeValue.startsWith(prefix.prefix)) {
                let [status, url] = await buildAndTestUrl(prefix.url, node.nodeValue.replaceAll(prefix.prefix, ''));
                if (status == 200) {
                    return url;
                }
            }
            return false;
        }
    },
    'IWLEP': function (opts, _prefixes, node) {
        return false
    },
    'Unprefixed': async function (opts, urls: [string], node) {
        for (let url of urls) {
            let [status, turl] = await buildAndTestUrl(url, node.nodeValue);
            if (status == 200) {
                return turl;
            }
        } return false;
    },
    'Nothing': function (_opts, _prefixes, node) {
        return false;
    }
}

function walk(rootNode) {
    // Find all the text nodes in rootNode
    var walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT,
        null,
    ),
        node;
    // Modify each text node's value
    while (node = walker.nextNode()) {
        node = fixNodes(node);
    }
}

async function fixNodes(v: Text) {
    let arr: Array<{
        fn: Function,
        opts?: Array<any>,
        main: any
    }>
        = [
            {
                fn: modes.Existing,
                opts: [""],
                main: ''
            },
            {
                fn: modes.Prefix,
                opts: [""],
                main: [
                    {
                        prefix: 'ag:',
                        url: 'https://anagora.org/{path}'
                    },
                    {
                        prefix: 'wp:',
                        url: 'https://en.wikipedia.org/wiki/{path}'
                    }
                ]
            },
            {
                fn: modes.IWLEP,
                opts: [""],
                main: ''
            },
            {
                fn: modes.Unprefixed,
                opts: [""],
                main: ["https://en.wikipedia.org/wiki/{path}",'https://anagora.org/{path}']
            },
            {
                fn: modes.Nothing,
                opts: [""],
                main: ''
            }

        ]
    if (!v.nodeValue.startsWith('[[') && !v.nodeValue.endsWith(']]')) return;
    console.log('got match')
    v.nodeValue = v.nodeValue.replace('[[', '').replace(']]', '');
    for (let i = 0; i < arr.length; i++) {
        let res = await arr[i].fn(arr[i].opts, arr[i].main, v);
        if (res == false) {
            console.debug(`failed i=${i}`)
            continue
        }
        else {
            if (v.parentNode instanceof HTMLAnchorElement) {
                console.debug(`v.parentNode is a link`)
                v.parentNode.href = res // don't change this to a continue
                                        // remember the children ;)
            }
            else {
                console.debug(`v.parentNode is not a link`)
                var parent = v.parentNode;
                var wrapper = document.createElement('a');
                wrapper.href = res
                // set the wrapper as child (instead of the element)
                parent.replaceChild(wrapper, v);
                // set v as child of wrapper
                wrapper.appendChild(v);
            }
        }
    }
    return v;
}

// Returns true if a node should *not* be altered in any way
function isForbiddenNode(node) {
    return node.isContentEditable || // DraftJS and many others
        (node.parentNode && node.parentNode.isContentEditable) || // Special case for Gmail
        (node.tagName && (node.tagName.toLowerCase() == "textarea" || // Some catch-alls
            node.tagName.toLowerCase() == "input"));
}

// The callback used for the document body and title observers
function observerCallback(mutations) {
    var i, node;

    mutations.forEach(function (mutation) {
        for (i = 0; i < mutation.addedNodes.length; i++) {
            node = mutation.addedNodes[i];
            // Should never operate on user-editable content
            if (isForbiddenNode(node)) continue;
            // Replace the text for text nodes
            else if (node.nodeType === 3) node = fixNodes(node);
            // Otherwise, find text nodes within the given node and replace text
            else walk(node);
        }
    });
}

// Walk the doc (document) body and observe the body
function walkAndObserve(doc) {
    let observerConfig = {
        characterData: true,
        childList: true,
        subtree: true
    },
        bodyObserver;

    // Do the initial text replacements in the document body
    walk(doc.body);
    // Observe the body so that we replace text in any added/modified nodes
    bodyObserver = new MutationObserver(observerCallback);
    bodyObserver.observe(doc.body, observerConfig);
}
walkAndObserve(document);