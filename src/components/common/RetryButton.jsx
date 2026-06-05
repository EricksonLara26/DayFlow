import { RefreshCw } from "lucide-react";
import Button from "./Button";

export default function RetryButton({ children = "Reintentar", disabled = false, onRetry }) {
  if (!onRetry) {
    return null;
  }

  return (
    <Button disabled={disabled} icon={RefreshCw} variant="ghost" onClick={onRetry}>
      {children}
    </Button>
  );
}
