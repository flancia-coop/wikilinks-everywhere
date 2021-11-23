import browser from 'webextension-polyfill';

const regex = /(?<a>(?:(?:(?:<([^ ]+)(?<e1><.*)>)\[\[(?:<\/\1>))|(?:\[\[))(?:(?:(?:<([^ ]+)(?<e2>.*)>)(?<c>.+?)(?:<\/\2>))|(?<c2>.+?))(?:(?:(?:<([^ ]+)(?<e3>.*)>)\]\](?:<\/\5>))|(?:\]\])))/g;
// let str = `<span><span>[[</span><a href='${res}' class="wikilink">$1</span > <span>]] < /span></span >`


function unique(array, propertyName) {
    return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i);
}

async function buildAndTestUrl(url: string, page) {
    let nurl = url.replace('{path}', page)
    let sending = await browser.runtime.sendMessage({ url: nurl })
    return [sending.response, nurl];
}

let modes = {
    'Existing': async function (_opts, node, text) {
        if (node instanceof HTMLAnchorElement) {
            let pnode: HTMLAnchorElement = node;
            let [status, url] = await buildAndTestUrl(pnode.href, '');
            if (status != 200) return false
            else return url;
        } else return false;
    },
    'Prefix': async function (opts, prefixes: [{ prefix: string, url: string }], node: String) {
        for (let prefix of prefixes) {
            if (node.startsWith(prefix.prefix)) {
                let betterpath = node.replace(prefix.prefix, '');
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
            let [status, turl] = await buildAndTestUrl(url, node);
            if (status == 200) return turl;
        } return false;
    },
    'Nothing': function (_opts, _prefixes, node) {
        return false;
    }
}

function walk(rootNode) {
    // Find all the text nodes in rootNode
    let walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT,
        null,
    );
    fixNodes(walker);
}

function fixNodes(walker: TreeWalker) {
    let tnode,
        // @ts-ignore
        nodes: [Text] = [];
    while (tnode = walker.nextNode()) {
        nodes.push(tnode);
    }
    for (let node of nodes) {
        let nodes = [...node.textContent.matchAll(regex)]
        let place = node
        for (let i in nodes) {
            let segment = [...place.textContent.matchAll(regex)]
            try {
                place = place.splitText(segment[i].index + 2);
                place = place.splitText([segment[i].groups.c2, segment[i].groups.c].join('').length); // prevent coercion of undefined -> string (why javascript)
            } catch (e) {
                console.log(e)
                console.log(node.textContent.length)
            }
        }
    }
}

// if you want to submit a PR fixing the swear words ok.
async function doshitwithnodesandstuff(v: String, node: Text) {
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
                main: node
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
            if (node.parentNode instanceof HTMLAnchorElement) {
                node.parentNode.href = res // don't change this to a continue
                // remember the children ;)
                // what did this mean?
                // write less confusing comments please
            }
            else {
                return res
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
