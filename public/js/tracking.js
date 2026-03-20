/**
 * Synapse System — Client-side Tracking Snippet
 *
 * Captures user engagement on preview pages and reports events to the
 * server via POST /api/tracking/event.
 *
 * Events:
 *   preview_viewed   – page load
 *   preview_revisit  – returning visitor (sessionStorage flag)
 *   preview_time     – time on page exceeds 180 s
 *   form_started     – first form input focused
 *   form_completed   – form submitted
 *   heartbeat        – every 30 s with time-on-page
 */
(function () {
  'use strict';

  // ── Configuration ─────────────────────────────────────────────────────
  var TRACKING_ENDPOINT  = '/api/tracking/event';
  var HEARTBEAT_INTERVAL = 30000; // 30 seconds
  var TIME_THRESHOLD     = 180;   // seconds before preview_time fires
  var SESSION_KEY        = 'synapse_visited';

  // ── Ref resolution ────────────────────────────────────────────────────
  function getRef() {
    // 1. Try URL query parameter  ?ref=xxx
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (ref) return ref;

    // 2. Try data attribute on the script tag or a dedicated element
    var el = document.querySelector('[data-tracking-ref]');
    if (el) return el.getAttribute('data-tracking-ref');

    // 3. Try data attribute on the script tag itself
    var scripts = document.querySelectorAll('script[data-ref]');
    for (var i = 0; i < scripts.length; i++) {
      var val = scripts[i].getAttribute('data-ref');
      if (val) return val;
    }

    return null;
  }

  // ── Event dispatcher ──────────────────────────────────────────────────
  function sendEvent(eventName, metadata) {
    var ref = getRef();
    if (!ref) return; // nothing to track without a ref

    var payload = {
      ref: ref,
      event: eventName,
      metadata: metadata || {},
    };

    // Prefer sendBeacon for reliability during unload; fall back to fetch
    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      navigator.sendBeacon(TRACKING_ENDPOINT, blob);
    } else {
      fetch(TRACKING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {
        // Silently swallow — tracking should never block the user
      });
    }
  }

  // ── Timing ────────────────────────────────────────────────────────────
  var startTime = Date.now();
  var timeThresholdSent = false;
  var heartbeatTimer = null;

  function getElapsedSeconds() {
    return Math.round((Date.now() - startTime) / 1000);
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(function () {
      var elapsed = getElapsedSeconds();

      // Heartbeat with time-on-page
      sendEvent('heartbeat', { time_on_page: elapsed });

      // One-time preview_time event after threshold
      if (!timeThresholdSent && elapsed > TIME_THRESHOLD) {
        timeThresholdSent = true;
        sendEvent('preview_time', { time_on_page: elapsed });
      }
    }, HEARTBEAT_INTERVAL);
  }

  // ── Form tracking ────────────────────────────────────────────────────
  var formStarted = false;

  function trackFormInteractions() {
    // form_started — first input focus anywhere on the page
    document.addEventListener(
      'focusin',
      function (e) {
        if (formStarted) return;
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          // Ignore hidden or submit inputs
          var type = (e.target.type || '').toLowerCase();
          if (type === 'hidden' || type === 'submit') return;

          formStarted = true;
          sendEvent('form_started', {
            field: e.target.name || e.target.id || null,
            time_on_page: getElapsedSeconds(),
          });
        }
      }
    );

    // form_completed — form submission
    document.addEventListener('submit', function (e) {
      var formEl = e.target;
      sendEvent('form_completed', {
        form_id: formEl.id || formEl.getAttribute('name') || null,
        time_on_page: getElapsedSeconds(),
      });
    });
  }

  // ── Revisit detection ─────────────────────────────────────────────────
  function checkRevisit() {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        sendEvent('preview_revisit', { time_on_page: 0 });
      } else {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    } catch (e) {
      // sessionStorage may be unavailable in incognito / restricted contexts
    }
  }

  // ── Page visibility / unload cleanup ──────────────────────────────────
  function onPageHide() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    // Send a final heartbeat so we capture exact time on page
    sendEvent('heartbeat', { time_on_page: getElapsedSeconds(), final: true });
  }

  // ── Initialisation ───────────────────────────────────────────────────
  function init() {
    // Page-load event
    sendEvent('preview_viewed', { url: window.location.href });

    // Revisit check
    checkRevisit();

    // Start heartbeat
    startHeartbeat();

    // Form interactions
    trackFormInteractions();

    // Cleanup on leave
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
