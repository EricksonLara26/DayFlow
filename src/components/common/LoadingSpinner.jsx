import { Loader } from "lucide-react";

const sizes = {
  sm: "loading-spinner-sm",
  md: "loading-spinner-md",
  lg: "loading-spinner-lg",
};

export default function LoadingSpinner({ size = "md" }) {
  return <Loader aria-label="Cargando" className={`loading-spinner ${sizes[size] ?? sizes.md}`} />;
}
