/**
 * Google Analytics 4 & Telemetry Utility Library
 * Supports SPA route tracking, Core Web Vitals forwarding, and developer-centric custom events.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

declare global {
  interface Window {
    gtag?: (command: string, targetId: string | Date, config?: Record<string, any>) => void;
    dataLayer?: any[];
  }
}

/**
 * Tracks a pageview in Google Analytics
 */
export function pageview(url: string) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

/**
 * Tracks a custom event in Google Analytics
 */
export function trackEvent(action: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', action, params);
  }
}

/**
 * Dedicated Developer Interaction Telemetry Events
 */
export const AnalyticsEvents = {
  // Ship Log Interactions
  shipLogViewed: (postId: string, title: string, techStack: string[] = []) =>
    trackEvent('ship_log_viewed', { post_id: postId, title, tech_stack: techStack.join(',') }),
  
  shipLogCreated: (postId: string, title: string) =>
    trackEvent('ship_log_created', { post_id: postId, title }),

  // Code SOS / Debugging
  codeSosViewed: (postId: string, language: string) =>
    trackEvent('code_sos_viewed', { post_id: postId, language }),
  
  codeSosDebugClick: (postId: string, language: string) =>
    trackEvent('code_sos_debug_click', { post_id: postId, language }),

  // Tech Showdowns
  techShowdownVoted: (postId: string, optionChosen: string, topic: string) =>
    trackEvent('tech_showdown_voted', { post_id: postId, option: optionChosen, topic }),

  // Matchmaking & Pair Debugging
  pairDebugStarted: (mode: string) =>
    trackEvent('pair_debug_started', { mode }),

  // Hackathon Crew
  hackathonCrewJoined: (hackathonName: string, role: string) =>
    trackEvent('hackathon_crew_joined', { hackathon: hackathonName, role }),

  // Developer Profile
  proofOfWorkViewed: (username: string, repo: string) =>
    trackEvent('proof_of_work_viewed', { username, repo }),
};

/**
 * Forward Core Web Vitals to Google Analytics
 */
export function trackWebVital(metric: {
  id: string;
  name: string;
  value: number;
  rating?: string;
}) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      rating: metric.rating,
      non_interaction: true,
    });
  }
}
