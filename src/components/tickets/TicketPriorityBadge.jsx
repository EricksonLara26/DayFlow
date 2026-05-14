import Badge from "../common/Badge";
import { getPriorityColorClass, getPriorityLabel } from "../../utils/ticketUtils";

export default function TicketPriorityBadge({ priority }) {
  return <Badge className={getPriorityColorClass(priority)}>{getPriorityLabel(priority)}</Badge>;
}
