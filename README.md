# Fixed Protection System Dashboard

A comprehensive, full-stack web application designed for managing and tracking Fire Protection System testing across multiple industrial plants and facilities.

## 🚀 Features

- **Dynamic Dashboard**: Real-time analytics and KPIs for testing status, completion rates, and system health.
- **Hierarchical Organization**: Organize systems by Plant Units, System Categories (e.g., Foam Systems, Sprinklers), and Sub-systems.
- **Master Testing Schedule**: Manage yearly testing cycles with automated pending/overdue status tracking.
- **Equipment Management**: Track specific tags and units within subsystems.
- **Issue Tracking**: Dedicated workflows for handling equipment issues and unsatisfactory test results.
- **Isolation Reporting**: Manage and report on system isolations for maintenance.
- **Reporting & Export**:
  - Generate plant-wise testing reports.
  - Export comprehensive PDF summaries.
  - Data visualization using Recharts.
- **Lifecycle Management**: 
  - "New Cycle" feature to rollover data to a new Financial Year (FY) while maintaining structure.
  - Recycle Bin for safe deletion and recovery of system components.
- **Security**: Role-based access control with authorization modals for sensitive operations (deletion, configuration).

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database & Auth**: Firebase / Firestore
- **Animations**: Motion (formerly Framer Motion)
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **Data Vis**: Recharts

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd fixed-protection-system-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your Firebase configuration keys.
   ```bash
   cp .env.example .env
   ```
   Note: If you are deploying this manually outside of AI Studio, ensure you populate the `VITE_FIREBASE_*` variables in your `.env` file.

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📄 License

This project is private and intended for internal use. Check `metadata.json` for further application details.
