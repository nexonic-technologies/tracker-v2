import {
  referenceTypeFormFields,
  reference_typesubmitButton,
} from "@constants/ReferenceTypeForm";
import { buildSimpleModule } from "../buildSimpleModule";

export const reference_typesConfig = buildSimpleModule({
  folder: "Reference-Types",
  model: "reference_types",
  title: "Reference Types",
  singularName: "Reference Type",
  fields: referenceTypeFormFields,
  submitButton: reference_typesubmitButton,
});
