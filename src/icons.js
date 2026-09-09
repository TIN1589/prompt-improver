/**
 * icons.js — Hệ thống SVG Sprite và tiện ích biểu tượng cho Prompt Improver
 * Ngôn ngữ hình học Lucide: 24x24 viewBox, stroke 1.6-1.9px, bo góc, currentColor.
 * Riêng i-spark và i-bolt được tô filled làm nhận diện thương hiệu đặc trưng.
 */

export const SVG_SPRITE = `<svg width="0" height="0" style="position:absolute;display:none" aria-hidden="true">
<defs>
<symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 2.5c.6 3.4 1.4 5.4 2.7 6.7 1.3 1.3 3.3 2.1 6.8 2.8-3.5.7-5.5 1.5-6.8 2.8-1.3 1.3-2.1 3.3-2.7 6.7-.6-3.4-1.4-5.4-2.7-6.7-1.3-1.3-3.3-2.1-6.8-2.8 3.5-.7 5.5-1.5 6.8-2.8 1.3-1.3 2.1-3.3 2.7-6.7z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4.5 13.6h5.6L9.2 22 19.5 9.8H13.8L13 2z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5"/></symbol>
<symbol id="i-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3z"/><path d="M3.5 12 12 16.5l8.5-4.5"/><path d="M3.5 16.5 12 21l8.5-4.5"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 5.5 5.8v5.6c0 4.6 2.9 7.5 6.5 9 3.6-1.5 6.5-4.4 6.5-9V5.8L12 3.2z"/><path d="m9 12 2 2 4-4.2"/></symbol>
<symbol id="i-bug" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="8" height="9" rx="4"/><path d="M12 8V5.5M9.5 6.2 8 4.5M14.5 6.2 16 4.5M4.5 11H7M17 11h2.5M5 16l2-1.5M19 16l-2-1.5M8 13h8"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 4.7 16.6 15.4 5.9a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L8.5 20.3 4 20z"/><path d="m13.8 7.5 2.7 2.7"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="M3.7 12h16.6M12 3.7c2.3 2.3 3.5 5.2 3.5 8.3s-1.2 6-3.5 8.3c-2.3-2.3-3.5-5.2-3.5-8.3S9.7 6 12 3.7z"/></symbol>
<symbol id="i-wrench-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a3.7 3.7 0 0 0-4.9 4.3l-6 6a1.7 1.7 0 0 0 2.4 2.4l6-6a3.7 3.7 0 0 0 4.3-4.9l-2.4 2.4-2-.5-.5-2 2.4-2.4z"/><path d="M18.5 4v3.5M20.3 5.8h-3.6"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8a8 8 0 0 0-14.6-3.2M4 4v4.5H8.5"/><path d="M4 16a8 8 0 0 0 14.6 3.2M20 20v-4.5H15.5"/></symbol>
<symbol id="i-flask" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5h5M10 3.5v6.3L5.3 18a1.8 1.8 0 0 0 1.6 2.7h10.2a1.8 1.8 0 0 0 1.6-2.7L14 9.8V3.5"/><path d="M7.5 15h9"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.4-1-3.6-1.5-6-1.5v13c2.4 0 4.6.5 6 1.5 1.4-1 3.6-1.5 6-1.5V5c-2.4 0-4.6.5-6 1.5z"/><path d="M12 6.5v13"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8.3v7.4l6-3.7-6-3.7z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-undo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8H4V4"/><path d="M4.5 8A8 8 0 1 1 6 17.5"/></symbol>
<symbol id="i-save" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></symbol>
<symbol id="i-wifi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 9.2a11 11 0 0 1 15 0"/><path d="M7.5 12.7a6.7 6.7 0 0 1 9 0"/><path d="M10.6 16.2a2.6 2.6 0 0 1 2.8 0"/><circle cx="12" cy="19" r=".3" fill="currentColor"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15M9.5 6.5V4.3h5v2.2M6.5 6.5 7.4 20h9.2l.9-13.5"/><path d="M10 10.5v6M14 10.5v6"/></symbol>
<symbol id="i-retry" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 1 2.6 5.7"/><path d="M4 17.5V13h4.5"/></symbol>
<symbol id="i-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></symbol>
<symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.5V4M8 8l4-4 4 4"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11.5M8 12l4 4 4-4"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></symbol>
<symbol id="i-dot" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="M12 7.5V12l3 2"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21 19.5H3L12 4z"/><path d="M12 10v4M12 16.7v.1"/></symbol>
<symbol id="i-x-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="8.3"/><path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4"/></symbol>
<symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.3"/><path d="m8.3 12.3 2.6 2.6 5-5.4"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.5 14.5 9.3 20.8 9.9 16 14 17.4 20.2 12 16.9 6.6 20.2 8 14 3.2 9.9 9.5 9.3 12 3.5z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-bulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M9.5 21h5"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3.5z"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5V8h4M9 12.5h6M9 15.8h6"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".8" fill="currentColor"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></symbol>
<symbol id="i-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 12.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.2 6.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H8.8a1.7 1.7 0 0 0 1-1.6V.3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.2a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18v-11.5z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15.5M14 6l6 6-6 6"/></symbol>
</defs>
</svg>`;

/**
 * Tạo chuỗi HTML thẻ <svg> sử dụng symbol từ sprite
 * @param {string} iconId - ID của biểu tượng (vd: 'i-spark', 'i-copy')
 * @param {string} [extraClass=''] - Class CSS bổ sung (vd: 'pi-icon-accent', 'pi-icon-ok')
 * @param {string} [extraAttrs=''] - Thuộc tính bổ sung nếu có
 * @returns {string} Chuỗi SVG HTML
 */
export function iconSvg(iconId, extraClass = '', extraAttrs = '') {
  const cls = extraClass ? `pi-icon ${extraClass}` : 'pi-icon';
  return `<svg class="${cls}" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"${extraAttrs ? ' ' + extraAttrs : ''}><use href="#${iconId}"/></svg>`;
}
