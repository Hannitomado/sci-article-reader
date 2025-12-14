"use client";

type Props = {
  text: string;
  activeWordIndex: number | null;
};

export default function WordHighlighter({ text, activeWordIndex }: Props) {
  if (!text) return null;

  /**
   * We split on whitespace but KEEP the whitespace,
   * so spacing is preserved exactly as written.
   */
  const tokens = text.split(/(\s+)/);

  let wordCounter = -1;

  return (
    <span>
      {tokens.map((token, i) => {
        // Whitespace: render as-is
        if (/^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }

        wordCounter += 1;
        const isActive = activeWordIndex === wordCounter;

        return (
          <span
            key={i}
            className={[
              "relative inline-block transition-colors duration-150",
              isActive
                ? "text-[color:var(--text-primary)]"
                : "text-[color:var(--text-primary)]",
            ].join(" ")}
          >
            {/* Highlight layer (behind text, no layout shift) */}
            {isActive && (
              <span
                aria-hidden
                className="
                  absolute inset-x-[-0.12em] inset-y-[0.55em]
                  rounded-sm
                  bg-[color:color-mix(in_srgb,var(--accent)_35%,transparent)]
                "
              />
            )}

            {/* Text itself */}
            <span className="relative z-10">{token}</span>
          </span>
        );
      })}
    </span>
  );
}
