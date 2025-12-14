"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAudioPlaylist } from "@/app/hooks/useAudioPlaylist";
import WordHighlighter from "@/app/components/WordHighlighter";
import {
  tokenizeParagraph,
  mergeTimings,
  findActiveWordIndex,
} from "@/app/lib/textTiming";

type Paragraph = {
  id: string;
  text: string;
  audio_url: string;
  task_id?: string;
};

type Article = { id: string; title: string; paragraphs: Paragraph[] };

type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY";

type TaskResp = {
  task_id?: string;
  status?: TaskStatus | string;
  state?: TaskStatus | string;
  result?: any;
};

function normalizeStatus(raw?: string | null): TaskStatus {
  const s = (raw ?? "").toUpperCase();
  if (s === "PENDING") return "PENDING";
  if (s === "STARTED") return "STARTED";
  if (s === "SUCCESS") return "SUCCESS";
  if (s === "FAILURE") return "FAILURE";
  if (s === "RETRY") return "RETRY";
  return "PENDING";
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
}

function clipPreview(text: string, max = 140) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function isAudioUrlReady(audioUrl?: string | null) {
  const u = (audioUrl ?? "").trim();
  return u.startsWith("/static/");
}

function isReadyFromStatus(status: TaskStatus | undefined) {
  return status === "SUCCESS";
}

function LedDot({
  ready,
  ariaLabel,
}: {
  ready: boolean;
  ariaLabel: string;
}) {
  return (
    <span
      className={`ondu-led ${ready ? "ondu-led--ready" : "ondu-led--notready"}`}
      aria-label={ariaLabel}
      role="img"
      title={ariaLabel}
    />
  );
}

function IconPlay(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={props.className}
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 7.6v8.8c0 .7.8 1.1 1.4.7l7.2-4.4c.6-.4.6-1.2 0-1.6l-7.2-4.4c-.6-.4-1.4 0-1.4.9z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconPause(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={props.className}
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8.5 6.8c0-.6.5-1.1 1.1-1.1h1.2c.6 0 1.1.5 1.1 1.1v10.4c0 .6-.5 1.1-1.1 1.1H9.6c-.6 0-1.1-.5-1.1-1.1V6.8zm7.2 0c0-.6.5-1.1 1.1-1.1H18c.6 0 1.1.5 1.1 1.1v10.4c0 .6-.5 1.1-1.1 1.1h-1.2c-.6 0-1.1-.5-1.1-1.1V6.8z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, TaskStatus>>(
    {}
  );

  const articleRef = useRef<Article | null>(null);
  const statusRef = useRef<Record<string, TaskStatus>>({});

  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [currentTimings, setCurrentTimings] = useState<
    ReturnType<typeof mergeTimings> | null
  >(null);

  const [showReader, setShowReader] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const {
    audioRef,
    list,
    load,
    activeIndex,
    setIndex,
    isPlaying,
    toggle,
    progress,
    seek,
    currentTime,
    duration,
    next,
    prev,
    hasMetadata,
    hasEverPlayed,
    notice,
    setNotice,
  } = useAudioPlaylist();

  useEffect(() => {
    articleRef.current = article;
  }, [article]);

  useEffect(() => {
    statusRef.current = taskStatusMap;
  }, [taskStatusMap]);

  useEffect(() => {
    if (!articleId) return;

    (async () => {
      try {
        const res = await fetch(`/api/article/${articleId}`);
        if (!res.ok) throw new Error(`Failed to load article (${res.status})`);
        const data = (await res.json()) as Article;

        setArticle(data);
        setError(null);

        const tracks = (data.paragraphs as Paragraph[]).filter(
          (p) => (p.text ?? "").trim().length > 0
        );

        load(tracks as any, 0);

        const init: Record<string, TaskStatus> = {};
        for (const p of tracks) {
          if (isAudioUrlReady(p.audio_url)) {
            init[p.id] = "SUCCESS";
          } else if (p.task_id) {
            init[p.id] = "PENDING";
          }
        }
        setTaskStatusMap(init);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load article");
      }
    })();
  }, [articleId, load]);

  useEffect(() => {
    if (!articleId) return;

    let alive = true;
    const intervalMs = 1500;
    let intervalId: number | null = null;

    const clear = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const pollOnce = async () => {
      if (!alive) return;
      const a = articleRef.current;
      if (!a) return;

      const unresolved = a.paragraphs.filter((p) => {
        if (!p.task_id) return false;
        if (isAudioUrlReady(p.audio_url)) return false;

        const st = statusRef.current[p.id];
        return st !== "FAILURE" && st !== "SUCCESS";
      });

      if (unresolved.length === 0) {
        clear();
        return;
      }

      try {
        const results = await Promise.all(
          unresolved.map(async (p) => {
            const res = await fetch(`/task_status/${p.task_id}`);
            if (!res.ok) throw new Error(`task_status failed (${res.status})`);
            const data: TaskResp = await res.json();

            const st = normalizeStatus(
              (data.status as string) ?? (data.state as string)
            );

            return { pid: p.id, status: st, result: data.result };
          })
        );

        if (!alive) return;

        setTaskStatusMap((prevMap) => {
          const nextMap = { ...prevMap };
          for (const r of results) nextMap[r.pid] = r.status;
          return nextMap;
        });

        const succeeded = results.filter(
          (r) => r.status === "SUCCESS" && r.result?.path
        );

        if (succeeded.length > 0) {
          setArticle((prevArticle) => {
            if (!prevArticle) return prevArticle;

            const updated: Article = {
              ...prevArticle,
              paragraphs: prevArticle.paragraphs.map((pp) => ({ ...pp })),
            };

            for (const s of succeeded) {
              const outPath: string = s.result.path;
              const filename = outPath.split(/[/\\]+/).pop();
              if (!filename) continue;

              const newUrl = `/static/${filename}`;
              const idx = updated.paragraphs.findIndex((x) => x.id === s.pid);
              if (idx >= 0) updated.paragraphs[idx].audio_url = newUrl;
            }

            return updated;
          });

          window.setTimeout(() => {
            const latest = articleRef.current;
            if (!latest) return;

            const tracks = latest.paragraphs.filter(
              (p) => (p.text ?? "").trim().length > 0
            );

            load(tracks as any, activeIndex);
          }, 0);
        }

        const a2 = articleRef.current;
        if (a2) {
          const stillUnresolved = a2.paragraphs.some((p) => {
            if (!p.task_id) return false;
            if (isAudioUrlReady(p.audio_url)) return false;
            const st = statusRef.current[p.id];
            return st !== "FAILURE" && st !== "SUCCESS";
          });
          if (!stillUnresolved) clear();
        }
      } catch (e) {
        console.warn("Task polling error:", e);
      }
    };

    intervalId = window.setInterval(pollOnce, intervalMs);
    pollOnce();

    return () => {
      alive = false;
      clear();
    };
  }, [articleId, load, activeIndex]);

  const tokenMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tokenizeParagraph>>();
    for (const p of list) map.set(p.id, tokenizeParagraph(p.text));
    return map;
  }, [list]);

  useEffect(() => {
    const track = list[activeIndex];
    if (!track || !hasMetadata) {
      setCurrentTimings(null);
      return;
    }
    const toks = tokenMap.get(track.id) ?? [];
    setCurrentTimings(mergeTimings(toks, undefined, duration));
  }, [list, activeIndex, hasMetadata, duration, tokenMap]);

  useEffect(() => {
    if (!currentTimings) {
      setActiveWordIndex(null);
      return;
    }
    setActiveWordIndex(findActiveWordIndex(currentTimings, currentTime));
  }, [currentTimings, currentTime]);

  useEffect(() => {
    if (isScrubbing) return;
    const track = list[activeIndex];
    if (!track) return;
    const el = document.getElementById(`queue-${track.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIndex, list, isScrubbing]);

  if (!articleId) return <div className="text-red-600">Invalid article id.</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!article) return <div className="ondu-muted">Loading…</div>;

  const nonEmptyParas = article.paragraphs.filter(
    (p) => (p.text ?? "").trim().length > 0
  );

  const readyCount = nonEmptyParas.filter((p) => isAudioUrlReady(p.audio_url))
    .length;

  const totalCount = nonEmptyParas.length;
  const pct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 100;

  const activeTrack = list[activeIndex];
  const activeReady =
    activeTrack ? isAudioUrlReady(activeTrack.audio_url) : true;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {article.title}
          </h1>
          <p className="mt-1 text-sm ondu-muted">
            {list.length} paragraphs • {readyCount}/{totalCount} audio ready
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
          >
            Back
          </button>
          <button
            onClick={() => setShowReader((v) => !v)}
            className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
          >
            {showReader ? "Hide text" : "Show text"}
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="ondu-surface-panel px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">Audio</div>
              <div className="text-xs ondu-muted">
                {pct < 100 ? "Preparing audio." : "All ready."}
              </div>
            </div>
            <div className="text-sm tabular-nums">
              {readyCount}/{totalCount}
            </div>
          </div>

          <div className="mt-2 h-2 w-full rounded-full bg-[color:color-mix(in_srgb,var(--text-primary)_12%,transparent)]">
            <div
              className="h-2 rounded-full bg-[color:var(--accent)]"
              style={{ width: `${pct}%` }}
              aria-label="Audio readiness progress"
            />
          </div>
        </div>
      )}

      <section className="ondu-surface-solid p-4 sm:p-5">
        <audio ref={audioRef} preload="metadata" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNotice(null);
                toggle();
              }}
              className="ondu-icon-btn ondu-icon-btn--lg"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <IconPause /> : <IconPlay />}
            </button>

            <div className="min-w-0">
              <div className="text-xs ondu-muted">Now playing</div>

              <div className="flex items-center gap-2">
                <LedDot
                  ready={activeReady}
                  ariaLabel={activeReady ? "Audio ready" : "Audio not ready"}
                />
                <div className="text-sm sm:text-base font-semibold truncate">
                  {activeTrack ? `Paragraph ${activeIndex + 1}` : "—"}
                </div>
              </div>

              {!hasEverPlayed && (
                <div className="mt-1 text-xs ondu-muted">
                  Press play and let it run. Tap a paragraph below to jump.
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={prev}
                  className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
                  aria-label="Previous"
                >
                  Prev
                </button>
                <button
                  onClick={next}
                  className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
                  aria-label="Next"
                >
                  Next
                </button>
              </div>

              <div className="text-xs tabular-nums ondu-muted">
                {hasMetadata
                  ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                  : "Loading…"}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onMouseDown={() => setIsScrubbing(true)}
              onTouchStart={() => setIsScrubbing(true)}
              onMouseUp={() => setIsScrubbing(false)}
              onTouchEnd={() => setIsScrubbing(false)}
              onChange={(e) => {
                const r = parseFloat(e.target.value);
                seek(r);

                if (currentTimings && duration) {
                  const t = Math.max(0, Math.min(duration * r, duration - 0.01));
                  setActiveWordIndex(findActiveWordIndex(currentTimings, t));
                }
              }}
              className="mt-3 w-full accent-[color:var(--accent)]"
              aria-label="Progress"
              disabled={!hasMetadata}
            />

            {notice && <div className="mt-2 text-xs ondu-muted">{notice}</div>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className="ondu-surface-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
            <div className="text-sm font-semibold">Queue</div>
            <div className="text-xs ondu-muted tabular-nums">
              {activeIndex + 1}/{list.length}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {list.map((p, i) => {
              const isActive = i === activeIndex;
              const ready = isAudioUrlReady(p.audio_url);

              return (
                <button
                  key={p.id}
                  id={`queue-${p.id}`}
                  onClick={() => setIndex(i)}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-[color:var(--border)] transition",
                    // ✅ FIX: theme-safe active background (no Tailwind dark variant, no white/black keywords)
                    isActive
                      ? "bg-[color:color-mix(in_srgb,var(--accent)_10%,var(--surface))]"
                      : "hover:bg-[color:color-mix(in_srgb,var(--surface)_45%,transparent)]",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <LedDot
                        ready={ready}
                        ariaLabel={ready ? "Audio ready" : "Audio not ready"}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">
                          Paragraph {i + 1}
                        </div>
                        {isActive && (
                          <span className="text-[11px] font-medium text-[color:var(--text-secondary)]">
                            Playing
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs ondu-muted">
                        {clipPreview(p.text, 160)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {showReader && (
          <section className="ondu-surface-solid p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs ondu-muted">Reading</div>
                <div className="text-base font-semibold">
                  {activeTrack ? `Paragraph ${activeIndex + 1}` : "—"}
                </div>
              </div>

              <button
                onClick={() => setShowReader(false)}
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
              >
                Hide
              </button>
            </div>

            <div className="mt-4">
              <div className="ondu-reader">
                {activeTrack ? (
                  <WordHighlighter
                    text={activeTrack.text}
                    activeWordIndex={activeWordIndex}
                  />
                ) : (
                  <div className="ondu-muted">No paragraph selected.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
        >
          Back
        </button>
      </div>
    </div>
  );
}
