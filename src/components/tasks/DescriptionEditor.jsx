import { useEffect, useRef } from "react";
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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineHtml(text) {
  const parts = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    if (match[2]) {
      parts.push(`<strong>${escapeHtml(match[2])}</strong>`);
    } else if (match[3]) {
      parts.push(`<em>${escapeHtml(match[3])}</em>`);
    } else if (match[4]) {
      parts.push(`<s>${escapeHtml(match[4])}</s>`);
    } else if (match[5] && match[6]) {
      parts.push(
        `<a href="${escapeHtml(match[6])}" target="_blank" rel="noreferrer">${escapeHtml(match[5])}</a>`,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join("") || "<br>";
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.startsWith("|") && lines[index + 1]?.trim().startsWith("| ---")) {
      const rows = [];
      let rowIndex = index;

      while (lines[rowIndex]?.trim().startsWith("|")) {
        const currentLine = lines[rowIndex].trim();
        if (!/^\|\s*-+/.test(currentLine)) {
          rows.push(currentLine.split("|").slice(1, -1).map((cell) => cell.trim()));
        }
        rowIndex += 1;
      }

      blocks.push(
        `<table class="rich-description-table"><tbody>${rows
          .map(
            (row, tableRowIndex) =>
              `<tr>${row
                .map((cell) =>
                  tableRowIndex === 0
                    ? `<th>${renderInlineHtml(cell)}</th>`
                    : `<td>${renderInlineHtml(cell)}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      );
      index = rowIndex - 1;
      continue;
    }

    const checklistMatch = trimmedLine.match(/^- \[([ xX])\]\s?(.*)$/);

    if (checklistMatch) {
      const isChecked = checklistMatch[1].toLowerCase() === "x";
      blocks.push(
        `<div class="editor-check-row" data-checked="${isChecked ? "true" : "false"}"><span class="editor-check-box" contenteditable="false">${isChecked ? "✓" : ""}</span><span class="editor-check-text">${renderInlineHtml(checklistMatch[2])}</span></div>`,
      );
      continue;
    }

    if (trimmedLine.startsWith("- ")) {
      const items = [];
      let rowIndex = index;

      while (lines[rowIndex]?.trim().startsWith("- ") && !lines[rowIndex]?.trim().startsWith("- [")) {
        items.push(lines[rowIndex].trim().replace("- ", ""));
        rowIndex += 1;
      }

      blocks.push(`<ul>${items.map((item) => `<li>${renderInlineHtml(item)}</li>`).join("")}</ul>`);
      index = rowIndex - 1;
      continue;
    }

    if (/^\d+\.\s/.test(trimmedLine)) {
      const items = [];
      let rowIndex = index;

      while (/^\d+\.\s/.test(lines[rowIndex]?.trim() ?? "")) {
        items.push(lines[rowIndex].trim().replace(/^\d+\.\s/, ""));
        rowIndex += 1;
      }

      blocks.push(`<ol>${items.map((item) => `<li>${renderInlineHtml(item)}</li>`).join("")}</ol>`);
      index = rowIndex - 1;
      continue;
    }

    blocks.push(`<p>${renderInlineHtml(line)}</p>`);
  }

  return blocks.join("");
}

function getTextContent(node) {
  return (node.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

function inlineMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.replace(/\u00a0/g, " ");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();
  const childrenText = Array.from(node.childNodes).map(inlineMarkdown).join("");

  if (node.classList.contains("editor-check-box")) {
    return "";
  }

  if (tagName === "strong" || tagName === "b") {
    return `**${childrenText}**`;
  }

  if (tagName === "em" || tagName === "i") {
    return `*${childrenText}*`;
  }

  if (tagName === "s" || tagName === "strike" || tagName === "del") {
    return `~~${childrenText}~~`;
  }

  if (tagName === "a") {
    const href = node.getAttribute("href") || "https://ejemplo.com";

    return `[${childrenText || href}](${href})`;
  }

  if (tagName === "br") {
    return "\n";
  }

  return childrenText;
}

function htmlToMarkdown(root) {
  const blocks = [];

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = getTextContent(node);
      if (text) {
        blocks.push(text);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tagName = node.tagName.toLowerCase();

    if (node.classList.contains("editor-check-row")) {
      const isChecked = node.dataset.checked === "true";
      const text = inlineMarkdown(node.querySelector(".editor-check-text") ?? node).trim();
      blocks.push(`- [${isChecked ? "x" : " "}] ${text}`);
      return;
    }

    if (tagName === "ul" || tagName === "ol") {
      Array.from(node.querySelectorAll(":scope > li")).forEach((item, index) => {
        const prefix = tagName === "ol" ? `${index + 1}. ` : "- ";
        blocks.push(`${prefix}${inlineMarkdown(item).trim()}`);
      });
      return;
    }

    if (tagName === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map((row) =>
        Array.from(row.querySelectorAll("th, td")).map((cell) => inlineMarkdown(cell).trim()),
      );

      rows.forEach((row, index) => {
        blocks.push(`| ${row.join(" | ")} |`);
        if (index === 0) {
          blocks.push(`| ${row.map(() => "---").join(" | ")} |`);
        }
      });
      return;
    }

    const text = inlineMarkdown(node).trim();
    if (text) {
      blocks.push(text);
    }
  });

  return blocks.join("\n");
}

// Editor enriquecido que se ve formateado, pero guarda Markdown para las tareas.
export default function DescriptionEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const lastMarkdownRef = useRef(value);

  useEffect(() => {
    if (!editorRef.current || value === lastMarkdownRef.current) {
      return;
    }

    editorRef.current.innerHTML = markdownToHtml(value);
    lastMarkdownRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.innerHTML = markdownToHtml(value);
    lastMarkdownRef.current = value;
  }, []);

  function emitChange() {
    const nextMarkdown = editorRef.current ? htmlToMarkdown(editorRef.current) : "";
    lastMarkdownRef.current = nextMarkdown;
    onChange(nextMarkdown);
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function insertHtml(html) {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    emitChange();
  }

  function runCommand(command) {
    const selection = window.getSelection();
    const hasSelection =
      selection?.rangeCount && editorRef.current?.contains(selection.anchorNode) && !selection.isCollapsed;

    focusEditor();
    document.execCommand(command);

    if (hasSelection) {
      emitChange();
    }
  }

  function insertLink() {
    const selection = window.getSelection();
    const hasSelection =
      selection?.rangeCount && editorRef.current?.contains(selection.anchorNode) && !selection.isCollapsed;

    if (hasSelection) {
      document.execCommand("createLink", false, "https://ejemplo.com");
      emitChange();
      return;
    }

    focusEditor();
  }

  function insertList(tagName) {
    focusEditor();
    document.execCommand(tagName === "ol" ? "insertOrderedList" : "insertUnorderedList");
    emitChange();
  }

  function focusNode(node) {
    requestAnimationFrame(() => {
      if (!node) {
        return;
      }

      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(node);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editorRef.current?.focus();
    });
  }

  function insertChecklist() {
    insertHtml(
      '<div class="editor-check-row" data-checked="false"><span class="editor-check-box" contenteditable="false"></span><span class="editor-check-text"><br></span></div>',
    );
    focusNode(editorRef.current?.querySelector(".editor-check-row:last-child .editor-check-text"));
  }

  function insertTable() {
    insertHtml(
      '<table class="rich-description-table"><tbody><tr><th><br></th><th><br></th></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>',
    );
    focusNode(editorRef.current?.querySelector(".rich-description-table th"));
  }

  function clearFormatting() {
    const plainText = editorRef.current?.innerText ?? "";

    if (!editorRef.current) {
      return;
    }

    editorRef.current.innerHTML = plainText
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");
    emitChange();
  }

  function toggleChecklistItem(event) {
    const checkBox = event.target instanceof Element ? event.target.closest(".editor-check-box") : null;

    if (!checkBox) {
      return;
    }

    event.preventDefault();
    const row = checkBox.closest(".editor-check-row");
    const nextChecked = row.dataset.checked !== "true";

    row.dataset.checked = nextChecked ? "true" : "false";
    checkBox.textContent = nextChecked ? "✓" : "";
    emitChange();
  }

  function handleToolMouseDown(event, action) {
    event.preventDefault();
    action();
  }

  const tools = [
    {
      label: "Negrita",
      icon: Bold,
      action: () => runCommand("bold"),
    },
    {
      label: "Cursiva",
      icon: Italic,
      action: () => runCommand("italic"),
    },
    {
      label: "Tachado",
      icon: Strikethrough,
      action: () => runCommand("strikeThrough"),
    },
    {
      label: "Enlace",
      icon: Link,
      action: insertLink,
    },
    {
      label: "Lista con viñetas",
      icon: List,
      action: () => insertList("ul"),
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      action: () => insertList("ol"),
    },
    {
      label: "Checklist",
      icon: ListChecks,
      action: insertChecklist,
    },
    {
      label: "Tabla",
      icon: Table2,
      action: insertTable,
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
          >
            <tool.icon size={16} />
          </button>
        ))}
      </div>
      <div
        className="rich-description-editor"
        contentEditable
        data-placeholder="Agrega detalles, pasos, enlaces o una checklist"
        ref={editorRef}
        role="textbox"
        aria-label="Detalles de la tarea"
        aria-multiline="true"
        onClick={toggleChecklistItem}
        onInput={emitChange}
        suppressContentEditableWarning
      />
    </div>
  );
}
