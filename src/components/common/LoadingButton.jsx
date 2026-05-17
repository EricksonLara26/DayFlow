import Button from "./Button";

export default function LoadingButton({
  children,
  disabled = false,
  loading = false,
  loadingText = "Cargando...",
  ...props
}) {
  return (
    <Button disabled={disabled || loading} loading={loading} loadingText={loadingText} {...props}>
      {children}
    </Button>
  );
}
