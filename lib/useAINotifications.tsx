/**
 * useAINotifications
 *
 * Hook that polls /api/ai-notifications every N seconds and fires
 * react-toastify toasts whenever new AI image batches are ready.
 *
 * Usage in game.tsx:
 *   import { useAINotifications } from '../lib/useAINotifications';
 *   // inside component:
 *   const { unreadCount } = useAINotifications({ enabled: status === 'authenticated' });
 *   // use unreadCount to drive the badge on "Quero me aprofundar"
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

interface AINotification {
  _id: string;
  title: string;
  body: string;
  tag: string;
  url: string;
  imageUrl?: string;
  createdAt: string;
}

interface UseAINotificationsOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
  /** If provided, clicking the toast navigates to this router */
  onNavigate?: (url: string) => void;
}

export function useAINotifications({
  enabled = true,
  pollIntervalMs = 30_000,
  onNavigate,
}: UseAINotificationsOptions = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCheckRef = useRef<string>(new Date(Date.now() - 60_000).toISOString());
  const seenTagsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-notifications?since=${encodeURIComponent(lastCheckRef.current)}`);
      if (!res.ok) return;

      const data = await res.json();
      const notifications: AINotification[] = data.notifications || [];

      // Only show truly new ones (not seen in this session)
      const freshNotifs = notifications.filter(n => !seenTagsRef.current.has(n.tag));

      if (freshNotifs.length > 0) {
        freshNotifs.forEach(n => {
          seenTagsRef.current.add(n.tag);

          toast.info(
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-sm">{n.title}</span>
              <span className="text-xs text-gray-300">{n.body}</span>
            </div>,
            {
              position: 'top-right',
              autoClose: 6000,
              icon: () => <>🤖</>,
              onClick: () => {
                if (onNavigate && n.url) onNavigate(n.url);
              },
              style: { cursor: onNavigate ? 'pointer' : 'default' },
            }
          );
        });

        setUnreadCount(prev => prev + freshNotifs.length);
        lastCheckRef.current = new Date().toISOString();

        // Mark as read on server (fire-and-forget)
        fetch('/api/ai-notifications', { method: 'POST' }).catch(() => undefined);
      }
    } catch {
      // Silently ignore network errors
    }
  }, [onNavigate]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check with a short delay (wait for auth to settle)
    const initTimer = setTimeout(checkNotifications, 3000);

    // Then poll regularly
    timerRef.current = setInterval(checkNotifications, pollIntervalMs);

    return () => {
      clearTimeout(initTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, pollIntervalMs, checkNotifications]);

  const clearCount = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, clearCount };
}
