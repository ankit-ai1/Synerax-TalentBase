/** Plain module (usable from server layouts and client components) for the "install the app" feature. */

/**
 * Runs before React (in <head>): browsers fire beforeinstallprompt once per page load, often before hydration.
 * preventDefault() keeps Chrome's own one-time mini banner away; we offer the install ourselves instead.
 */
export const installScript = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event('install-ready'))});`;

/** window event that opens the install flow from anywhere (e.g. the mobile menu) */
export const OPEN_INSTALL_EVENT = "open-install";
