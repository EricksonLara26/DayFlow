import { Send } from "lucide-react";
import { useState } from "react";
import LoadingButton from "../common/LoadingButton";
import EmptyState from "../common/EmptyState";
import { getRoleLabel } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";

export default function TicketComments({ canComment, comments, onAddComment }) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    setIsLoading(true);

    window.setTimeout(() => {
      onAddComment(cleanMessage);
      setMessage("");
      setIsLoading(false);
    }, 300);
  }

  return (
    <section className="detail-section">
      <div className="section-heading">
        <h2>Comentarios</h2>
        <span>{comments.length}</span>
      </div>

      <div className="comment-list">
        {comments.length ? (
          comments.map((comment) => (
            <article className="comment-item" key={comment.id}>
              <div>
                <strong>{comment.authorName}</strong>
                <span>{getRoleLabel(comment.role)}</span>
              </div>
              <p>{comment.message}</p>
              <time>{formatDateTime(comment.createdAt)}</time>
            </article>
          ))
        ) : (
          <EmptyState title="Sin comentarios" message="Los comentarios del ticket aparecerán aquí." />
        )}
      </div>

      {canComment ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Agregar comentario</span>
            <textarea
              disabled={isLoading}
              rows="4"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Escribe una actualización clara para el historial del ticket"
            />
          </label>
          <LoadingButton icon={Send} loading={isLoading} type="submit">
            Comentar
          </LoadingButton>
        </form>
      ) : null}
    </section>
  );
}
