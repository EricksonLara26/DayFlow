import { Send } from "lucide-react";
import { useState } from "react";
import LoadingButton from "../common/LoadingButton";
import EmptyState from "../common/EmptyState";
import { getRoleLabel } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";
import {
  FORM_MIN_LENGTHS,
  cleanField,
  getApiErrorMessage,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";

export default function TicketComments({ canComment, comments, onAddComment }) {
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updateMessage(value) {
    setMessage(value);
    setFieldError("");
    setSubmitError("");
    setSubmitSuccess("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const cleanMessage = cleanField(message);

    if (isLoading) {
      return;
    }

    const required = requiredError(cleanMessage, "El comentario");
    const min = required ? "" : minLengthError(cleanMessage, "El comentario", FORM_MIN_LENGTHS.comment);
    const validationError = required || min;

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError("");
    setSubmitError("");
    setSubmitSuccess("");
    setIsLoading(true);

    window.setTimeout(() => {
      Promise.resolve(onAddComment(cleanMessage))
        .then((result) => {
          if (result?.ok === false) {
            setSubmitError(getApiErrorMessage(result, "No se pudo agregar el comentario."));
            return;
          }

          setMessage("");
          setSubmitSuccess(result?.message ?? "Comentario agregado correctamente.");
        })
        .catch(() => setSubmitError("No se pudo agregar el comentario."))
        .finally(() => setIsLoading(false));
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
              aria-invalid={Boolean(fieldError)}
              rows="4"
              value={message}
              onChange={(event) => updateMessage(event.target.value)}
              placeholder="Escribe una actualización clara para el historial del ticket"
            />
            {fieldError ? <p className="field-error">{fieldError}</p> : null}
          </label>
          {submitError ? <p className="form-error">{submitError}</p> : null}
          {submitSuccess ? <p className="form-success">{submitSuccess}</p> : null}
          <LoadingButton icon={Send} loading={isLoading} type="submit">
            Comentar
          </LoadingButton>
        </form>
      ) : null}
    </section>
  );
}
