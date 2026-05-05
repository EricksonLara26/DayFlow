import { Check } from "lucide-react";

// Interpreta un subconjunto de Markdown para mostrar detalles enriquecidos.
function renderInlineMarkup(text) {
  const parts = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={`${match.index}-bold`}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={`${match.index}-italic`}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(<s key={`${match.index}-strike`}>{match[4]}</s>);
    } else if (match[5] && match[6]) {
      parts.push(
        <a key={`${match.index}-link`} href={match[6]} target="_blank" rel="noreferrer">
          {match[5]}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

// Renderiza listas, checklists, tablas y texto normal dentro de una tarea.
export default function TaskDescription({ text }) {
  const lines = text.split("\n");
  const elements = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.startsWith("|") && lines[index + 1]?.trim().startsWith("| ---")) {
      const tableRows = [];
      let rowIndex = index;

      while (lines[rowIndex]?.trim().startsWith("|")) {
        const currentLine = lines[rowIndex].trim();
        if (!/^\|\s*-+/.test(currentLine)) {
          tableRows.push(currentLine.split("|").slice(1, -1).map((cell) => cell.trim()));
        }
        rowIndex += 1;
      }

      elements.push(
        <table className="task-description-table" key={`table-${index}`}>
          <tbody>
            {tableRows.map((row, tableRowIndex) => (
              <tr key={`${index}-${tableRowIndex}`}>
                {row.map((cell, cellIndex) =>
                  tableRowIndex === 0 ? (
                    <th key={`${index}-${tableRowIndex}-${cellIndex}`}>{renderInlineMarkup(cell)}</th>
                  ) : (
                    <td key={`${index}-${tableRowIndex}-${cellIndex}`}>{renderInlineMarkup(cell)}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      index = rowIndex - 1;
      continue;
    }

    const checklistMatch = trimmedLine.match(/^- \[([ xX])\] (.+)$/);

    if (checklistMatch) {
      const isChecked = checklistMatch[1].toLowerCase() === "x";

      elements.push(
        <span
          className={`task-description-check ${isChecked ? "is-checked" : ""}`}
          key={`check-${index}`}
        >
          <span aria-hidden="true">{isChecked && <Check size={11} />}</span>
          <span>{renderInlineMarkup(checklistMatch[2])}</span>
        </span>,
      );
      continue;
    }

    if (trimmedLine.startsWith("- ")) {
      elements.push(
        <span className="task-description-line bullet" key={`bullet-${index}`}>
          {renderInlineMarkup(trimmedLine.replace("- ", ""))}
        </span>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmedLine)) {
      elements.push(
        <span className="task-description-line numbered" key={`numbered-${index}`}>
          {renderInlineMarkup(trimmedLine)}
        </span>,
      );
      continue;
    }

    elements.push(
      <span className="task-description-line" key={`line-${index}`}>
        {renderInlineMarkup(line)}
      </span>,
    );
  }

  return <div className="task-description">{elements.length ? elements : "Sin descripción"}</div>;
}
