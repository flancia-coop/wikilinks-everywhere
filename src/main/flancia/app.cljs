(ns flancia.app
  (:require [clojure.string :as string]))

(def agora "https://anagora.org")
(def regexp #"\[\[(.*?)\]\]")

(defn findPatternElements []
  (if (= (.-hostname js/window.location) "twitter.com")
    (-> (js/$ "span.css-901oao:contains([[)"))
    (if (= (.-hostname js/window.location) "doc.anagora.org")
      (-> (js/$ "div,li:contains([[)"))
      (-> (js/$ "p:contains([[)")))))

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
  (let [enabled (.get js/browser.storage.local "enabled")]
    (.then enabled
           (fn [v]
             (if (= v.enabled false)
              ;; skip if not enabled
               nil
               (let [elements (findPatternElements)
                     patterns (for [element elements]
                                (let [patterns (into-array (discoverPatterns element))]
                                  (println element)
                                  (.log js/console "patterns" patterns)
                                  patterns))
                     p (clj->js (mapcat identity patterns))]
                 (.log js/console "all patterns" p)
                 (.sendMessage js/browser.runtime  p)
                 (.log js/console elements)))))))

(defn main []
  (.log js/console  "started")
  (.addEventListener js/window "click" parsePage)
  (.set js/browser.storage.local #js {:agora agora :enabled true}))