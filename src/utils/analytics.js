import { logEvent } from 'firebase/analytics';
import { writeAnalyticsEvent } from './analyticsWriter.js';
import { EV, ev } from './analyticsSchema.js';

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
  writeAnalyticsEvent(EV.EXIT, ev.exit(_maxScroll, dur));
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
//
// To add a new event:
//   1. Add a key to EV and a builder to ev in analyticsSchema.js
//   2. Export a trackXxx function here using that builder
//   3. Add aggregation + render block in AnalyticsPanel.jsx

export function trackLinkClick(linkType, destination, ctx) {
  track('link_click', { link_type: linkType, destination });
  writeAnalyticsEvent(EV.LINK_CLICK, ev.linkClick(linkType, destination, ctx));
}

// ctx: where on the page the download was triggered ('header', 'contact', etc.)
export function trackResumeView(ctx) {
  track('resume_view', { method: 'pdf', ...(ctx ? { ctx } : {}) });
  writeAnalyticsEvent(EV.RESUME_VIEW, ev.resumeView(ctx));
}

export function trackSectionView(sectionName) {
  track('section_view', { section_name: sectionName });
  writeAnalyticsEvent(EV.SECTION_VIEW, ev.sectionView(sectionName));
}

// Called by useSectionView hook with accumulated dwell on section exit.
// 'sd' is separate from 'sv' so section reach counts and dwell are independent.
export function trackSectionDwell(sectionName, dwellMs) {
  writeAnalyticsEvent(EV.SECTION_DWELL, ev.sectionDwell(sectionName, dwellMs));
}

export function trackProjectExpand(projectId) {
  track('project_expand', { project_id: projectId });
  writeAnalyticsEvent(EV.PROJECT_EXPAND, ev.projectExpand(projectId));
}

