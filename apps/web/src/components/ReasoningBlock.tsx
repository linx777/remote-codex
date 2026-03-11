import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronRight, Compass, Lightbulb, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReasoningBlockProps {
  summary: string[];
  text?: string | undefined;
  isActive: boolean;
}

function sanitizeLine(line: string): string {
  return line.replaceAll("**", "").trim();
}

function inferReasoningTitle(summary: string[], fallback: string): string {
  const first = summary[0] ?? "";
  if (summary.length > 1 && first.length > 0 && first.length <= 32) {
    return first;
  }
  return fallback;
}

function iconForReasoningTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("explor")) return Search;
  if (normalized.includes("plan") || normalized.includes("task")) return Compass;
  if (normalized.includes("think") || normalized.includes("reason")) return Brain;
  return Lightbulb;
}

export function ReasoningBlock({ summary, text, isActive }: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const sanitizedSummary = useMemo(
    () => summary.map(sanitizeLine).filter((line) => line.length > 0),
    [summary],
  );
  const fallbackTitle = isActive ? "Thinking" : "Reasoning";
  const title = inferReasoningTitle(sanitizedSummary, fallbackTitle);
  const detailLines =
    sanitizedSummary.length > 1 && title === sanitizedSummary[0]
      ? sanitizedSummary.slice(1)
      : sanitizedSummary;
  const currentDetail = detailLines[detailLines.length - 1] ?? null;
  const canExpand = detailLines.length > 1 || Boolean(text);
  const TitleIcon = iconForReasoningTitle(title);

  return (
    <div className="my-4 rounded-2xl border border-border/70 bg-card/75 px-4 py-3 shadow-sm">
      <Button
        type="button"
        onClick={() => {
          if (canExpand) setExpanded((value) => !value);
        }}
        variant="ghost"
        className="h-auto w-full justify-start gap-3 p-0 text-left hover:bg-transparent"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-full bg-muted/60 p-2 text-muted-foreground">
            <TitleIcon size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold text-foreground ${isActive ? "reasoning-shimmer" : ""}`}
              >
                {title}
              </span>
              {detailLines.length > 0 && !isActive && (
                <span className="text-xs text-muted-foreground/65">
                  {detailLines.length} step{detailLines.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {currentDetail && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {currentDetail}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 self-start pt-1">
          {isActive ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : canExpand ? (
            <ChevronRight
              size={14}
              className={`text-muted-foreground/70 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            />
          ) : null}
        </div>
      </Button>

      <AnimatePresence initial={false}>
        {expanded && canExpand && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
              {detailLines.map((line, index) => (
                <div key={`${line}-${String(index)}`} className="flex items-start gap-2">
                  <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/45" />
                  <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap break-words">
                    {line}
                  </p>
                </div>
              ))}
              {text && (
                <div className="rounded-xl bg-muted/25 px-3 py-2">
                  <pre className="text-[11px] text-muted-foreground/80 font-mono leading-5 whitespace-pre-wrap break-words">
                    {text}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
