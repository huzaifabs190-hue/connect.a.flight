const currentPage = document.body.dataset.page || "";
const pageLinks = [
  ["home", "index.html", "Home"],
  ["flights", "flights.html", "Flights"],
  ["tracker", "tracker.html", "Track"],
  ["destinations", "destinations.html", "Destinations"],
  ["about", "about.html", "About us"]
];

const navLinks = pageLinks
  .map(([page, href, label]) => `<a${page === currentPage ? ' class="active"' : ""} href="${href}">${label}</a>`)
  .join("");

document.querySelector("#site-header-slot")?.replaceWith(
  Object.assign(document.createElement("header"), {
    className: "site-header",
    innerHTML: `
      <a class="brand brand-lockup" href="index.html" aria-label="Connect A Flight home"><img class="official-logo" src="assets/connect-a-flight-logo.png" alt="Connect A Flight" /></a>
      <nav class="desktop-nav" aria-label="Primary navigation">${navLinks}</nav>
      <a class="header-cta" href="flights.html">Book a flight <span>↗</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu"><span></span><span></span></button>
      <nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation">${navLinks}</nav>`
  })
);

const sharedHeaderCta = document.querySelector(".header-cta");
if (sharedHeaderCta) {
  sharedHeaderCta.innerHTML = '<span class="header-cta-copy"><small>Start your journey</small><strong>Book a flight</strong></span><span class="header-cta-arrow">↗</span>';
}

document.querySelector("#site-footer-slot")?.replaceWith(
  Object.assign(document.createElement("footer"), {
    innerHTML: `
      <a class="footer-wordmark" href="index.html" aria-label="Back to home"><span>Connect</span><em>A</em><span>Flight</span></a>
      <p class="footer-tagline">Go further. <em>Feel more.</em></p>
      <p class="footer-copy">© 2026 Connect A Flight</p>`
  })
);

document.querySelector("#voice-assistant-slot")?.replaceWith(
  Object.assign(document.createElement("aside"), {
    className: "voice-assistant",
    ariaLabel: "Roman Urdu travel assistant",
    innerHTML: `
      <button class="voice-launcher" type="button" aria-expanded="false" aria-controls="voice-panel" aria-label="Open Roman Urdu voice assistant">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4Z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3m-3 0h6"/></svg>
        <span class="voice-pulse"></span>
      </button>
      <section id="voice-panel" class="voice-panel" aria-hidden="true">
        <header class="voice-panel-header"><div class="voice-identity"><span class="voice-header-logo"><img src="favicon.svg" alt="" aria-hidden="true" /></span><div><p>Connect A Flight <i>Live</i></p><h2>Roman Urdu <em>Assistant</em></h2></div></div><button class="voice-close" type="button" aria-label="Close assistant">×</button></header>
        <div class="voice-conversation" aria-live="polite"><div class="voice-message assistant"><span class="voice-avatar"><img src="favicon.svg" alt="" aria-hidden="true" /></span><p>Assalam-o-alaikum! Aap apni travel planning ke baare mein Urdu mein pooch sakte hain.</p></div></div>
        <p class="voice-status">Mic dabayein aur Urdu mein bolain</p>
        <div class="voice-controls"><button class="voice-mic" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4Z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3m-3 0h6"/></svg><span>Bolain</span></button><button class="voice-stop" type="button" aria-label="Stop speaking"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"/></svg></button></div>
        <p class="voice-disclosure">Faster-Whisper + Piper female voice, fully local.</p>
      </section>`
  })
);
