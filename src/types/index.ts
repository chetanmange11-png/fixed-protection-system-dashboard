export type SystemCategoryType = 'Fixed System' | 'Foam System' | 'Sprinkler System' | 'Other Testing' | 'Unsatisfactory Systems';

export type MaintenanceCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'First Semiannual' | 'Second Semiannual' | 'Annual' | 'Bi-Annual';

export type ScheduleMonth = 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

export type TestingStatus = 'Completed' | 'Pending' | 'Overdue' | 'Under Maintenance' | 'Due Soon';

export type Frequency = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Bi-Annual';

export interface PlantEquipment {
  id: string;
  plantId: string;
  subSystemId: string;
  frequency: Frequency;
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
}

export interface SystemCategory {
  id: string;
  name: string;
  icon?: string;
  financialYear?: FinancialYear;
}

export interface SubSystem {
  id: string;
  categoryId: string;
  name: string;
  financialYear?: FinancialYear;
}

export interface TestRecord {
  id: string;
  plantId: string;
  plantName: string;
  unitType?: string;
  categoryId: string;
  categoryName: string;
  subSystemId: string;
  subSystemName: string;
  tagNumber: string;
  location: string;
  cycle: MaintenanceCycle;
  scheduleMonth?: ScheduleMonth;
  dateOfTesting: string;
  status: TestingStatus;
  deficiency: string;
  actionTaken: string;
  responsibility: string;
  compliance: string;
  testedBy: string;
  plantPersonnel?: string;
  healthCondition: HealthCondition;
  attachmentUrl?: string;
  assignee?: string;
  targetFixDate?: string;
  financialYear: FinancialYear;
  updatedAt: string;
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

export interface EquipmentIssue {
  id: string;
  plantId: string;
  plantName: string;
  dateOfIssue: string;
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

export interface IsolationReport {
  id: string;
  plantId: string;
  plantName: string;
  plannedUnplanned: 'Planned' | 'Unplanned';
  dateOfIsolation: string;
  fireWaterIsolationType: 'Partial' | 'Total';
  affectedPlant: string;
  affectedArea: string;
  detailsOfJob: string;
  approvalFormatUrl?: string; // File URL
  checklistUrl?: string;      // File URL
  financialYear: FinancialYear;
  status: 'Active' | 'Closed';
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
