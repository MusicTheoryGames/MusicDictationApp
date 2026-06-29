/* ============================================================================
   core-bridge.js — browser bridge for the tested guided-level ENGINE (core/).
   ============================================================================

   The `core/*` modules are PURE, framework-agnostic native ES modules (now/RNG
   injected, no DOM, no I/O). This tiny bridge is the ONE place the browser loads
   them: it imports the four modules the live app needs, resolves their
   inter-module imports over HTTP (curriculum <- ladder, etc.), and exposes them
   as a SINGLE global so the classic (non-module) `solo-mode.js` can read them
   without itself becoming a module.

       window.LevelCore = { curriculum, ladder, mastery, grading }

   Loading contract
   ----------------
   This file is a <script type="module"> placed BEFORE solo-mode.js in the page.
   Module scripts are deferred (they run after the document is parsed and after
   classic scripts have executed), so solo-mode.js cannot assume LevelCore exists
   the instant it runs. To make the ordering robust either way:
     - we set `window.LevelCore` synchronously here once the imports resolve, and
     - we dispatch a `levelcore-ready` event on `window`.
   solo-mode.js waits for whichever happens (the global already present, or the
   event), so the guided spine boots regardless of script-execution order.

   Nothing here mutates the core modules — it only re-exports their public
   namespaces. The engine stays the single source of truth; the app reads it. */

import * as curriculum from './core/curriculum.js';
import * as ladder from './core/ladder.js';
import * as mastery from './core/mastery.js';
import * as grading from './core/grading.js';

// One global namespace. Frozen so app code can't accidentally clobber a module.
window.LevelCore = Object.freeze({ curriculum, ladder, mastery, grading });

// Announce readiness for any consumer that loaded/ran before this module did.
try {
  window.dispatchEvent(new CustomEvent('levelcore-ready', { detail: window.LevelCore }));
} catch (e) {
  // CustomEvent should always exist in a modern browser; the global above is the
  // primary contract, the event is a convenience, so a failure here is non-fatal.
}
