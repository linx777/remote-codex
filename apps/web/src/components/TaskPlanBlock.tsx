import { CheckCircle2, Circle, ListTodo, Loader2 } from "lucide-react";
import type { UnifiedItem } from "@farfield/unified-surface";

type TodoListItem = Extract<UnifiedItem, { type: "todoList" }>;

type TodoStatus = TodoListItem["plan"][number]["status"];

interface TaskPlanBlockProps {
  explanation?: string | undefined;
  plan: TodoListItem["plan"];
}

function isCompletedStatus(status: TodoStatus): boolean {
  return status === "completed";
}

function isInProgressStatus(status: TodoStatus): boolean {
  return status === "in_progress" || status === "inProgress";
}

export function TaskPlanBlock({ explanation, plan }: TaskPlanBlockProps) {
  const completedCount = plan.filter((entry) => isCompletedStatus(entry.status)).length;
  const totalCount = plan.length;
  const summaryLabel =
    totalCount === 0
      ? "No tasks yet"
      : `${completedCount} out of ${totalCount} task${totalCount === 1 ? "" : "s"} completed`;

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/25 px-4 py-3">
        <ListTodo size={15} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{summaryLabel}</div>
          {explanation && (
            <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap break-words">
              {explanation}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        {plan.map((entry, index) => {
          const isCompleted = isCompletedStatus(entry.status);
          const isInProgress = isInProgressStatus(entry.status);
          const Icon = isCompleted ? CheckCircle2 : isInProgress ? Loader2 : Circle;

          return (
            <div
              key={`${entry.step}-${String(index)}`}
              className={`flex items-start gap-3 rounded-xl px-3 py-2 ${
                isCompleted
                  ? "bg-emerald-500/8"
                  : isInProgress
                    ? "bg-amber-500/10"
                    : "bg-muted/30"
              }`}
            >
              <Icon
                size={16}
                className={`mt-0.5 shrink-0 ${
                  isCompleted
                    ? "text-emerald-500"
                    : isInProgress
                      ? "animate-spin text-amber-500"
                      : "text-muted-foreground/70"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-sm leading-6 whitespace-pre-wrap break-words ${
                    isCompleted ? "text-foreground/75 line-through" : "text-foreground"
                  }`}
                >
                  {entry.step}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/75">
                  {isCompleted
                    ? "Completed"
                    : isInProgress
                      ? "In progress"
                      : "Pending"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
