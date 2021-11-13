import browser from 'webextension-polyfill';

async function buildAndTestUrl(url: string, page) {
    let nurl = url.replace('{path}', page)
    let sending = await browser.runtime.sendMessage({ url: nurl })
    return [sending.response, nurl];
}

let modes = {
    'Existing': async function (_opts, _prefixes, node) {
        if (node.parentNode instanceof HTMLAnchorElement) {
            let pnode: HTMLAnchorElement = node.parentNode;
            let [status, url] = await buildAndTestUrl(pnode.href, '');
            if (status != 200) return false
            else return url;
        } else return false;
    },
    'Prefix': async function (opts, prefixes: [{ prefix: string, url: string }], node: Node) {
        for (let prefix of prefixes) {
            if (node.nodeValue.startsWith(prefix.prefix)) {
                let betterpath = node.nodeValue.replace(prefix.prefix, '');
                let [status, url] = await buildAndTestUrl(prefix.url, betterpath);
                if (status == 200) {
                    return url;
                }
            }
        } return false;
    },
    'IWLEP': function (opts, _prefixes, node) {
        return false
    },
    'Unprefixed': async function (opts, urls: [string], node) {
        for (let url of urls) {
            let [status, turl] = await buildAndTestUrl(url, node.nodeValue);
            if (status == 200) return turl;
        } return false;
    },
    'Nothing': function (_opts, _prefixes, node) {
        return "https://google.com";
    }
}

function walk(rootNode) {
    // Find all the text nodes in rootNode
    let walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT,
        null,
    ),
        node;
    fixNodes(walker);
}

async function fixNodes(walker: TreeWalker) {
    let nodes = [],
        node: Text;
    // @ts-expect-error
    while (node = walker.nextNode()) {
        nodes.push(node);
    }
    let pelm: Element;
    for (node of nodes) {

        pelm = node.parentElement

        if (node.parentElement == null) {
            continue;
        }
        if (node.nodeValue.includes('[[') && node.nodeValue.includes(']]')) {
            node.parentElement.innerHTML = node.parentElement.innerHTML.replace(/\[\[(.*?)\]\]/g, '<span><span>[[</span><span class="wikilink">$1</span><span>]]</span></span>');
            linkNodes(pelm.querySelector('span.wikilink').firstChild);
        }
    }
}

async function linkNodes(v: Text) {
    // TODO: find [[wikilinks]] even if not only thing in a element
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
                        prefix: 'wp:',
                        url: 'https://en.wikipedia.org/wiki/{path}'
                    },
                    {
                        prefix: 'ag:',
                        url: 'https://anagora.org/{path}'
                    },
                    {
                        prefix: 'r/',
                        url: 'https://reddit.com/r/{path}'
                    },
                    {
                        prefix: 'g:',
                        url: 'https://google.com/search?q={path}'
                    },
                    {
                        prefix: 'yt:',
                        url: 'https://youtube.com/results?search_query={path}'
                    },
                    {
                        prefix: 'ddg:',
                        url: 'https://duckduckgo.com/?q={path}'
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
                main: ["https://en.wikipedia.org/wiki/{path}", 'https://anagora.org/{path}']
            },
            {
                fn: modes.Nothing,
                opts: [""],
                main: ''
            }

        ]
    for (let i = 0; i < arr.length; i++) {
        let res;
        try {
            res = await arr[i].fn(arr[i].opts, arr[i].main, v);
        } catch (e) {
            console.error(e);
        }
        if (res == false) {
            continue
        }
        else {
            if (v.parentNode instanceof HTMLAnchorElement) {
                v.parentNode.href = res // don't change this to a continue
                // remember the children ;)
                // what did this mean?
                // write less confusing comments please
            }
            else {
                let parent = v.parentNode;
                let wrapper = document.createElement('a');
                wrapper.href = res;
                wrapper.appendChild(v);
                console.log(wrapper);
            }
        }
        break;
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
    let i, node;

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
