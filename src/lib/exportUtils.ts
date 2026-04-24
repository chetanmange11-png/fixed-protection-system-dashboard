import * as XLSX from 'xlsx';
import { dbApi } from '../db/storage';
import { FinancialYear } from '../types';

export const exportAllYearlyData = async (year: FinancialYear) => {
  await dbApi.init();
  const [categories, subsystems, plants, allRecords, allIsolations, allIssues] = await Promise.all([
    dbApi.getCategories(),
    dbApi.getSubSystems(),
    dbApi.getPlants(),
    dbApi.getTestRecords(),
    dbApi.getIsolationReports(),
    dbApi.getEquipmentIssues()
  ]);

  const records = allRecords.filter(r => r.financialYear === year);
  const isolationReports = allIsolations.filter(r => r.financialYear === year);
  const equipmentIssues = allIssues.filter(r => r.financialYear === year);

  const wb = XLSX.utils.book_new();

  // 1. Master Testing Schedule Sheet (Hierarchical)
  const masterData = records.map(r => ({
    'Financial Year': r.financialYear,
    'Category (Main Folder)': r.categoryName,
    'Sub-System (Sub Folder)': r.subSystemName,
    'Plant Name': r.plantName,
    'Tag Number': r.tagNumber,
    'Location': r.location,
    'Maintenance Cycle': r.cycle,
    'Scheduled Month': r.scheduleMonth,
    'Date of Testing': r.dateOfTesting,
    'Status': r.status,
    'Health Condition': r.healthCondition,
    'Tested By': r.testedBy,
    'Deficiency': r.deficiency,
    'Action Taken': r.actionTaken
  }));
  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  XLSX.utils.book_append_sheet(wb, wsMaster, "Testing Schedule Audit");

  // 2. Isolation Reports Sheet
  const isolationData = isolationReports.map(r => ({
    'Date': r.dateOfIsolation,
    'Plant Name': r.plantName,
    'Type': r.plannedUnplanned,
    'Isolation Depth': r.fireWaterIsolationType,
    'Affected Plant': r.affectedPlant,
    'Affected Area': r.affectedArea,
    'Job Details': r.detailsOfJob,
    'Status': r.status,
    'Created At': r.createdAt
  }));
  const wsIsolation = XLSX.utils.json_to_sheet(isolationData);
  XLSX.utils.book_append_sheet(wb, wsIsolation, "Isolation Logs");

  // 3. Equipment Issues Sheet
  const issuesData = equipmentIssues.map(i => ({
    'Date of Issue': i.dateOfIssue,
    'Plant': i.plantName,
    'Equipment': i.equipmentName,
    'Plant Person': i.plantPerson,
    'Assigned Officer': i.fireOfficerName,
    'Priority': i.priority,
    'Status': i.status,
    'Resolution Date': i.resolutionDate || 'Pending'
  }));
  const wsIssues = XLSX.utils.json_to_sheet(issuesData);
  XLSX.utils.book_append_sheet(wb, wsIssues, "Equipment Faults");

  // 4. Folder Structure Reference
  const structureData = subsystems.map(s => {
    const parent = categories.find(c => c.id === s.categoryId);
    return {
      'System Category': parent?.name || 'Unknown',
      'Sub-System': s.name,
      'Associated Plants': plants.filter(p => p.subSystemId === s.id).map(p => p.name).join(', ')
    };
  });
  const wsStructure = XLSX.utils.json_to_sheet(structureData);
  XLSX.utils.book_append_sheet(wb, wsStructure, "Folder Inventory");

  // Save the file
  XLSX.writeFile(wb, `FPS_MASTER_AUDIT_${year}.xlsx`);
};
