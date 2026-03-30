import { logEvent } from 'firebase/analytics';

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

export function trackLinkClick(linkType, destination) {
  track('link_click', { link_type: linkType, destination });
}

export function trackResumeView() {
  track('resume_view', { method: 'pdf' });
}

export function trackSectionView(sectionName) {
  track('section_view', { section_name: sectionName });
}

export function trackProjectExpand(projectId) {
  track('project_expand', { project_id: projectId });
}

