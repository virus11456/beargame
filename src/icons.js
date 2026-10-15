// Original flat icons shared by the HUD (as an inline SVG sprite) and the
// ground pads (rasterised onto the tiles). Every icon lives in a 24×24 box.
export const icons = {
  sword: `<g transform="rotate(-45 12 12)"><path d="M12 1.5l2.6 3.4V15H9.4V4.9z" fill="#eef3f6"/><path d="M12 1.5v13.5h-1.3V4.6z" fill="#c9d4db"/><rect x="6.5" y="15" width="11" height="2.4" rx="1.2" fill="#e0a93f"/><rect x="10.9" y="17.4" width="2.2" height="4" fill="#6b4b32"/><circle cx="12" cy="22" r="1.5" fill="#e0a93f"/></g>`,
  stack: `<rect x="4" y="15.5" width="16" height="4.5" rx="2" fill="#d75e6c"/><rect x="5" y="10.5" width="16" height="4.5" rx="2" fill="#e5717e"/><rect x="3.5" y="5.5" width="16" height="4.5" rx="2" fill="#ef8a95"/><circle cx="16.5" cy="7.7" r="1.2" fill="#ffe3e7"/><circle cx="18" cy="12.7" r="1.2" fill="#ffe3e7"/><circle cx="16.5" cy="17.7" r="1.2" fill="#ffe3e7"/>`,
  speed: `<path d="M3 4h5l6 8-6 8H3l6-8z" fill="#ffffff"/><path d="M11 4h5l6 8-6 8h-5l6-8z" fill="#ffe08a"/>`,
  bear: `<circle cx="5.5" cy="7" r="3.2" fill="#f1ede2"/><circle cx="18.5" cy="7" r="3.2" fill="#f1ede2"/><circle cx="5.5" cy="7" r="1.5" fill="#e9c2c2"/><circle cx="18.5" cy="7" r="1.5" fill="#e9c2c2"/><circle cx="12" cy="13" r="8.2" fill="#f7f4ea"/><ellipse cx="12" cy="15.5" rx="4" ry="3" fill="#ffffff"/><circle cx="12" cy="14.3" r="1.6" fill="#2b3238"/><circle cx="8.8" cy="11" r="1.1" fill="#2b3238"/><circle cx="15.2" cy="11" r="1.1" fill="#2b3238"/>`,
  helper: `<rect x="5" y="12" width="14" height="10.5" rx="4.5" fill="#5f8a6e"/><circle cx="12" cy="7.2" r="3.8" fill="#f1c9a3"/><path d="M7.6 7.2a4.4 4.4 0 0 1 8.8 0z" fill="#3f6b53"/><rect x="7.5" y="11" width="9" height="2.4" rx="1.2" fill="#d84c3c"/>`,
  bill: `<rect x="1.5" y="5.5" width="21" height="13" rx="2.2" fill="#5fd45a" stroke="#2f8e3a" stroke-width="1.5"/><rect x="4.5" y="8.5" width="15" height="7" rx="1.2" fill="none" stroke="#9ff39a" stroke-width="1.2"/><circle cx="12" cy="12" r="2.6" fill="#2f8e3a"/>`,
  meat: `<path d="M3.5 13.5c0-4.4 3.8-7.5 8.5-7.5 3.3 0 6.2 1.5 7.3 3.9L15 17.8c-1.1.9-2.4 1.4-3.9 1.4-4.5 0-7.6-2.3-7.6-5.7z" fill="#e5717e"/><path d="M7 11.5c1-1.6 2.8-2.6 5-2.6" stroke="#ffd6db" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="19.2" cy="8.3" r="2.1" fill="#fff6ee"/><circle cx="21" cy="11.6" r="2.1" fill="#fff6ee"/><path d="M15.5 16.2l4-4.6" stroke="#fff6ee" stroke-width="3" stroke-linecap="round"/>`,
  pause: `<rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>`,
  restart: `<path d="M18.4 12a6.4 6.4 0 1 1-2.1-4.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M17.5 3.6v5h-5z" fill="currentColor"/>`,
  lock: `<rect x="5" y="10.5" width="14" height="10.5" rx="2.5" fill="#f3e9d4"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#f3e9d4" stroke-width="2.4"/><circle cx="12" cy="15.5" r="1.6" fill="#6d5a48"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  arrow: `<path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  tower: `<path d="M7 21V9h10v12z" fill="#b98b5e"/><path d="M5 9l7-6 7 6z" fill="#c43f2d"/><rect x="10.5" y="13" width="3" height="8" fill="#5a3f2a"/><rect x="6" y="8.5" width="12" height="1.6" fill="#8a6a4e"/><path d="M9 15.5h6" stroke="#e5e4cc" stroke-width="1"/>`,
  cashier: `<rect x="4" y="12" width="16" height="10" rx="4" fill="#3f7fa8"/><rect x="8.5" y="14" width="7" height="7" rx="1.5" fill="#f4f1e6"/><circle cx="12" cy="7.2" r="3.8" fill="#f1c9a3"/><path d="M7.8 6.8a4.3 4.3 0 0 1 8.4 0z" fill="#2c3e50"/><rect x="9.5" y="16" width="5" height="3" rx="1" fill="#5fd45a"/>`,
  hunter: `<rect x="5" y="12" width="14" height="10.5" rx="4.5" fill="#8a5a3a"/><circle cx="12" cy="7.2" r="3.8" fill="#f1c9a3"/><path d="M7.6 7.2a4.4 4.4 0 0 1 8.8 0z" fill="#5c3b25"/><path d="M17 21.5V4" stroke="#6b4b32" stroke-width="1.6" stroke-linecap="round"/><path d="M17 1.5l2 3.5h-4z" fill="#dfe8ec"/><rect x="7.5" y="11" width="9" height="2.2" rx="1.1" fill="#e9dcc3"/>`,
  auto: `<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M19 3.5l2 2M5 3.5l-2 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  navigate: `<path d="M12 3l7 17-7-4-7 4z" fill="currentColor"/>`,
  star: `<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="currentColor"/>`,
};
export const icon = (name, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export function installSprite(doc) {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = Object.entries(icons).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
  doc.body.prepend(svg);
}
export const iconDataUrl = (name, color = '#fff') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" style="color:${color}">${icons[name]}</svg>`);
