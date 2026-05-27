import { urgencyLabel, urgencyLabelClass, urgencyLabelEmoji } from "@/lib/format";
import type { UrgencyLabel } from "@/types";

export function UrgencyBadge({ label }: { label: UrgencyLabel }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${urgencyLabelClass(label)}`}
    >
      {urgencyLabelEmoji(label)} {urgencyLabel(label)}
    </span>
  );
}
