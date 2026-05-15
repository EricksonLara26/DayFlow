export default function UserPhoto({ className = "", user }) {
  const initials = `${user?.firstName?.slice(0, 1) ?? ""}${user?.lastName?.slice(0, 1) ?? ""}`;

  return (
    <span className={`user-photo ${className}`.trim()} aria-hidden="true">
      <span>{initials || "U"}</span>
    </span>
  );
}
