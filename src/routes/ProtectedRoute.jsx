export default function ProtectedRoute({ children, currentUser, fallback }) {
  return currentUser ? children : fallback;
}
