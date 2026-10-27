/**
 * Google Analytics 4 (ADR-032). Loaded only on production builds, after the window `load` event
 * (keeps LCP/TBT and the JS budget for first paint intact), and never for visitors who send
 * Global Privacy Control or Do Not Track.
 */
const GA_ID = /^G-[A-Z0-9]{4,20}$/;

export const isGaId = (id: string): boolean => GA_ID.test(id);

export function gaSnippet(id: string): string {
  if (!isGaId(id)) throw new Error(`Invalid GA4 measurement id: ${id}`);
  return `(function () {
  var n = navigator;
  if (n.globalPrivacyControl || n.doNotTrack === '1' || window.doNotTrack === '1') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', '${id}');
  window.addEventListener('load', function () {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${id}';
    document.head.appendChild(s);
  });
})();`;
}
