import { buildSimpleModule } from "../buildSimpleModule";

// We define a dummy field list since it's read-only, we won't use the form.
const dummyFields = [];

export const leave_transactionsConfig = buildSimpleModule({
  folder: "Leave-Transactions",
  model: "leave_transactions",
  title: "Leave Transactions",
  singularName: "Leave Transaction",
  fields: dummyFields,
  submitButton: { text: "Save", color: "blue" },
  list: {
    // Hide default columns if needed, but we want to see them all
    hiddenColumns: ["__v", "updatedAt"]
  }
});
