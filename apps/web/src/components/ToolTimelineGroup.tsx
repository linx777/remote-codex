import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Loader2, Wrench } from "lucide-react";
import type { UnifiedItem } from "@farfield/unified-surface";
import { ConversationItem } from "@/components/ConversationItem";
import { Button } from "@/components/ui/button";

const TOOL_GROUPABLE_ITEM_TYPES = [
  "commandExecution",
  "fileChange",
  "webSearch",
  "mcpToolCall",
  "collabAgentToolCall",
  "remoteTaskCreated",
  "forkedFromConversation",
] as const;

type ToolGroupableType = (typeof TOOL_GROUPABLE_ITEM_TYPES)[number];
type ToolGroupableItem = Extract<UnifiedItem, { type: ToolGroupableType }>;

export interface ToolTimelineGroupEntry {
  key: string;
  item: ToolGroupableItem;
  isLast: boolean;
  turnIsInProgress: boolean;
}

interface ToolTimelineGroupProps {
  entries: ToolTimelineGroupEntry[];
  isActive: boolean;
  onSelectThread: (threadId: string) => void;
}

function summarizeToolItem(item: ToolGroupableItem): string {
  switch (item.type) {
    case "commandExecution":
      return item.status === "running"
        ? `Running: ${item.command}`
        : `Command: ${item.command}`;
    case "fileChange":
      return `Edited ${String(item.changes.length)} file${item.changes.length === 1 ? "" : "s"}`;
    case "webSearch":
      return `Web search: ${item.query}`;
    case "mcpToolCall":
      return `MCP tool: ${item.server}/${item.tool}`;
    case "collabAgentToolCall":
      return `Collab tool: ${item.tool}`;
    case "remoteTaskCreated":
      return `Remote task: ${item.taskId}`;
    case "forkedFromConversation":
      return `Forked from ${item.sourceConversationId}`;
  }
}

export function ToolTimelineGroup({
  entries,
  isActive,
  onSelectThread,
}: ToolTimelineGroupProps): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  const canExpand = entries.length > 1;
  const isExpanded = isActive || expanded;
  const latestSummary = useMemo(() => {
    const latestEntry = entries[entries.length - 1];
    return latestEntry ? summarizeToolItem(latestEntry.item) : "Tool activity";
  }, [entries]);

  useEffect(() => {
    if (isActive && canExpand) {
      setExpanded(true);
    }
  }, [canExpand, isActive]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="my-4 rounded-2xl border border-border/70 bg-card/75 px-4 py-3 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          if (canExpand && !isActive) {
            setExpanded((value) => !value);
          }
        }}
        className="h-auto w-full justify-start gap-3 p-0 text-left hover:bg-transparent"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-full bg-muted/60 p-2 text-muted-foreground">
            <Wrench size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Tool Activity</span>
              <span className="text-xs text-muted-foreground/65">
                {entries.length} event{entries.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{latestSummary}</p>
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
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-border/60 pt-3">
              {entries.map((entry, index) => {
                const previousType =
                  index > 0 ? entries[index - 1]!.item.type : undefined;
                const nextType =
                  index < entries.length - 1
                    ? entries[index + 1]!.item.type
                    : undefined;

                return (
                  <ConversationItem
                    key={entry.key}
                    item={entry.item}
                    isLast={entry.isLast}
                    turnIsInProgress={entry.turnIsInProgress}
                    onSelectThread={onSelectThread}
                    previousItemType={previousType}
                    nextItemType={nextType}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
