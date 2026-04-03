import { logEvent } from 'firebase/analytics';
import { writeAnalyticsEvent } from './analyticsWriter.js';

// analytics is initialized in firebase.js (gitignored). If it doesn't exist
// (CI, local without config), all tracking calls become no-ops.
let _analytics = null;

async function loadAnalytics() {
  try {
    const mod = await import('../firebase');
    _analytics = mod.analytics;
  } catch {
    // firebase.js not present or misconfigured — tracking silently disabled
  }
}

loadAnalytics();

function track(eventName, params) {
  if (!_analytics) return;
  logEvent(_analytics, eventName, params);
}

// ── Scroll depth + time on page ──────────────────────────────────────────────
// Captured on exit (beforeunload / tab hide). Single write per page load.
// Uses short codes to keep the encrypted payload compact.

let _maxScroll = 0;
let _pageStart = Date.now();
let _exitSent = false;

function sendExitEvent() {
  if (_exitSent) return;
  _exitSent = true;
  const dur = Math.round((Date.now() - _pageStart) / 1000);
  // writeAnalyticsEvent is fire-and-forget — safe to call in beforeunload
  writeAnalyticsEvent('ex', { scroll: _maxScroll, dur });
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => {
    const pct = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100,
    );
    if (pct > _maxScroll) _maxScroll = pct;
  }, { passive: true });

  window.addEventListener('beforeunload', sendExitEvent);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sendExitEvent();
  });
}

// ── Tracked events ───────────────────────────────────────────────────────────

export function trackLinkClick(linkType, destination) {
  track('link_click', { link_type: linkType, destination });
  writeAnalyticsEvent('lc', { lt: linkType, dst: destination });
}

export function trackResumeView() {
  track('resume_view', { method: 'pdf' });
  writeAnalyticsEvent('rv', {});
}

export function trackSectionView(sectionName) {
  track('section_view', { section_name: sectionName });
  writeAnalyticsEvent('sv', { sec: sectionName });
}

export function trackProjectExpand(projectId) {
  track('project_expand', { project_id: projectId });
  writeAnalyticsEvent('pe', { pid: projectId });
}

export function trackThemeToggle(to) {
  track('theme_toggle', { to });
  writeAnalyticsEvent('tt', { to });
}

