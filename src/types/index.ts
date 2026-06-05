export type SystemCategoryType = 'Fixed System' | 'Foam System' | 'Sprinkler System' | 'Other Testing' | 'Unsatisfactory Systems';

export type MaintenanceCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'First Semiannual' | 'Second Semiannual' | 'Annual' | 'Bi-Annual';

export type ScheduleMonth = 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

export type TestingStatus = 'Completed' | 'Pending' | 'Overdue' | 'Under Maintenance' | 'Due Soon' | 'Pending Review' | 'Approved & Locked' | 'Unsatisfactory';

export type Frequency = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Bi-Annual';

export interface MasterPlant {
  id: string;
  plantName: string;
  tagNumber?: string;
  location?: string;
  specifications?: string;
  status: 'Active' | 'Defective';
}

export interface PlantEquipment {
  id?: string;
  plantId: string;
  subSystemId: string;
  categoryId?: string;
  financialYear?: FinancialYear;
  frequency: Frequency;
  tagNumber: string;
  lastTestDate?: string;
  nextDueDate?: string;
}

export type HealthCondition = 'Satisfactory' | 'Unsatisfactory';

export type FinancialYear = '2024-25' | '2025-26' | '2026-27' | '2027-28' | '2028-29' | '2029-30';

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Technician' | 'Viewer';
  lastLogin?: string;
}

export interface Plant {
  id: string;
  subSystemId?: string; 
  code: string;
  name: string;
  unitType?: 'Main Process' | 'Storage/Tank Farm' | 'Offsites/Utility' | 'Admin/General';
  financialYear?: FinancialYear;
  masterPlantId?: string;
}

export interface SystemCategory {
  id: string;
  name: string;
  icon?: string;
  financialYear?: FinancialYear;
  totalPlants?: number;
  totalRecords?: number;
}

export interface SubSystem {
  id: string;
  categoryId: string;
  name: string;
  financialYear?: FinancialYear;
  totalPlants?: number;
  totalRecords?: number;
}

export interface ChecklistItem {
  id: string;
  name: string;
}

export interface TestCycle {
  id: string;
  year: string;
  type: 'FIRST' | 'SECOND';
  scheduledMonth: string;
  previousCycleId?: string;
}

export interface TestChecklistStatus {
  checklistId: string;
  status: boolean;
}

export interface TestRecord {
  id: string;
  plantId: string;
  plantName: string;
  subSystemId: string;
  subSystemName: string;
  categoryId: string;
  categoryName: string;
  cycleId?: string;
  cycle: MaintenanceCycle;
  scheduleMonth: ScheduleMonth;
  testDate: string;
  dateOfTesting: string;
  deficiency: string;
  remarks: string;
  testerName: string;
  testedBy?: string;
  checklist: TestChecklistStatus[];
  status: TestingStatus;
  healthCondition: HealthCondition;
  financialYear: FinancialYear;
  createdAt: string;
  updatedAt: string;
  attachmentUrl?: string;
  plantPersonnel?: string;
  actionTaken?: string;
  unitType?: string;
  year?: string;
  // Legacy fields
  tagNumber?: string;
  location?: string;
  cycleName?: string;
  folder?: string;
  systemType?: string;
  testingPeriod?: string;
  overallSummaryText?: string;
  deficienciesText?: string;
  complianceText?: string;
  detailedChecklist?: Record<string, { hasDefect: boolean; remarks: string }>;
}

export interface HistoricalReport {
  id: string;
  financialYear: FinancialYear;
  period: MaintenanceCycle | 'Full Year';
  plantId: string;
  plantName: string;
  categoryId?: string;
  categoryName?: string;
  recordCount: number;
  satisfactoryCount: number;
  unsatisfactoryCount: number;
  data: TestRecord[];
  createdAt: string;
}

export interface EquipmentMaster {
  id: string; // Unique ID/Serial
  name: string; // Equipment Name
  type: string; // e.g., Hydrant, Extinguisher, Pump
  plantId?: string; // mapped Plant/Sub-System
  status: 'Available' | 'Has Active Issue' | 'In Use';
  financialYear: FinancialYear;
  createdAt: string;
}

export interface EquipmentIssue {
  id: string;
  plantId: string;
  plantName: string;
  dateOfIssue: string;
  equipmentId?: string;
  equipmentName: string;
  plantPerson: string;

  fireOfficerId: string;
  fireOfficerName: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Resolved';
  resolutionDate?: string;
  financialYear: FinancialYear;
  createdAt: string;
  updatedAt: string;
}

export interface ValveInfo {
  id: string;
  tagName: string;
  status: 'Good' | 'Passing' | 'Seized';
  closed: boolean;
  opened: boolean;
}

export interface IsolationReport {
  id: string;
  plantId: string;
  plantName: string;
  plannedUnplanned: 'Planned' | 'Unplanned';
  dateOfIsolation: string;
  timeOfIsolation?: string;
  dateOfIsolationComplete?: string;
  timeOfIsolationComplete?: string;
  fireWaterIsolationType: 'Partial' | 'Total';
  affectedPlant: string;
  affectedArea: string;
  detailsOfJob: string;
  valveToBeIsolated?: string; // Legacy
  valves?: ValveInfo[];
  safetyNote?: string;
  linePosition?: 'Underground' | 'Above Ground';
  approvalFormatUrl?: string; // File URL
  checklistUrl?: string;      // File URL
  financialYear: FinancialYear;
  status: 'Active' | 'Closed';
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  adminId: string;
  adminPassword?: string;
}

export interface RecycledItem {
  id: string;
  type: 'category' | 'subsystem' | 'plant' | 'testrecord';
  data: any;
  deletedAt: string;
}
