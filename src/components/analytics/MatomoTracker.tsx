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
  trackingCode?: string;
}

function extractInlineScriptJs(trackingCode: string) {
  const trimmed = trackingCode.trim();
  if (!trimmed) return "";

  const withoutComments = trimmed.replace(/<!--([\s\S]*?)-->/g, "");
  const match = withoutComments.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return (match?.[1] ?? withoutComments).trim();
}

export default function MatomoTracker({ url, siteId, trackingCode }: MatomoTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!url || !siteId) return;

    // Ensure URL has trailing slash for consistency in logic below, or handle it
    const matomoUrl = url.endsWith('/') ? url : `${url}/`;

    // Initialize Matomo _paq
    const _paq = window._paq = window._paq || [];

    // If the admin provided the full tracking code, execute it once.
    const inlineJs = typeof trackingCode === "string" ? extractInlineScriptJs(trackingCode) : "";
    if (inlineJs && !document.getElementById('matomo-inline')) {
      const inline = document.createElement('script');
      inline.id = 'matomo-inline';
      inline.type = 'text/javascript';
      inline.text = inlineJs;
      document.head.appendChild(inline);
    }
    
    // Check if script is already present to avoid duplicates on re-renders
    if (!document.getElementById('matomo-script')) {
      _paq.push(['setTrackerUrl', `${matomoUrl}matomo.php`]);
      _paq.push(['setSiteId', siteId]);
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
