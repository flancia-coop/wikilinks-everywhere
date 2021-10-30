(ns flancia.app
  (:require [clojure.string :as string]))

(def agora "https://anagora.org")
(def regexp #"\[\[(.*?)\]\]")

(defn findPatternElements []
  (if (= (.. js/window -location -hostname) "twitter.com")
    (-> (js/$ "span.css-901oao:contains([[)"))
    (-> (js/$ "p:contains([[)"))))

(defn discoverPatterns [element]
  (let [inner element.innerHTML
        matches (re-seq regexp inner)]
    (for [match matches]
      (let [slug (-> (second match) (string/replace " " "-"))
            link (str "<a href='" agora "/" slug "' target='_blank'>" (first match) "</a>")
            replaceStr (-> element.innerHTML (string/replace (first match) link))]
        (-> (js/$ element) (.html replaceStr))
        slug))))

(defn parsePage []
  (let [elements (findPatternElements)
        patterns (for [element elements]
                   (let [patterns (into-array (discoverPatterns element))]
                     (.. js/console (log "patterns" patterns))
                     patterns))
        p (clj->js (mapcat identity patterns))]
    (. js/console (log "all patterns" p))
    (.. js/browser -runtime  (sendMessage p))
    (. js/console (log elements))))

(defn main []
  (.. js/console (log "started"))
  (.. js/window (addEventListener "click" parsePage))
  (.. js/browser -storage -local (set #js {:agora agora})))