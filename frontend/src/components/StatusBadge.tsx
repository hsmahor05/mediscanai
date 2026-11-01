import type { Status } from "../types/api";
import { STATUS_LABEL, STATUS_STYLE } from "../utils/format";

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
