import { milestoneFormFields, milestoneSubmitButton } from "../../../constants/MilestoneForm";
import { buildSimpleModule } from "../buildSimpleModule";

export const milestonesConfig = buildSimpleModule({
  folder: "Milestones",
  model: "milestones",
  title: "Milestones",
  singularName: "Milestone",
  fields: milestoneFormFields,
  submitButton: milestoneSubmitButton,
});
