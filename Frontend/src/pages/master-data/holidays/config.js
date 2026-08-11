import { holidayFormFields, holidaySubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const holidaysConfig = buildSimpleModule({
  folder: "Holidays",
  model: "holidays",
  title: "Holidays",
  singularName: "Holiday",
  fields: holidayFormFields,
  submitButton: holidaySubmit,
});
