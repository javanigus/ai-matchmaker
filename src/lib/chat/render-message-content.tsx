import type { ReactNode } from "react";

// Per founder feedback (onboarding, Phase 3): literal **bold** markers
// were showing up as raw asterisks in the transcript, and multi-item
// replies read better as an actual bulleted list. Every system prompt in
// this app now asks the model not to use **, but that's an instruction,
// not a guarantee — this strips any that slip through anyway, the same
// "don't purely trust the prompt for something that needs to be
// reliable" reasoning used server-side throughout this app. "- "
// prefixed lines render as a real list instead of plain text with a
// literal dash. Shared between onboarding's chat and Phase 6's ongoing
// AI Matchmaker panel — same model, same formatting rules, same defense.
export function renderMessageContent(content: string): ReactNode[] {
  const stripBold = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1");
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc list-inside space-y-0.5">
        {listItems.map((item, i) => (
          <li key={i}>{stripBold(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList();
    if (trimmed.length > 0) {
      blocks.push(
        <p key={`p-${i}`} className={blocks.length > 0 ? "mt-2" : ""}>
          {stripBold(line)}
        </p>
      );
    }
  });
  flushList();

  return blocks;
}
