// app/hooks/useAudioPlaylist.ts
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Track = { id: string; text: string; audio_url: string };

export function useAudioPlaylist() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [list, setList] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progress = useMemo(
    () => (duration > 0 ? currentTime / duration : 0),
    [currentTime, duration]
  );

  const load = useCallback((tracks: Track[], startIndex = 0) => {
    setList(tracks);
    setActiveIndex(Math.max(0, Math.min(startIndex, tracks.length - 1)));
  }, []);

  const setIndex = useCallback((i: number) => {
    setActiveIndex((prev) => {
      if (i < 0) return 0;
      if (!list.length) return 0;
      if (i >= list.length) return list.length - 1;
      return i;
    });
  }, [list.length]);

  const play = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
      setIsPlaying(true);
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
    a.src = list[activeIndex].audio_url;
    a.load();
    if (isPlaying) {
      a.play().catch(() => {});
    }
    const el = document.getElementById(`para-${activeIndex}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, list, isPlaying]);

  // Wire time events and prefetch next
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);
      if (a.duration && a.currentTime / a.duration > 0.8) {
        const nextTrack = list[activeIndex + 1];
        if (nextTrack) {
          const pre = new Audio();
          pre.preload = "auto";
          pre.src = nextTrack.audio_url;
        }
      }
    };
    const onEnd = () => next();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      console.warn("Audio error, skipping forward");
      next();
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
    };
  }, [activeIndex, list, next]);

  return {
    audioRef,
    list, load,
    activeIndex, setIndex,
    isPlaying, play, pause, toggle,
    currentTime, duration, progress,
    next, prev, seek,
  };
}

