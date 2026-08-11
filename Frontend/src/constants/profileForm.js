export const profileFormFields = (userData) => [
  // Profile Image
  {
    name: "basicInfo.profileImage",
    label: "Profile Image",
    type: "file",
    accept: "image/*",
    orderKey: 0,
    gridClass: "col-span-2",
  },

  // Basic Information
  {
    name: "basicInfo.firstName",
    label: "First Name",
    type: "text",
    placeholder: "Enter first name",
    required: true,
    orderKey: 1,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.lastName",
    label: "Last Name", 
    type: "text",
    placeholder: "Enter last name",
    required: true,
    orderKey: 2,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.email",
    label: "Personal Email",
    type: "email",
    placeholder: "Enter email address",
    orderKey: 3,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.phone",
    label: "Phone Number",
    type: "tel",
    placeholder: "Enter phone number",
    orderKey: 4,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.dob",
    label: "Date of Birth",
    type: "date",
    orderKey: 5,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.fatherName",
    label: "Father's Name",
    type: "text",
    placeholder: "Enter father's name",
    orderKey: 7,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.motherName",
    label: "Mother's Name", 
    type: "text",
    placeholder: "Enter mother's name",
    orderKey: 8,
    gridClass: "col-span-1",
  },

  // Address Information
  {
    name: "basicInfo.address.street",
    label: "Street Address",
    type: "text",
    placeholder: "Enter street address",
    orderKey: 9,
    gridClass: "col-span-2",
  },
  {
    name: "basicInfo.address.country",
    label: "Country",
    type: "AutoComplete",
    source: "/countries",
    placeholder: "Select country",
    orderKey: 10,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.address.state",
    label: "State",
    type: "AutoComplete",
    source: "/states/:countryId",
    dependsOn: "basicInfo.address.country",
    placeholder: "Select state",
    orderKey: 11,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.address.city",
    label: "City",
    type: "AutoComplete",
    source: "/cities/:stateId",
    dependsOn: "basicInfo.address.state",
    placeholder: "Select city",
    orderKey: 12,
    gridClass: "col-span-1",
  },
  {
    name: "basicInfo.address.zip",
    label: "ZIP Code",
    type: "text",
    placeholder: "Enter ZIP code",
    orderKey: 13,
    gridClass: "col-span-1",
  },

  // Account Details
  {
    name: "accountDetails.accountName",
    label: "Account Holder Name",
    type: "text",
    placeholder: "Enter account holder name",
    orderKey: 16,
    gridClass: "col-span-1",
  },
  {
    name: "accountDetails.accountNo",
    label: "Account Number",
    type: "text",
    placeholder: "Enter account number",
    orderKey: 17,
    gridClass: "col-span-1",
  },
  {
    name: "accountDetails.ifscCode",
    label: "IFSC Code",
    type: "text",
    placeholder: "Enter IFSC code",
    orderKey: 18,
    gridClass: "col-span-1",
    autoFetch: {
      target: "accountDetails.bankName"
    }
  },
  {
    name: "accountDetails.bankName",
    label: "Bank Name",
    type: "text",
    placeholder: "Auto-filled from IFSC or enter manually",
    orderKey: 19,
    gridClass: "col-span-1",
  },

  // Personal Documents
  {
    name: "personalDocuments.pan",
    label: "PAN Number",
    type: "text",
    placeholder: "Enter PAN number",
    orderKey: 21,
    gridClass: "col-span-1",
  },
  {
    name: "personalDocuments.aadhar",
    label: "Aadhar Number",
    type: "text",
    placeholder: "Enter Aadhar number",
    orderKey: 22,
    gridClass: "col-span-1",
  },

  // Security & SSO Linkage Info
  {
    name: "authInfo.googleEmail",
    label: "Google Email (SSO)",
    type: "email",
    placeholder: "Enter your Google/Gmail address",
    orderKey: 23,
    gridClass: "col-span-1",
  },
  {
    name: "authInfo.googleLoginEnabled",
    label: "Google Sign-In",
    type: "select",
    options: [
      { value: true, label: "Enabled" },
      { value: false, label: "Disabled" },
    ],
    orderKey: 24,
    gridClass: "col-span-1",
  },
];

export const profileSubmitButton = {
  text: "Update Profile",
  color: "blue",
};

/** Tab config for profile edit — keeps one FormRenderer across tab switches */
export const PROFILE_FORM_TABS = [
  { id: "personal", label: "Personal", fieldPrefixes: ["basicInfo"] },
  { id: "security", label: "Security", fieldPrefixes: ["authInfo"] },
  { id: "financial", label: "Financial", fieldPrefixes: ["accountDetails"] },
  { id: "documents", label: "Documents", fieldPrefixes: ["personalDocuments"] },
];

export const PROFILE_SUBMIT_LABELS = {
  personal: "Update Personal Info",
  security: "Update Security Settings",
  financial: "Update Financial Info",
  documents: "Update Documents",
};