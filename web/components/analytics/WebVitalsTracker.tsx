'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { trackWebVital } from '@/lib/analytics';

export default function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    trackWebVital(metric);
  });

  return null;
}
