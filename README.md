# Class Certificate Automation Manager (Certifyx)

Production-grade web application built with React, TypeScript, Vite, Tailwind CSS, Google Drive API, Google Sheets API, Firebase Authentication, and Supabase.

## 🚀 Overview & Features

- **67-Student Fixed Roster Management**: Automatic roll-number normalization and validation for class roster tracking.
- **Automated 3-Status Engine**:
  - **Drive Uploaded** (Automatic): Validates certificate presence in Google Drive folders.
  - **Spreadsheet Updated** (Automatic): Matches student records in Google Sheets.
  - **Submitted** (Manual): Administrator checkbox tracking.
  - **Overall Compliance**: Computes `COMPLETED`, `PENDING`, or `NOT STARTED`.
- **Classroom Matrix Seating Map**: Spatial 67-seat interactive seating chart with hover Mini-HUD cards.
- **Manual Review Queue**: Resolves unidentified, ambiguous, duplicate, and outside-class certificate files.
- **Data Health Scanner & Proof Inspector**: Deep discrepancy detection and row-level evidence inspector.
- **Secure Authentication & RBAC**: Firebase Google OAuth 2.0 with administrator allowlist and strict Supabase Row Level Security (RLS).

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, Recharts.
- **Authentication**: Firebase Authentication (Google OAuth 2.0).
- **Database & Sync**: Supabase PostgreSQL with strict RLS policies, Realtime subscriptions, and `localStorage` persistence.
- **Google Integration**: Client-side Google Drive & Google Sheets v4 REST APIs via OAuth access tokens.

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/certifyx.git
   cd certifyx
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

6. **Run Unit Tests & Type Check**:
   ```bash
   npm run test
   npm run lint
   ```

## 🔒 Security & Row Level Security (RLS)

All database operations in Supabase require authenticated caller tokens. Policies check `auth.jwt() ->> 'email'` against `public.admins`. Anonymous access is strictly denied. See `SETUP_GUIDE.md` for SQL configuration.

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
