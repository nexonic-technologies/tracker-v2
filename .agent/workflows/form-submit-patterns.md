# Form submit patterns (POST / PATCH)

Manual for all entity forms. **Implemented:** Tickets, Tasks, **Profile**, **Master-Data** (all modules via `MasterDataFormView`).

## Tabbed forms — data must not clear on tab switch

- Use **one** `FormRenderer` instance per record (`key={record._id || "new"}` only — never key by `activeTab`).
- Pass **all** fields to `FormRenderer`; filter visible fields with `fieldsByTab` + `activeTab`.
- Form state lives in `FormRenderer` `formData` across tab changes.

## PATCH — send only changed fields

On **edit** (`data._id` present):

1. `FormRenderer` tracks `changedFields` on every user edit.
2. On submit, `buildDirtyPatch(baseline, formData, changedKeys)` builds the payload.
3. Untouched fields are **not** sent.
4. If nothing changed → toast "No changes to save" (no API call).

On **create**: send full `fullPayload` (meta), minus `_id`, `createdAt`, etc.

```javascript
// onSubmit signature
(payload, meta) => {
  // payload = patch (edit) or full body (create)
  // meta.fullPayload, meta.isEdit, meta.changedFields
}
```

Utilities: `frontend/src/utils/formPatch.js`

## Queued submit — no blocking navigation

Do **not** await the API before navigating away on create flows.

1. `enqueueFormSubmit({ execute, draftKey, draft, onSuccess, onError })` — `frontend/src/services/formSubmitQueue.js`
2. Queue runs in background with **450ms** gap between jobs (rate-friendly).
3. Navigate to list page immediately after enqueue.
4. Success → toast. Failure → save draft to `localStorage` + error toast.

```javascript
const handleSubmit = (payload, meta) => {
  enqueueFormSubmit({
    draftKey: formDraftKey("tickets", id || "new"),
    draft: { formData: meta.fullPayload, patch: payload, isEdit: Boolean(id) },
    execute: () => id
      ? axios.put(`/populate/update/tickets/${id}`, payload)
      : axios.post("/populate/create/tickets", meta.fullPayload),
    onSuccess: () => toast.success("Saved"),
  });
  navigate("/Tickets");
};
```

## Draft recovery on failure

- Key: `formDraftKey(model, id || "new")` → `Workhub:form-draft:{model}:{id}`
- Failed queue jobs call `saveFormDraft(key, { formData, ... })`.
- List pages show `FormDraftBanner` → **Restore** opens form with `state.restoreDraft: true`.
- Successful save clears draft via `clearFormDraft` in queue.

Utilities: `frontend/src/utils/formDrafts.js`  
Banner: `frontend/src/components/Forms/FormDraftBanner.jsx`

## Loading UX

- **No full-page spinner on submit** — only the submit button shows "Saving…".
- Initial record load may still use page-level spinner (`EntityFormPage` `fetching` only).

## Checklist for new forms

- [ ] Tabbed? → `EntityFormPage` + all fields, no tab in `FormRenderer` key
- [ ] Edit? → rely on `FormRenderer` dirty PATCH (don't strip in page handler)
- [ ] Create? → `enqueueFormSubmit` + immediate `navigate(listPath)`
- [ ] `draftModel` on `EntityFormPage` for create forms
- [ ] `FormDraftBanner` on list page

## Files

| File | Role |
|------|------|
| `utils/formPatch.js` | Dirty field PATCH builder |
| `utils/formDrafts.js` | localStorage draft CRUD |
| `services/formSubmitQueue.js` | Background POST/PATCH queue |
| `components/Common/FormRenderer.jsx` | Tab-safe state, dirty PATCH, button loading |
| `components/Forms/EntityFormPage.jsx` | Tab orchestration, draft restore |
| `components/Forms/FormDraftBanner.jsx` | List-page draft notice |
