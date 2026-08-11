# Enterprise Pre-Joining Confirmation Portal — Specification & Roadmap

## 1. Executive Summary
The **Pre-Joining Confirmation Portal** is a dedicated candidate self-service workflow within the External Portal (`External` Next.js app). It bridges the gap between **Candidate Offer Acceptance** and **Employee Onboarding**, allowing candidates to review job offers, complete mandatory pre-joining document uploads, submit bank & identity credentials required for payroll, consent to background verification (BGV), and acknowledge company HR policies prior to Day 1.

---

## 2. Access & Authentication (Application ID Flow)
- **Primary Identifier**: Unique `applicationId` (Format: `APP-YYYY-XXXX`, e.g., `APP-2026-8941`).
- **Access Gate**: Candidates access the external portal via:
  - **Direct URL**: `${VITE_EXTERNAL_PORTAL_URL}/pre-joining?applicationId=<APP_ID>`
  - **Manual Login**: Entering their `Application ID` + Registered Email/DOB.
- **Security**: Tokenized pre-joining session generated upon successful Application ID & Email match.

---

## 3. Pre-Joining Portal Layout & Candidate Steps

### Step 1: Offer Review & Pre-Joining Confirmation
- **Display Data**:
  - Position Title & Department
  - Offered Annual CTC (INR)
  - Target Joining Date
  - Reporting Manager & Work Location
  - Download Link for Digital Offer Letter
- **Action**: Candidate clicks **Confirm Joining** or **Decline Offer**.

### Step 2: Personal & Identity Information (Employee Model Baseline)
Capture fields required to create the `Employee` record that are not captured in the `Candidate` schema:
- **Identity Credentials**:
  - **PAN Card Number** (Validated format: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)
  - **Aadhar Card Number** (12 digits numeric)
  - **Passport Number & Expiry Date** (Optional)
- **Family & Emergency Contact**:
  - Father's Name & Mother's Name
  - Emergency Contact Name, Relation & Phone Number
  - Date of Birth (`dob`) & Blood Group

### Step 3: Bank & Payroll Credentials
- **Bank Account Details**:
  - Bank Account Holder Name
  - Account Number & Re-entered Account Number
  - Bank Name & Branch Name
  - **IFSC Code** (Validated format: `^[A-Z]{4}0[A-Z0-9]{6}$`)

### Step 4: Mandatory Document Uploads
Candidates upload digital copies (PDF/JPEG/PNG) required for HR Verification & Compliance:
1. **Identity & Address Proofs**:
   - PAN Card Copy (Mandatory)
   - Aadhar Card Copy (Front & Back)
   - Passport-Size Photograph
   - Permanent / Current Address Proof (Voter ID, Passport, Utility Bill)
2. **Educational Qualification Documents**:
   - 10th / 12th Marksheets & Passing Certificates
   - Graduation / Post-Graduation Degree Certificates
3. **Previous Employment / Experience Documents**:
   - Relieving Letter / Service Certificate from Last Employer
   - Resignation Acceptance Email/Letter from Previous Employer
   - Last 3 Months Payslips / Salary Certificate
4. **Payroll Documents**:
   - Cancelled Cheque / Bank Passbook Copy (showing Account Number & IFSC)

### Step 5: Consents & Declaration Agreements
Candidates must review and digitally sign/check mandatory consents:
- **Background Verification (BGV) Consent**: Authorization for education, past employment, and criminal background checks.
- **Self-Declaration**: Confirming no conflict of interest or pending criminal legal cases.
- **Data Privacy & Processing Consent**: Compliance with company data processing standards.

### Step 6: HR Policies Review & Digital Acknowledgement
Candidates are required to view and acknowledge key company policy documents:
1. **Code of Conduct & Ethics Policy**
2. **Non-Disclosure Agreement (NDA) & Intellectual Property Policy**
3. **Information Security & IT Usage Policy**
4. **POSH Policy (Prevention of Sexual Harassment at Workplace)**
5. **Leave & Working Hours Policy**

---

## 4. Integration Architecture & Data Flow

```
[ Frontend (HRMS Dashboard) ]
        │
        │ Click "→ Pre - Joining Confirmation"
        ▼ Opens `${VITE_EXTERNAL_PORTAL_URL}/pre-joining?applicationId=APP-2026-8941`
[ External Portal (Next.js) ]
        │
        │ API GET /api/candidates?applicationId=APP-2026-8941
        ▼
[ Backend (Node.js/Express) ] ──► Validates Candidate & Stage ('Offered' / 'Pre-Joining')
        │
        ▼ Candidate submits Pre-Joining Form
[ Backend candidates.js ] ──► Updates Candidate record + Stage to 'Pre-Joining Confirmed'
        │
        ▼ On HR Approval ('Hired')
[ Employee Model ] ──► Auto-populates basicInfo, accountDetails, personalDocuments & professionalInfo
```

---

## 5. Environment Configuration Matrix

| Variable | Environment | Default Value | Description |
|---|---|---|---|
| `VITE_EXTERNAL_PORTAL_URL` | Frontend (`.env`) | `http://localhost:3001` | External candidate portal base URL |
| `NEXT_PUBLIC_EXTERNAL_URL` | External (`.env`) | `http://localhost:3001` | External portal self base URL |
| `NEXT_PUBLIC_BACKEND_URL` | External (`.env`) | `http://localhost:3000` | Backend API base URL |
| `EXTERNAL_PORTAL_URL` | Backend (`.env`) | `http://localhost:3001` | Server-side external portal link generator |

---

## 6. Guest Candidate Role (`GuestCandidate`) & Policy Bypass Architecture

### Access Control Strategy
When an unauthenticated request originates from the external candidate portal for candidate lookup (`/api/populate/read/candidates?filter={"applicationId":"..."}`) or pre-joining confirmation:

1. **Policy Bypass & Context Synthesis (Implemented)**:
   - Requests targeting `candidates` or `job_openings` from `x-source: external` without an active employee JWT token bypass strict employee auth checks.
   - `populateHelper.js` synthesizes a guest context (`req.user = { id: 'guest-candidate', role: 'guest', isGuest: true }`).
   - `policyEngine.js` defines virtual permissions for `guest` / `GuestCandidate` on `candidates` (read/update) and `job_openings` (read).

2. **Scoped Application Querying**:
   - To prevent bulk candidate data harvesting, guest queries are scoped specifically by `applicationId` filter in request parameters.

3. **Formal `GuestCandidate` Role Specification (Roadmap)**:
   - A dedicated `GuestCandidate` entry in `roles` DB collection configured with minimal scopes:
     - `candidates:read` (scoped to `applicationId`)
     - `candidates:update` (permitted fields: pre-joining form, identity numbers, document URLs)
     - `job_openings:read` (public job openings)

---
*Created as part of Tracker HRMS Enterprise Integration Specifications.*
