  import { useState, useEffect } from "react";

export default function InlineEdit({ value, onSave, canEdit }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value || "");

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const save = async () => {
    setEditing(false);
    if (input !== value) await onSave(input);
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setInput(value || "");
    setEditing(true);
  };

  if (!canEdit) return (
    <span>{value || "—"}</span>
  );

  return editing ? (
    <input
      autoFocus
      className="w-full bg-transparent border-none outline-none"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && save()}
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <span
      className="cursor-pointer"
      onClick={startEdit}
    >
      {value || "—"}
    </span>
  );
}
