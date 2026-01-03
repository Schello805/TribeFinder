'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Extend Window interface for Matomo
declare global {
  interface Window {
    _paq?: Array<(string | number | boolean)[]>;
  }
}

interface MatomoTrackerProps {
  url: string;
  siteId: string;
}

export default function MatomoTracker({ url, siteId }: MatomoTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!url || !siteId) return;

    // Ensure URL has trailing slash for consistency in logic below, or handle it
    const matomoUrl = url.endsWith('/') ? url : `${url}/`;

    // Initialize Matomo _paq
    const _paq = window._paq = window._paq || [];
    
    // Check if script is already present to avoid duplicates on re-renders
    if (!document.getElementById('matomo-script')) {
      _paq.push(['trackPageView']);
      _paq.push(['enableLinkTracking']);
      
      const script = document.createElement('script');
      script.id = 'matomo-script';
      script.type = 'text/javascript';
      script.async = true;
      script.src = `${matomoUrl}matomo.js`;
      
      // Basic error handling if script fails to load
      script.onerror = () => {
        console.warn('Matomo script failed to load');
      };

      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(script, firstScript);
    }
  }, [url, siteId]);

  // Track page views on route change
  useEffect(() => {
    if (!url || !siteId) return;
    
    const _paq = window._paq = window._paq || [];
    
    // Construct full URL or just path
    const fullUrl = window.location.pathname + window.location.search;
    
    _paq.push(['setCustomUrl', fullUrl]);
    _paq.push(['setDocumentTitle', document.title]);
    _paq.push(['trackPageView']);
  }, [pathname, searchParams, url, siteId]);

  return null;
}
