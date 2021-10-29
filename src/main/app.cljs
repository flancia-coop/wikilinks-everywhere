(ns app)

(def agora "https://anagora.org")


;; async function parsePage() {
;;     console.log("*** parsePage in app.js")
;;     if (lock) return
;;     lock = 1
;;     const txt = document.body.innerText
;;     const ar = [...txt.matchAll(regexp)];
;;     console.log("sending message", { ar })
;;     await browser.runtime.sendMessage(ar)
;;     lock = 0
;; }
(def regexp #"\[\[(.*?)\]\]")

;; function findElementByText(text) {
;;     var jSpot = $(":contains(" + text + ")")
;;         .filter(function () { return $(this).children().length === 0; })
;;         .filter(function () {
;;             const tag = $(this).prop("tagName")
;;             if (tag.match(/title/i)) {
;;                 return 0
;;             }
;;             return 1
;;         })
;;     // .parent();  // because you asked the parent of that element
;;     return jSpot;
;; }

(defn findElementByText [text]
  (let [hasChildren (fn [] (== (.. (js/$ js/this) children -length)  0))
        hasTag (fn [] (let [tag (-> (js/$ js/this) (.prop "tagName"))]
                        (if (-> tag (.match #"(?i)title")) 0 1)))
        matchString (str ":contains(" text ")")
        jSpot (-> (js/$ matchString) (.filter hasChildren) (.filter hasTag))]
    jSpot))





(defn findPatternElements []
  (let [hasChildren (fn [] (== (.. (js/$ js/this) children -length)  0))
        hasTag (fn [] (let [tag (-> (js/$ js/this) (.prop "tagName"))]
                        (if (-> tag (.match #"(?i)title")) 0 1)))
        ; twitter specific selector. for replacement we have to get tricky
        jSpot (-> (js/$ "span.css-901oao:contains([[)"))]
    jSpot))


;; function convertLinks(e) {
;;     console.log("*** convertLinks")
;;     console.log(e.currentTarget)
;;     let bd = e.currentTarget.innerHTML
;;     const ar = [...bd.matchAll(regexp)];
;;     ar.forEach(a => {
;;         try {
;;             const slug = a[1].replace(/ /g, "-")
;;             const found = findElementByText(a[0])
;;             if (found.length == 0) return
;;             const html = found.html()
;;             const ret = html.replace(a[0], `<a href="${agora}/${slug}" target="_blank">[[${a[1]}]]</a>`)
;;             found.html(ret)
;;         } catch(e){
;;             console.error(e)
;;         }

;;     })
;; }


;; (defn convertLinks [e]
;;   (. js/console (log "element" e.currentTarget))
;;   (let [inner (.. e -currentTarget -innerHTML)
;;         matches (re-seq regexp inner)]
;;     (println "convert called")
;;     (doseq [match matches]
;;       (println match))))




;; const regexp = / \[ \[ (.*?) \] \]/g;


(defn parsePage []
  (let [txt (.. js/document -body -innerText)
        matches (clj->js (re-seq regexp txt))]
    (. js/console (log matches))))

(defn loaded [] (.. js/console (log "page loaded")))


(defn discoverPatterns [element]
  (let [inner element.innerHTML
        matches (re-seq regexp inner)]
    (doseq [match matches]
      (println "match")
      (println match)
      ;`<a href="${agora}/${slug}" target="_blank">[[${a[1]}]]</a>`
      (let [slug (-> (second match) (.replace " " "-"))
            link (str "<a href='" agora "/" slug "' target='_blank'>" (first match) "</a>")
            replaceStr (-> element.innerHTML (.replace (first match) link))]
        (-> (js/$ element) (.html replaceStr)))))) 

;; $("div,span,p").on("click", convertLinks);
(defn main []

  ; convert links when element clicked
  ;; (-> (js/$ "div,span,p") (.on "click" convertLinks))
  ;; (. js/window (addEventListener "click" convertLinks))
  (.. js/console (log "started"))
  (.. js/window (addEventListener "click" (fn [] (let [elements (findPatternElements)]
                                                   (doseq [element elements]
                                                     (println "element")
                                                     (discoverPatterns element))
                                                   (. js/console (log elements))))))
  (.. js/browser -storage -local (set #js {:agora agora})))