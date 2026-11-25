'use client';

import { useEffect, useState } from 'react';
import type { UserMetadata } from '@/types/lead';

const SESSION_KEY = 'aura_session_id_v1';
const UTM_CACHE_KEY = 'aura_utm_cache_v1';

function detectDevice(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Mobile (iOS)';
  if (/Android/i.test(ua)) return 'Mobile (Android)';
  if (/Mobile/i.test(ua)) return 'Mobile';
  if (/Edg\//i.test(ua)) return 'Desktop (Edge)';
  if (/Chrome/i.test(ua)) return 'Desktop (Chrome)';
  if (/Safari/i.test(ua)) return 'Desktop (Safari)';
  if (/Firefox/i.test(ua)) return 'Desktop (Firefox)';
  return 'Desktop';
}

export function useUserMetadata() {
  const [sessionId, setSessionId] = useState<string>('aura-pending-session');
  const [metadata, setMetadata] = useState<UserMetadata>({});

  useEffect(() => {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `aura-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    setSessionId(sid);

    const params = new URLSearchParams(window.location.search);
    const cachedUtmRaw = window.sessionStorage.getItem(UTM_CACHE_KEY);
    let cachedUtm: Record<string, string | null> = {};
    if (cachedUtmRaw) {
      try {
        cachedUtm = JSON.parse(cachedUtmRaw) as Record<string, string | null>;
      } catch {
        cachedUtm = {};
      }
    }

    const utmSource = params.get('utm_source') ?? cachedUtm.utmSource ?? null;
    const utmMedium = params.get('utm_medium') ?? cachedUtm.utmMedium ?? null;
    const utmCampaign = params.get('utm_campaign') ?? cachedUtm.utmCampaign ?? null;

    window.sessionStorage.setItem(
      UTM_CACHE_KEY,
      JSON.stringify({ utmSource, utmMedium, utmCampaign })
    );

    setMetadata({
      utmSource,
      utmMedium,
      utmCampaign,
      pageUrl: window.location.href,
      referrer: document.referrer || null,
      device: detectDevice(navigator.userAgent),
    });
  }, []);

  return { sessionId, metadata };
}
