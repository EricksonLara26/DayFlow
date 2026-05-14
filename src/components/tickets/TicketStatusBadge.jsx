import Badge from "../common/Badge";
import { getStatusColorClass, getStatusLabel } from "../../utils/ticketUtils";

export default function TicketStatusBadge({ status }) {
  return <Badge className={getStatusColorClass(status)}>{getStatusLabel(status)}</Badge>;
}
