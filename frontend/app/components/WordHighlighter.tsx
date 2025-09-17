// app/components/WordHighlighter.tsx
"use client";
import { tokenizeParagraph, Token } from "@/app/lib/textTiming";

export default function WordHighlighter({
  text,
  activeWordIndex,
  tokens: tokensProp,
}: {
  text: string;
  activeWordIndex: number | null;
  tokens?: Token[];
}) {
  const tokens = tokensProp ?? tokenizeParagraph(text);
  return (
    <p className="leading-8 text-lg">
      {tokens.map((t, i) => (
        <span
          key={`${i}-${t.startChar}`}
          className={activeWordIndex === i ? "font-bold underline" : ""}
        >
          {t.word}{" "}
        </span>
      ))}
    </p>
  );
}

