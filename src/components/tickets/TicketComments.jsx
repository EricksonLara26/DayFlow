import { Send } from "lucide-react";
import { useState } from "react";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import { formatDateTime } from "../../utils/dateUtils";

export default function TicketComments({ canComment, comments, onAddComment }) {
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    onAddComment(cleanMessage);
    setMessage("");
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
                <span>{comment.role}</span>
              </div>
              <p>{comment.message}</p>
              <time>{formatDateTime(comment.createdAt)}</time>
            </article>
          ))
        ) : (
          <EmptyState title="Sin comentarios" message="Los comentarios del ticket apareceran aqui." />
        )}
      </div>

      {canComment ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Agregar comentario</span>
            <textarea
              rows="4"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Escribe una actualizacion clara para el historial del ticket"
            />
          </label>
          <Button icon={Send} type="submit">
            Comentar
          </Button>
        </form>
      ) : null}
    </section>
  );
}
