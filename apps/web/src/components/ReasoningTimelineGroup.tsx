import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  ChevronRight,
  Compass,
  Lightbulb,
  Loader2,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { UnifiedItem } from "@farfield/unified-surface";
import { Button } from "@/components/ui/button";

type ReasoningItem = Extract<UnifiedItem, { type: "reasoning" }>;

interface ReasoningTimelineGroupProps {
  items: ReasoningItem[];
  isActive: boolean;
}

interface ReasoningSegment {
  key: string;
  title: string;
  details: string[];
  text?: string;
  icon: LucideIcon;
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

function iconForReasoningTitle(title: string): LucideIcon {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("explor")) return Search;
  if (normalized.includes("plan") || normalized.includes("task")) return Compass;
  if (normalized.includes("think") || normalized.includes("reason")) return Brain;
  return Lightbulb;
}

function buildReasoningSegment(
  item: ReasoningItem,
  index: number,
  isActive: boolean,
): ReasoningSegment | null {
  const sanitizedSummary = (item.summary ?? [])
    .map(sanitizeLine)
    .filter((line) => line.length > 0);
  const fallbackTitle = isActive ? "Thinking" : "Reasoning";
  const title = inferReasoningTitle(sanitizedSummary, fallbackTitle);
  const details =
    sanitizedSummary.length > 1 && title === sanitizedSummary[0]
      ? sanitizedSummary.slice(1)
      : sanitizedSummary;

  if (details.length === 0 && !item.text) {
    return null;
  }

  return {
    key: item.id ?? `reasoning-${String(index)}`,
    title,
    details,
    ...(item.text ? { text: item.text } : {}),
    icon: iconForReasoningTitle(title),
  };
}

export function ReasoningTimelineGroup({
  items,
  isActive,
}: ReasoningTimelineGroupProps): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  const segments = useMemo(
    () =>
      items
        .map((item, index) =>
          buildReasoningSegment(item, index, isActive && index === items.length - 1),
        )
        .filter((segment): segment is ReasoningSegment => segment !== null),
    [isActive, items],
  );

  const latestSegment = segments[segments.length - 1] ?? null;
  const latestDetail =
    latestSegment?.details[latestSegment.details.length - 1] ?? latestSegment?.title ?? null;
  const canExpand =
    segments.length > 1 ||
    segments.some((segment) => segment.details.length > 1 || Boolean(segment.text));
  const isExpanded = isActive || expanded;

  useEffect(() => {
    if (isActive && canExpand) {
      setExpanded(true);
    }
  }, [canExpand, isActive]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="my-4 rounded-2xl border border-border/70 bg-card/75 px-4 py-3 shadow-sm">
      <Button
        type="button"
        onClick={() => {
          if (canExpand && !isActive) {
            setExpanded((value) => !value);
          }
        }}
        variant="ghost"
        className="h-auto w-full justify-start gap-3 p-0 text-left hover:bg-transparent"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-full bg-muted/60 p-2 text-muted-foreground">
            <Compass size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold text-foreground ${isActive ? "reasoning-shimmer" : ""}`}
              >
                Thinking / Exploring
              </span>
              {!isActive && (
                <span className="text-xs text-muted-foreground/65">
                  {segments.length} update{segments.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {latestDetail && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {latestDetail}
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
              className={`text-muted-foreground/70 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            />
          ) : null}
        </div>
      </Button>

      <AnimatePresence initial={false}>
        {isExpanded && canExpand && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              {segments.map((segment) => {
                const SegmentIcon = segment.icon;
                return (
                  <div
                    key={segment.key}
                    className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                      <SegmentIcon size={12} />
                      <span>{segment.title}</span>
                    </div>
                    {segment.details.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {segment.details.map((line, index) => (
                          <div
                            key={`${segment.key}-${String(index)}`}
                            className="flex items-start gap-2"
                          >
                            <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/45" />
                            <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap break-words">
                              {line}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {segment.text && (
                      <div className="mt-3 rounded-xl bg-muted/25 px-3 py-2">
                        <pre className="text-[11px] text-muted-foreground/80 font-mono leading-5 whitespace-pre-wrap break-words">
                          {segment.text}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
