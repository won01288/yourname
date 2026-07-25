import type { Element } from "@/lib/naming/types";
import { ELEMENT_LABEL, elementTintStyle } from "@/app/lib/element-style";

export default function ElementBadge({ element, compact }: { element: Element; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill font-medium ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"}`}
      style={elementTintStyle(element)}
    >
      {ELEMENT_LABEL[element]}
    </span>
  );
}
