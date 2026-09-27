# Class Certificate Automation Manager - Setup & Deployment Guide

This document covers complete deployment, Google Cloud project setup, Google Workspace API configuration, Supabase integration, security configuration, testing procedures, and troubleshooting.

---

## 1. Overview & Architecture

The **Class Certificate Automation Manager** tracks certificate status for a fixed 67-person class roster against:
1. **Google Drive** (primary source for certificate PDFs and images)
2. **Google Sheets** (primary source for student registration/submission spreadsheet)
3. **Database** (Supabase or client persistent storage for administrative preferences, manual submitted status, audit logs, and sync history)

### 3-Status Engine Logic
- **Drive Uploaded** (Automatic): `TRUE` if at least 1 valid certificate is detected in the selected Google Drive folder for that student's normalized roll number.
- **Spreadsheet Updated** (Automatic): `TRUE` if the student's normalized roll number exists in the selected Google Sheet.
- **Submitted** (Manual): Checkbox controlled solely by the administrator. `Submitted` status is **NEVER** overridden or wiped by sync operations.
- **Overall Status**:
  - `COMPLETED`: Drive Uploaded = TRUE AND Spreadsheet Updated = TRUE AND Submitted = TRUE
  - `NOT STARTED`: All three are FALSE
  - `PENDING`: Any other combination

---

## 2. Google Cloud Project Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one (e.g. `gen-lang-client-0060354020`).
3. Navigate to **APIs & Services > Library** and enable the following APIs:
   - **Google Drive API** (`drive.googleapis.com`)
   - **Google Sheets API** (`sheets.googleapis.com`)
4. Configure the **OAuth Consent Screen**:
   - User Type: **Internal** (if in Google Workspace domain) or **External**
   - App Name: `Class Certificate Automation Manager`
   - User Support Email: your email (e.g., `jayaramsappa09@gmail.com`)
   - Authorized Domains: add your hosting domain (or `firebaseapp.com`)
   - Developer Contact Information: your email
5. Configure Scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
6. Create Credentials:
   - Go to **Credentials > Create Credentials > OAuth client ID**
   - Application Type: **Web application**
   - Add Authorized JavaScript Origins:
     - `http://localhost:3000` (for local development)
     - `https://your-production-app.run.app` (or Vercel domain)
   - Add Authorized Redirect URIs:
     - Firebase Auth handler: `https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`

---

## 3. Firebase Authentication Setup

The application uses Firebase Auth with Google provider for secure, client-side OAuth token acquisition (no client secrets exposed in frontend):
1. In the [Firebase Console](https://console.firebase.google.com/), select your Google Cloud project.
2. Go to **Build > Authentication > Sign-in method**.
3. Enable **Google** as a sign-in provider.
4. Set the authorized domains (e.g., `localhost`, your Cloud Run or Vercel URL).
5. Ensure `firebase-applet-config.json` is present at the root of the project with:
   ```json
   {
     "projectId": "YOUR_PROJECT_ID",
     "appId": "YOUR_APP_ID",
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
     "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
     "messagingSenderId": "YOUR_SENDER_ID"
   }
   ```

---

### 4. Supabase Setup & Row Level Security (RLS)

If you are using Supabase for cloud persistence:
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire contents of `/supabase_schema.sql`.
4. Seed the `admins` table with your authorized administrator emails:
   ```sql
   INSERT INTO public.admins (email, role)
   VALUES ('admin@example.com', 'super_admin')
   ON CONFLICT (email) DO NOTHING;
   ```
5. **Strict Row Level Security (RLS)**:
   - RLS is enforced on `class_roster`, `student_statuses`, `sync_history`, `audit_logs`, and `admins`.
   - Access is restricted exclusively to authenticated callers (`TO authenticated`) whose JWT email claim (`auth.jwt() ->> 'email'`) matches an entry in `public.admins`.
   - Public and anonymous access (`anon`) is denied by default.

### 🌉 Firebase Auth & Supabase Auth JWT Bridge
- **Direct Supabase OAuth**: When logging in via `signInWithOAuth({ provider: 'google' })`, Supabase automatically signs the user's JWT containing `auth.jwt() ->> 'email'`.
- **Firebase Auth Token Bridge**: If using client-side Firebase Google Auth, pass the user's verified Firebase ID Token to Supabase via `supabase.auth.setSession({ access_token, refresh_token })` or configure Supabase Custom JWT / Third-Party Auth in the Supabase Dashboard to validate Firebase JWT tokens.

---

## 5. Environment Variables Template (`.env.example`)

```env
# Optional Supabase URL and Anon Key (if connecting cloud database)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Production App URL
APP_URL=https://your-app-domain.com
```

---

## 6. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run dev server on port 3000
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 7. Vercel / Cloud Run Deployment Instructions

### Vercel Deployment:
1. Push repository to GitHub or GitLab.
2. Import project into Vercel.
3. Set Framework Preset to **Vite**.
4. Set Build Command: `npm run build` and Output Directory: `dist`.
5. Add any environment variables (`VITE_SUPABASE_URL`, etc.).
6. Copy your deployed domain (e.g., `https://class-cert-manager.vercel.app`) and add it to:
   - Google Cloud Console: **Authorized JavaScript Origins**
   - Firebase Console: **Authentication > Settings > Authorized Domains**

---

## 8. Verification & Test Cases

The application includes automated and interactive checks for all required test scenarios:

1. **TEST 1 (Search by Roll Number)**:
   - Search `25A31A05EN` -> Displays `PEMMANABOIDI KEERTHANA`.
2. **TEST 2 (Drive Filename Matching)**:
   - File `25A31A05EN_Hackathon.pdf` -> Matches `25A31A05EN`, detects type `Hackathon`, sets `Drive Uploaded = TRUE`.
3. **TEST 3 (Outside Class Filtering)**:
   - File `24A31A05JR_Course.pdf` -> Categorized under `Outside Class`, **never** creates or adds a student.
4. **TEST 4 (Case-Insensitive Normalization)**:
   - File `25a31a05ey_Hackathon.pdf` -> Correctly matches `25A31A05EY` (`CHALLA BARGAVA SATYA SAI RAKESH`).
5. **TEST 5 (Spreadsheet Match)**:
   - Sheet contains row with `25A31A05EN` -> Sets `Spreadsheet Updated = TRUE`.
6. **TEST 6 (Spreadsheet Non-Match)**:
   - Sheet does not contain `25A31A05DV` -> Sets `Spreadsheet Updated = FALSE`.
7. **TEST 7 (Submitted Persistence)**:
   - Mark `Submitted = TRUE` on any student -> Click **Sync Now** -> Status remains `TRUE`.
8. **TEST 8 (Overall Status Logic)**:
   - When Drive = TRUE, Sheet = TRUE, Submitted = TRUE -> Status badge becomes `COMPLETED`.
9. **TEST 9 & 10 (Admin Security & Allowlist)**:
   - Unauthorized Google account attempting to view records receives `ACCESS DENIED`.
10. **TEST 11 (Export Verification)**:
    - Export CSV generates exactly 67 rows corresponding strictly to the fixed class roster.

---

## 9. Troubleshooting Guide

| Issue | Cause | Resolution |
|-------|-------|------------|
| **Error 400: redirect_uri_mismatch** | Firebase auth handler not allowlisted in Google Cloud Console. | In Google Cloud Credentials, add `https://<PROJECT_ID>.firebaseapp.com/__/auth/handler` to Authorized redirect URIs. |
| **Error 403: Insufficient Permission / Quota Exceeded** | Drive or Sheets API is not enabled in Google Cloud. | Visit Google Cloud Console > APIs & Services > Library, search for Google Drive API and Google Sheets API, and click Enable. |
| **No files found in folder** | The selected folder is empty or contains subfolders only. | Ensure certificates are directly inside the selected folder or use a supported file type (PDF, JPG, PNG, WebP). |
| **Access Denied Screen** | Logged-in Google account is not on the admin allowlist. | Add the user's email to `DEFAULT_ADMIN_EMAILS` or the `admins` table. |
| **Spreadsheet column mapping needs review** | Sheet headers differ from standard names (`Roll No`, `Certificate Type`). | Use the in-app **Map Columns** button in Google Integration settings to select header names. |
