import { useRef } from "react";
import {
  Bold,
  Eraser,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  Table2,
} from "lucide-react";

// Editor simple tipo Markdown para los detalles de una tarea.
export default function DescriptionEditor({ value, onChange }) {
  const textareaRef = useRef(null);

  // Lee la seleccion actual para aplicar formato sin perder el cursor.
  function getSelection() {
    const textarea = textareaRef.current;

    return {
      start: textarea?.selectionStart ?? value.length,
      end: textarea?.selectionEnd ?? value.length,
    };
  }

  function placeCursor(start, end = start) {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start, end);
    });
  }

  function replaceSelection(nextValue, start, end = start) {
    onChange(nextValue);
    placeCursor(start, end);
  }

  // Agrega o quita envoltorios como **negrita**, *cursiva* o enlaces.
  function wrapSelection(prefix, suffix = prefix, fallback = "texto") {
    const { start, end } = getSelection();
    const selectedText = value.slice(start, end) || fallback;

    if (
      value.slice(start - prefix.length, start) === prefix &&
      value.slice(end, end + suffix.length) === suffix
    ) {
      const nextValue = `${value.slice(0, start - prefix.length)}${selectedText}${value.slice(end + suffix.length)}`;
      replaceSelection(nextValue, start - prefix.length, end - prefix.length);
      return;
    }

    const nextValue = `${value.slice(0, start)}${prefix}${selectedText}${suffix}${value.slice(end)}`;
    const selectionStart = start + prefix.length;

    replaceSelection(nextValue, selectionStart, selectionStart + selectedText.length);
  }

  // Inserta bloques completos como checklists o tablas.
  function insertBlock(block) {
    const { start, end } = getSelection();
    const before = value.slice(0, start);
    const after = value.slice(end);
    const separatorBefore = before && !before.endsWith("\n") ? "\n" : "";
    const separatorAfter = after && !after.startsWith("\n") ? "\n" : "";
    const nextValue = `${before}${separatorBefore}${block}${separatorAfter}${after}`;
    const cursor = before.length + separatorBefore.length + block.length;

    replaceSelection(nextValue, cursor);
  }

  // Aplica formato de lista a las lineas seleccionadas.
  function formatLines(createPrefix, fallback, removePattern) {
    const { start, end } = getSelection();

    if (start === end) {
      insertBlock(fallback);
      return;
    }

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextLineBreak = value.indexOf("\n", end);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const selectedText = value.slice(lineStart, lineEnd);
    const nextSelection = selectedText
      .split("\n")
      .map((line, index) => {
        if (!line.trim()) {
          return line;
        }

        const cleanedLine = removePattern ? line.replace(removePattern, "") : line;

        return `${createPrefix(index)}${cleanedLine}`;
      })
      .join("\n");
    const nextValue = `${value.slice(0, lineStart)}${nextSelection}${value.slice(lineEnd)}`;

    replaceSelection(nextValue, lineStart, lineStart + nextSelection.length);
  }

  function clearFormatting() {
    const { start, end } = getSelection();
    const selectedText = value.slice(start, end) || value;
    const cleanedText = selectedText
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*(- \[[ xX]\] |- |\d+\. )/gm, "");
    const nextValue =
      selectedText === value ? cleanedText : `${value.slice(0, start)}${cleanedText}${value.slice(end)}`;

    replaceSelection(
      nextValue,
      selectedText === value ? 0 : start,
      (selectedText === value ? 0 : start) + cleanedText.length,
    );
  }

  function handleToolMouseDown(event, action) {
    event.preventDefault();
    action();
  }

  const tools = [
    {
      label: "Negrita",
      icon: Bold,
      action: () => wrapSelection("**", "**", "texto importante"),
    },
    {
      label: "Cursiva",
      icon: Italic,
      action: () => wrapSelection("*", "*", "detalle"),
    },
    {
      label: "Tachado",
      icon: Strikethrough,
      action: () => wrapSelection("~~", "~~", "descartado"),
    },
    {
      label: "Enlace",
      icon: Link,
      action: () => wrapSelection("[", "](https://ejemplo.com)", "recurso"),
    },
    {
      label: "Lista con viñetas",
      icon: List,
      action: () => formatLines(() => "- ", "- Primer punto\n- Segundo punto", /^\s*(- \[[ xX]\] |- |\d+\. )/),
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      action: () =>
        formatLines((index) => `${index + 1}. `, "1. Primer paso\n2. Segundo paso", /^\s*(- \[[ xX]\] |- |\d+\. )/),
    },
    {
      label: "Checklist",
      icon: ListChecks,
      action: () => formatLines(() => "- [ ] ", "- [ ] Pendiente\n- [ ] Revisar", /^\s*(- \[[ xX]\] |- |\d+\. )/),
    },
    {
      label: "Tabla",
      icon: Table2,
      action: () => insertBlock("| Elemento | Estado |\n| --- | --- |\n| Tarea | Pendiente |"),
    },
    {
      label: "Limpiar formato",
      icon: Eraser,
      action: clearFormatting,
    },
  ];

  return (
    <div className="description-editor">
      <div className="description-toolbar" aria-label="Opciones de formato para detalles">
        {tools.map((tool) => (
          <button
            className="editor-tool"
            key={tool.label}
            type="button"
            aria-label={tool.label}
            title={tool.label}
            onMouseDown={(event) => handleToolMouseDown(event, tool.action)}
            onClick={(event) => {
              if (event.detail === 0) {
                tool.action();
              }
            }}
          >
            <tool.icon size={16} />
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Agrega detalles, pasos, enlaces o una checklist"
      />
    </div>
  );
}
