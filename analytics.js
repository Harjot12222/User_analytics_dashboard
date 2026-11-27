/**
 * Tiny browser tracker. Include this file on any page:
 * <script src="http://localhost:4000/tracker.js" data-endpoint="http://localhost:4000/api/events"></script>
 *
 * This source file is also copied to server/public/tracker.js for easy local hosting.
 */
(() => {
  "use strict";
  const script = document.currentScript;
  const endpoint = script?.dataset.endpoint || "http://localhost:4000/api/events";
  const storageKey = "cf_analytics_session_id";

  function getSessionId() {
    try {
      let id = localStorage.getItem(storageKey);
      if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        localStorage.setItem(storageKey, id);
      }
      return id;
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
      return `temporary-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  const sessionId = getSessionId();
  function send(eventType, coordinates = {}) {
    const payload = {
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      ...coordinates
    };
    // keepalive lets the browser finish the request during a navigation.
    // JSON is parsed and validated by the API; CORS is configured on the server.
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(error => console.warn("[CF Analytics] Event could not be sent:", error));
  }

  send("page_view");
  document.addEventListener("click", event => {
    send("click", {
      x: event.clientX,
      y: event.clientY,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight
    });
  }, { passive: true });
})();
