// app/hooks/useAudioPlaylist.ts
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Track = {
  id: string;
  text: string;
  audio_url: string;
  task_id?: string; // <-- added so ReaderPage can show status badges safely
};

export function useAudioPlaylist() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [list, setList] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasMetadata, setHasMetadata] = useState(false);
  const [hasEverPlayed, setHasEverPlayed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const prefetchRef = useRef<HTMLAudioElement | null>(null);
  const prefetchedIdRef = useRef<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);

  // Keep retry ref in sync
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  const progress = useMemo(
    () => (duration > 0 ? currentTime / duration : 0),
    [currentTime, duration]
  );

  const load = useCallback((tracks: Track[], startIndex = 0) => {
    const filtered = tracks.filter((t) => (t.text ?? "").trim().length > 0);
    setList(filtered);
    setActiveIndex(Math.max(0, Math.min(startIndex, filtered.length - 1)));
  }, []);

  const setIndex = useCallback(
    (i: number) => {
      setActiveIndex(() => {
        if (i < 0) return 0;
        if (!list.length) return 0;
        if (i >= list.length) return list.length - 1;
        return i;
      });
    },
    [list.length]
  );

  const play = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
      setIsPlaying(true);
      // will set hasEverPlayed on 'play' event
    } catch (e) {
      console.warn("Play blocked:", e);
    }
  }, []);

  const pause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    isPlaying ? pause() : play();
  }, [isPlaying, pause, play]);

  const next = useCallback(() => {
    setActiveIndex((i) => {
      if (i < list.length - 1) return i + 1;
      pause();
      return i;
    });
  }, [list.length, pause]);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const seek = useCallback((ratio: number) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = Math.max(0, Math.min(a.duration * ratio, a.duration - 0.01));
  }, []);

  // Load new track when index or list changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || list.length === 0) return;

    const track = list[activeIndex];
    a.src = track.audio_url;
    a.load();

    setHasMetadata(false);
    setDuration(0);
    setCurrentTime(0);

    setRetryCount(0);
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // reset prefetch tracking for new active
    prefetchedIdRef.current = null;

    if (isPlaying) {
      a.play().catch(() => {});
    }
  }, [activeIndex, list, isPlaying]);

  // Wire time events and prefetch next
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);

      // Lightweight single prefetch ~85%
      if (a.duration && a.currentTime / a.duration > 0.85) {
        const nextTrack = list[activeIndex + 1];
        if (nextTrack && prefetchedIdRef.current !== nextTrack.id) {
          if (!prefetchRef.current) prefetchRef.current = new Audio();
          const pre = prefetchRef.current;
          pre.preload = "auto";
          pre.src = nextTrack.audio_url;
          prefetchedIdRef.current = nextTrack.id;
        }
      }
    };

    const onEnd = () => next();

    const onPlay = () => {
      setIsPlaying(true);
      if (!hasEverPlayed) setHasEverPlayed(true);
    };

    const onPause = () => setIsPlaying(false);

    const onError = () => {
      const track = list[activeIndex];
      const maxRetries = 10;

      const currentRetry = retryCountRef.current;

      if (currentRetry < maxRetries) {
        const delay = Math.min(500 + currentRetry * 300, 3000);

        setNotice(`Waiting for audio to be ready… (retry ${currentRetry + 1}/${maxRetries})`);

        setRetryCount((c) => c + 1);

        if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);

        retryTimerRef.current = window.setTimeout(() => {
          const player = audioRef.current;
          if (!player) return;

          const url = new URL(track.audio_url, window.location.origin);
          url.searchParams.set("_", String(Date.now())); // cache-buster
          player.src = url.toString();
          player.load();
          if (isPlaying) player.play().catch(() => {});
        }, delay) as unknown as number;

        return;
      }

      console.warn("Audio error after retries, skipping", track?.id, track?.audio_url);
      setNotice(`Audio unavailable for ${track?.id ?? "unknown"}, skipping…`);
      next();
    };

    const onLoadedMetadata = () => {
      setHasMetadata(isFinite(a.duration) && a.duration > 0);
      setDuration(a.duration || 0);
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    a.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [activeIndex, list, next, hasEverPlayed, isPlaying]);

  return {
    audioRef,
    list,
    load,
    activeIndex,
    setIndex,
    isPlaying,
    play,
    pause,
    toggle,
    currentTime,
    duration,
    progress,
    hasMetadata,
    hasEverPlayed,
    notice,
    setNotice,
    next,
    prev,
    seek,
  };
}
