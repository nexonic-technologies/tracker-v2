import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formDraftKey, loadFormDraft, clearFormDraft } from "../../utils/formDrafts";

/**
 * Shows a banner when a failed-save draft exists for a model.
 */
export default function FormDraftBanner({
  model,
  formPath,
  label = "draft",
  recordId = "new",
  onRestore,
}) {
  const [draft, setDraft] = useState(null);
  const draftKey = formDraftKey(model, recordId);

  useEffect(() => {
    setDraft(loadFormDraft(draftKey));
  }, [draftKey]);

  if (!draft) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-tracker-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <span className="text-ink">
        Unsaved {label} from{" "}
        {draft.savedAt
          ? new Date(draft.savedAt).toLocaleString()
          : "a previous session"}
      </span>
      <div className="flex items-center gap-2">
        {onRestore ? (
          <button
            type="button"
            onClick={() => {
              onRestore(draft);
              clearFormDraft(draftKey);
              setDraft(null);
            }}
            className="tracker-btn-brand !py-1.5 !px-3 !text-xs"
          >
            Restore {label}
          </button>
        ) : (
          <Link
            to={formPath}
            state={{ restoreDraft: true }}
            className="tracker-btn-brand !py-1.5 !px-3 !text-xs"
          >
            Restore {label}
          </Link>
        )}
        <button
          type="button"
          className="tracker-btn-ghost !py-1.5 !px-3 !text-xs"
          onClick={() => {
            clearFormDraft(draftKey);
            setDraft(null);
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
