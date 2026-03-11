import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { UnifiedItem } from "@farfield/unified-surface";
import { ConversationItem } from "@/components/ConversationItem";
import { ReasoningTimelineGroup } from "@/components/ReasoningTimelineGroup";
import { ToolTimelineGroup } from "@/components/ToolTimelineGroup";
import { Button } from "@/components/ui/button";

export interface ChatTimelineEntry {
  key: string;
  item: UnifiedItem;
  isLast: boolean;
  turnIsInProgress: boolean;
  previousItemType: UnifiedItem["type"] | undefined;
  nextItemType: UnifiedItem["type"] | undefined;
  spacingTop: number;
}

interface ChatTimelineProps {
  selectedThreadId: string | null;
  turnsLength: number;
  hasAnyAgent: boolean;
  hasHiddenChatItems: boolean;
  visibleConversationItems: ChatTimelineEntry[];
  isChatAtBottom: boolean;
  onSelectThread: (threadId: string) => void;
  onShowOlder: () => void;
  onScrollToBottom: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  chatContentRef: React.RefObject<HTMLDivElement | null>;
}

type ReasoningItem = Extract<UnifiedItem, { type: "reasoning" }>;
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

type TimelineDisplayEntry =
  | {
      kind: "item";
      key: string;
      spacingTop: number;
      entry: ChatTimelineEntry;
    }
  | {
      kind: "reasoningGroup";
      key: string;
      spacingTop: number;
      entries: Array<ChatTimelineEntry & { item: ReasoningItem }>;
    }
  | {
      kind: "toolGroup";
      key: string;
      spacingTop: number;
      entries: Array<ChatTimelineEntry & { item: ToolGroupableItem }>;
    };

function isReasoningEntry(
  entry: ChatTimelineEntry,
): entry is ChatTimelineEntry & { item: ReasoningItem } {
  return entry.item.type === "reasoning";
}

function isToolGroupableEntry(
  entry: ChatTimelineEntry,
): entry is ChatTimelineEntry & { item: ToolGroupableItem } {
  return TOOL_GROUPABLE_ITEM_TYPES.includes(entry.item.type as ToolGroupableType);
}

function groupTimelineEntries(
  entries: ChatTimelineEntry[],
): TimelineDisplayEntry[] {
  const grouped: TimelineDisplayEntry[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (isReasoningEntry(entry)) {
      const reasoningEntries: Array<ChatTimelineEntry & { item: ReasoningItem }> = [
        entry,
      ];

      while (index + 1 < entries.length) {
        const nextEntry = entries[index + 1];
        if (!nextEntry || !isReasoningEntry(nextEntry)) {
          break;
        }
        index += 1;
        reasoningEntries.push(nextEntry);
      }

      const firstEntry = reasoningEntries[0]!;
      const lastEntry = reasoningEntries[reasoningEntries.length - 1]!;
      grouped.push({
        kind: "reasoningGroup",
        key:
          reasoningEntries.length === 1
            ? `reasoning:${firstEntry.key}`
            : `reasoning:${firstEntry.key}:${lastEntry.key}`,
        spacingTop: firstEntry.spacingTop,
        entries: reasoningEntries,
      });
      continue;
    }

    if (isToolGroupableEntry(entry)) {
      const toolEntries: Array<ChatTimelineEntry & { item: ToolGroupableItem }> = [
        entry,
      ];

      while (index + 1 < entries.length) {
        const nextEntry = entries[index + 1];
        if (!nextEntry || !isToolGroupableEntry(nextEntry)) {
          break;
        }
        index += 1;
        toolEntries.push(nextEntry);
      }

      if (toolEntries.length === 1) {
        grouped.push({
          kind: "item",
          key: entry.key,
          spacingTop: entry.spacingTop,
          entry,
        });
        continue;
      }

      const firstEntry = toolEntries[0]!;
      const lastEntry = toolEntries[toolEntries.length - 1]!;
      grouped.push({
        kind: "toolGroup",
        key: `tools:${firstEntry.key}:${lastEntry.key}`,
        spacingTop: firstEntry.spacingTop,
        entries: toolEntries,
      });
      continue;
    }

    grouped.push({
      kind: "item",
      key: entry.key,
      spacingTop: entry.spacingTop,
      entry,
    });
  }

  return grouped;
}

export const ChatTimeline = memo(function ChatTimeline({
  selectedThreadId,
  turnsLength,
  hasAnyAgent,
  hasHiddenChatItems,
  visibleConversationItems,
  isChatAtBottom,
  onSelectThread,
  onShowOlder,
  onScrollToBottom,
  scrollRef,
  chatContentRef,
}: ChatTimelineProps): React.JSX.Element {
  const timelineEntries = groupTimelineEntries(visibleConversationItems);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-4 z-10 h-10 bg-gradient-to-b from-background from-20% via-background/60 via-60% to-transparent to-100%"
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ overflowAnchor: "none" }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={selectedThreadId ?? "__no_thread__"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="max-w-3xl mx-auto px-4 pt-4 pb-6"
          >
            {turnsLength === 0 ? (
              <div className="text-center py-20 text-sm text-muted-foreground">
                {selectedThreadId
                  ? "No messages yet"
                  : hasAnyAgent
                    ? "Start typing to create a new thread"
                    : "Select a thread from the sidebar"}
              </div>
            ) : (
              <motion.div
                ref={chatContentRef}
                className="space-y-0"
                layout="position"
                style={{ overflowAnchor: "none" }}
              >
                {hasHiddenChatItems && (
                  <div className="flex justify-center pb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={onShowOlder}
                    >
                      Show older messages
                    </Button>
                  </div>
                )}
                {timelineEntries.map((entry) => (
                  <motion.div
                    key={entry.key}
                    layout="position"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ paddingTop: `${entry.spacingTop}px` }}
                  >
                    {entry.kind === "reasoningGroup" ? (
                      <ReasoningTimelineGroup
                        items={entry.entries.map((reasoningEntry) => reasoningEntry.item)}
                        isActive={
                          entry.entries[entry.entries.length - 1]?.isLast === true &&
                          entry.entries[entry.entries.length - 1]?.turnIsInProgress === true
                        }
                      />
                    ) : entry.kind === "toolGroup" ? (
                      <ToolTimelineGroup
                        entries={entry.entries}
                        isActive={
                          entry.entries[entry.entries.length - 1]?.isLast === true &&
                          entry.entries[entry.entries.length - 1]?.turnIsInProgress === true
                        }
                        onSelectThread={onSelectThread}
                      />
                    ) : (
                      <ConversationItem
                        item={entry.entry.item}
                        isLast={entry.entry.isLast}
                        turnIsInProgress={entry.entry.turnIsInProgress}
                        onSelectThread={onSelectThread}
                        previousItemType={entry.entry.previousItemType}
                        nextItemType={entry.entry.nextItemType}
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {!isChatAtBottom && turnsLength > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+7.25rem)] md:bottom-[7.75rem] z-20"
          >
            <Button
              type="button"
              onClick={onScrollToBottom}
              size="icon"
              className="h-10 w-10 rounded-full border border-border bg-card text-foreground shadow-lg hover:bg-muted"
            >
              <ArrowDown size={16} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
