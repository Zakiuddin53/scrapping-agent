# AI Payment Posting Assistant (Prototype)

## Product Requirements Document (PRD)

---

# Version

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| Product    | AI Payment Posting Assistant          |
| Version    | 1.0                                   |
| Phase      | Phase 1 (Prototype)                   |
| Author     | Zaki Uddin                            |
| Tech Stack | Next.js, NestJS, AI (LLM), PDF Parser |
| Status     | Draft                                 |

---

# 1. Introduction

## Overview

The AI Payment Posting Assistant is a prototype application designed to demonstrate how Artificial Intelligence can automate insurance payment posting for healthcare clinics.

Currently, medical assistants manually read insurance payment remittance PDFs (EOB/ERA documents) and enter the payment information into the clinic's Electronic Health Record (EHR) system.

This manual workflow is repetitive, time-consuming, and susceptible to human error.

The goal of this prototype is to demonstrate that AI can extract structured payment information from insurance payment PDFs and automatically populate a payment posting form, significantly reducing manual data entry.

This prototype intentionally does **not** integrate with an actual EHR. Instead, it simulates the workflow using a web application that mirrors a payment posting screen.

---

# 2. Problem Statement

## Current Workflow

After processing a patient's claim, the insurance company sends a payment remittance document (typically an Explanation of Benefits (EOB) or ERA PDF).

The clinic staff must:

1. Open the insurance payment PDF.
2. Read patient information.
3. Identify claim details.
4. Read every CPT code.
5. Read payment amounts.
6. Read adjustment amounts.
7. Open the patient's payment posting screen inside the EHR.
8. Manually type every value into the corresponding fields.
9. Save the payment.

This process is repeated for every insurance payment received.

---

## Challenges

- High manual effort
- Slow payment posting
- Human typing errors
- Repetitive administrative work
- Reduced staff productivity

---

# 3. Vision

Create an AI-powered workflow where the user simply uploads an insurance payment PDF and the application automatically extracts all relevant payment information and populates the payment posting form.

Instead of spending several minutes manually entering payment information, the user reviews AI-generated values and confirms them before saving.

---

# 4. Goals

The prototype should demonstrate the following capabilities:

- Upload an insurance payment PDF.
- Extract structured payment information using AI.
- Display extracted information.
- Automatically populate a payment posting form.
- Allow the user to edit extracted values.
- Simulate saving the payment.

---

# 5. Out of Scope

The following features are intentionally excluded from Phase 1:

- User authentication
- User management
- Database persistence
- Browser extension
- Real EHR integration
- Insurance API integration
- OCR optimization
- Batch document processing
- Multi-user support
- Audit logs
- Payment reconciliation

---

# 6. User Persona

## Primary User

### Medical Assistant / Billing Staff

Responsibilities:

- Receive insurance payment documents
- Review payment details
- Post payments into EHR
- Verify payment accuracy

Pain Points:

- Large amount of manual typing
- Tedious repetitive work
- Typing mistakes
- Time-consuming workflow

---

# 7. User Journey

```text
Open Application
        │
        ▼
Upload Insurance Payment PDF
        │
        ▼
Application uploads document
        │
        ▼
AI extracts payment information
        │
        ▼
Structured JSON generated
        │
        ▼
Payment Posting Form auto-filled
        │
        ▼
User reviews extracted data
        │
        ▼
User edits if necessary
        │
        ▼
Click Save
        │
        ▼
Success Message
```

---

# 8. Functional Requirements

## FR-1 Upload Insurance PDF

### Description

The user should be able to upload an insurance payment PDF.

### Requirements

- Accept PDF files only
- Maximum size: 10 MB
- Drag and Drop support
- Browse File support

### States

- Uploading
- Processing
- Success
- Error

---

## FR-2 AI Document Processing

After upload, the backend processes the PDF.

The system should extract:

### Patient Information

- Patient Name
- Patient ID
- Date of Service

### Claim Information

- Claim Number
- Insurance Company
- Payment Date

### Payment Items

For each procedure:

- CPT Code
- Procedure Description
- Charged Amount
- Allowed Amount
- Paid Amount
- Adjustment Amount
- Patient Responsibility

### Summary

- Total Charged
- Total Allowed
- Total Paid
- Total Adjustment

The backend returns structured JSON.

---

## FR-3 Auto Populate Form

The frontend should automatically populate all extracted values into the payment posting form.

Every field must remain editable.

## FR-4 Save

Clicking Save should simulate successful payment posting.
No database is required.
Display:

```
Payment successfully posted.
```

---

# 9. Non-Functional Requirements

| Requirement      | Value                  |
| ---------------- | ---------------------- |
| Response Time    | <10 seconds            |
| Supported Format | PDF                    |
| Browser          | Chrome                 |
| Responsive       | Desktop First          |
| Accessibility    | Basic keyboard support |
| Error Handling   | Friendly messages      |

---

# 10. Screen Flow

## Screen 1 — Upload

AI Payment Posting Assistant
Upload Insurance Payment PDF

[ Drag PDF Here ]

or

[ Browse File ]

## Screen 2 — Processing

Uploading document...
Extracting text...
Understanding payment information...
Building structured data...
Please wait...

## Screen 3 — Payment Posting Form

Sections:

- Patient Information
- Claim Information
- Payment Items
- Payment Summary

Save Button

---

# 11. Form Fields

## Patient Information

| Field           |
| --------------- |
| Patient Name    |
| Patient ID      |
| Date of Service |

---

## Claim Information

| Field             |
| ----------------- |
| Claim Number      |
| Insurance Company |
| Payment Date      |

---

## Payment Items

| Field                  |
| ---------------------- |
| CPT Code               |
| Description            |
| Charged Amount         |
| Allowed Amount         |
| Paid Amount            |
| Adjustment             |
| Patient Responsibility |

Support multiple rows.

---

## Payment Summary

| Field            |
| ---------------- |
| Total Charged    |
| Total Allowed    |
| Total Paid       |
| Total Adjustment |

---

# 12. API Specification

## Upload PDF

### Endpoint

```
POST /payments/extract
```

---

### Request

```
multipart/form-data

pdf: File
```

---

### Success Response

```json
{
  "success": true,
  "data": {
    "...": "..."
  }
}
```

---

### Error Response

```json
{
  "success": false,
  "message": "Unable to process PDF."
}
```

---

# 13. Example JSON Response

```json
{
  "patient": {
    "name": "John Smith",
    "patientId": "P10245",
    "dateOfService": "2026-06-15"
  },
  "claim": {
    "claimNumber": "CLM-984552",
    "insurance": "Blue Cross",
    "paymentDate": "2026-06-28"
  },
  "paymentItems": [
    {
      "cpt": "99213",
      "description": "Office Visit",
      "charged": 120,
      "allowed": 95,
      "paid": 80,
      "adjustment": 15,
      "patientResponsibility": 15
    },
    {
      "cpt": "92014",
      "description": "Eye Examination",
      "charged": 85,
      "allowed": 70,
      "paid": 60,
      "adjustment": 10,
      "patientResponsibility": 10
    }
  ],
  "summary": {
    "totalCharged": 205,
    "totalAllowed": 165,
    "totalPaid": 140,
    "totalAdjustment": 25
  }
}
```

---

# 14. AI Processing Workflow

```
PDF Upload
      │
      ▼
Extract PDF Text
      │
      ▼
Send Text to LLM
      │
      ▼
LLM Extracts Structured Data
      │
      ▼
Validate JSON
      │
      ▼
Return Structured Response
      │
      ▼
Populate Form

# 16. Suggested Technology Stack

## Frontend

- Next.js (App Router)
- TypeScript
- Mantine UI
- TanStack Query
- Axios
- Mantine Form

---

## Backend

- NestJS
- Multer
- PDF Parsing Library
- OpenAI GPT-5 / Gemini
- Zod Validation

---

# 17. Error Handling

## Invalid File

Only PDF files are supported.

## Large File

Maximum upload size is 10 MB.

---

## AI Failure

```

Unable to extract payment information.
Please try another document.

```

---

## Missing Data

Fields without extracted values should remain empty and editable.

---

# 18. Success Criteria

The prototype is successful if it can:

- Upload a payment PDF.
- Extract payment information using AI.
- Return structured JSON.
- Populate every form field automatically.
- Allow manual corrections.
- Simulate successful payment posting.
- Complete the workflow within 10 seconds.

# 20. Expected Outcome

The prototype should clearly demonstrate that AI can replace manual insurance payment data entry.

Users should experience the following workflow:

1. Upload a payment PDF.
2. Wait a few seconds for AI processing.
3. Review automatically extracted payment information.
4. Make corrections if needed.
5. Click Save.

This prototype serves as the foundation for a future browser extension that will populate real EHR payment posting forms directly within the clinic's web-based EHR system.
```
