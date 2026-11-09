/** Marks <html data-os="windows"> so CSS can give WebView2 the thin scrollbars Linux draws natively. */
function markPlatform() {
  if (/Windows/i.test(navigator.userAgent)) document.documentElement.dataset.os = "windows";
}

export { markPlatform };
