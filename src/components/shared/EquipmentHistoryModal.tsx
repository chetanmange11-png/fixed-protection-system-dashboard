import * as React from "react";
import { dbApi } from "../../db/storage";
import {
  TestRecord,
  MaintenanceCycle,
  TestingStatus,
  HealthCondition,
  Plant,
  SystemCategory,
  SubSystem,
  PlantEquipment,
  ChecklistItem,
  Frequency,
  ScheduleMonth,
} from "../../types";
import { logAuditAction } from "../../lib/auditService";
import {
  doc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { useGlobalStore } from "../../store/useGlobalStore";
import {
  FileText,
  Camera,
  X,
  History,
  Edit3,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface EquipmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TestRecord | null;
  onSave: () => void;
  isNew?: boolean;
  defaultFrequency?: Frequency;
  userRole?: "Technician" | "Admin";
}

const getNextCycleInfo = (
  currentCycle: string,
): { nextCycle: MaintenanceCycle | string; nextMonths: number } => {
  const normalized = String(currentCycle || "").toLowerCase();
  if (normalized === "q1") return { nextCycle: "Q2", nextMonths: 3 };
  if (normalized === "q2") return { nextCycle: "Q3", nextMonths: 3 };
  if (normalized === "q3") return { nextCycle: "Q4", nextMonths: 3 };
  if (normalized === "q4") return { nextCycle: "Q1", nextMonths: 3 };
  if (normalized === "first semiannual")
    return { nextCycle: "Second Semiannual", nextMonths: 6 };
  if (normalized === "second semiannual")
    return { nextCycle: "First Semiannual", nextMonths: 6 };
  if (normalized === "annual") return { nextCycle: "Annual", nextMonths: 12 };
  if (normalized.includes("biannual") || normalized.includes("bi-annual"))
    return { nextCycle: "Biannual", nextMonths: 24 };

  return { nextCycle: currentCycle as MaintenanceCycle, nextMonths: 6 };
};

const PROTOCOL_ITEMS = [
  { id: "algae", name: "Algae" },
  { id: "downstreamDrainValve", name: "Downstream Drain Valve" },
  { id: "dripValve", name: "Drip Valve" },
  { id: "gongBell", name: "Gong Bell" },
  { id: "mcb", name: "MCB" },
  { id: "painting", name: "Painting" },
  {
    id: "pressureGaugePrimingLineDownstream",
    name: "Pressure Gauge Priming Line - Downstream",
  },
  {
    id: "pressureGaugePrimingLineIntermediate",
    name: "Pressure Gauge Priming Line - Intermediate",
  },
  {
    id: "pressureGaugePrimingLineUpstream",
    name: "Pressure Gauge Priming Line - Upstream",
  },
  { id: "pshNotGen", name: "PSH Not Gen" },
  { id: "pslNotGen", name: "PSL Not Gen" },
  { id: "rousing", name: "Rousing" },
  { id: "sovNotOperated", name: "SOV Not Operated" },
  { id: "strainerCleaning", name: "Strainer Cleaning" },
  { id: "upstreamDrainValve", name: "Upstream Drain Valve" },
];

const generatePDFReport = (record: TestRecord) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(192, 149, 50);
  doc.rect(0, 0, pageWidth, 5, 'F');
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RELIANCE INDUSTRIES LIMITED - FIRE DEPARTMENT", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${record.plantName || "N/A"} UNIT - ${record.folder || record.subSystemName || "N/A"}`,
    pageWidth / 2,
    25,
    { align: "center" },
  );
  doc.text(
    `SYSTEM TYPE: Fixed System | PERIOD: ${record.cycle || "N/A"}`,
    pageWidth / 2,
    31,
    { align: "center" },
  );

  // Section I: BASIC SYSTEM INFORMATION
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("I. BASIC SYSTEM INFORMATION", 14, 40);

  autoTable(doc, {
    startY: 43,
    head: [["Field", "Details", "Field", "Details"]],
    body: [
      [
        "Plant Name",
        record.plantName || "N/A",
        "Folder (Sub-System)",
        record.folder || record.subSystemName || "N/A",
      ],
      [
        "Tag Number",
        record.tagNumber || "N/A",
        "Location",
        record.location || "N/A",
      ],
      [
        "System Type",
        "Fixed System",
        "Testing Cycle",
        record.cycle || record.cycleName || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [192, 149, 50],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Section II: AUDIT & EXECUTION DETAILS
  doc.setFont("helvetica", "bold");
  doc.text(
    "II. AUDIT & EXECUTION DETAILS",
    14,
    (doc as any).lastAutoTable.finalY + 10,
  );

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 13,
    head: [["Field", "Details", "Field", "Details"]],
    body: [
      [
        "Execution Date",
        new Date().toISOString().split("T")[0],
        "Test Date",
        record.testDate || record.dateOfTesting || "N/A",
      ],
      [
        "Tester Name",
        record.testerName || record.testedBy || "N/A",
        "Plant Personnel",
        record.plantPersonnel || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Section III: ITEMIZED DEFECT PROTOCOL
  doc.setFont("helvetica", "bold");
  doc.text(
    "III. ITEMIZED DEFECT PROTOCOL",
    14,
    (doc as any).lastAutoTable.finalY + 10,
  );

  const defectRows: any[] = [];
  if (record.detailedChecklist) {
    Object.entries(record.detailedChecklist).forEach(([id, data]) => {
      if (data.hasDefect) {
        const itemName = PROTOCOL_ITEMS.find((p) => p.id === id)?.name || id;
        defectRows.push([
          defectRows.length + 1,
          itemName,
          "Defect Observed",
        ]);
      }
    });
  }

  if (defectRows.length === 0) {
    defectRows.push([
      {
        content: "No defects observed.",
        colSpan: 3,
        styles: { halign: "center", fontStyle: "italic" },
      },
    ]);
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 13,
    head: [["#", "Defective Component", "Status"]],
    body: defectRows,
    theme: "grid",
    headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Section IV: QUALITATIVE FINDINGS & STATUS
  doc.setFont("helvetica", "bold");
  doc.text(
    "IV. QUALITATIVE FINDINGS & STATUS",
    14,
    (doc as any).lastAutoTable.finalY + 10,
  );

  const statusColor: [number, number, number] =
    record.status === "Completed" || record.status === "Approved & Locked"
      ? [16, 185, 129]
      : [239, 68, 68];

  const healthColor: [number, number, number] =
    record.healthCondition === "Satisfactory" ? [16, 185, 129] : [239, 68, 68];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 13,
    head: [["DOCUMENT STATUS", "SYSTEM HEALTH"]],
    body: [
      [
        {
          content: record.status || "N/A",
          styles: { textColor: statusColor, fontStyle: "bold" },
        },
        {
          content: record.healthCondition || "N/A",
          styles: { textColor: healthColor, fontStyle: "bold" },
        },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // OBSERVED DEFICIENCIES
  doc.setFillColor(254, 226, 226); // red-100
  doc.rect(14, finalY, pageWidth - 28, 6, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(153, 27, 27); // red-800
  doc.text("OBSERVED DEFICIENCIES", 16, finalY + 4);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const defLines = doc.splitTextToSize(
    record.deficienciesText || "No deficiencies recorded.",
    pageWidth - 32,
  );
  doc.text(defLines, 16, finalY + 10);

  finalY += 10 + defLines.length * 5 + 5;

  // TECHNICAL REMARKS & RECOMMENDATIONS
  doc.setFillColor(192, 149, 50); // Gold
  doc.rect(14, finalY, pageWidth - 28, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255); // White
  doc.text("TECHNICAL REMARKS & RECOMMENDATIONS", 16, finalY + 4);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const complianceLines = doc.splitTextToSize(
    record.complianceText || "No remarks provided.",
    pageWidth - 32,
  );
  doc.text(complianceLines, 16, finalY + 10);

  doc.save(
    `Testing_Report_${record.tagNumber}_${record.testDate || record.dateOfTesting}.pdf`,
  );
  toast.success("Official PDF Report Generated");
};

export function EquipmentHistoryModal({
  isOpen,
  onClose,
  record,
  onSave,
  isNew,
  defaultFrequency,
  userRole = "Technician",
}: EquipmentHistoryModalProps) {
  const { theme } = useGlobalStore();
  const [formData, setFormData] = React.useState<Partial<TestRecord>>({});
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  const [isTagLocked, setIsTagLocked] = React.useState(true);
  const [isLocationLocked, setIsLocationLocked] = React.useState(true);

  // History Tab State
  const [historyRecords, setHistoryRecords] = React.useState<TestRecord[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = React.useState<"basic" | "protocol">("basic");

  const [users, setUsers] = React.useState<{ id: string; name: string }[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  const [mappings, setMappings] = React.useState<PlantEquipment[]>([]);
  const [checklistMaster, setChecklistMaster] = React.useState<ChecklistItem[]>(
    [],
  );
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsTagLocked(true);
      setIsLocationLocked(true);
      const load = async () => {
        setIsLoadingHistory(true);
        await dbApi.init();
        const [
          allUsers,
          allPlants,
          allCats,
          allSubs,
          allMappings,
          allChecklist,
        ] = await Promise.all([
          dbApi.getUsers(),
          dbApi.getPlants(),
          dbApi.getCategories(),
          dbApi.getSubSystems(),
          dbApi.getPlantEquipment(),
          dbApi.getChecklistMaster(),
        ]);
        setUsers(allUsers);
        setPlants(allPlants);
        setCategories(allCats);
        setSubSystems(allSubs);
        setMappings(allMappings);
        setChecklistMaster(allChecklist);

        if (record) {
          if (!isNew) {
            try {
              const q = query(
                collection(db, "testRecords"),
                where("tagNumber", "==", record.tagNumber),
                where("plantId", "==", record.plantId),
              );
              const snap = await getDocs(q);
              const records = snap.docs.map((d) => d.data() as TestRecord);
              records.sort(
                (a, b) =>
                  new Date(b.testDate).getTime() -
                  new Date(a.testDate).getTime(),
              );

              setHistoryRecords(records);

              const targetRecord =
                records.find((r) => r.id === record.id) || records[0];
              if (targetRecord) {
                setActiveTabId(targetRecord.id);
                setFormData({
                  ...targetRecord,
                  plantName: targetRecord.plantName,
                  folder: targetRecord.folder || targetRecord.subSystemName,
                  location: targetRecord.location || "",
                  overallSummaryText:
                    targetRecord.overallSummaryText ||
                    targetRecord.remarks ||
                    "",
                  complianceText: targetRecord.complianceText || "",
                  detailedChecklist: targetRecord.detailedChecklist || {},
                });
                setImageFile(null);
                setImagePreview(targetRecord.attachmentUrl || null);
              }
            } catch (error) {
              toast.error("Failed to load equipment history");
            }
          } else {
            // New record with pre-filled context
            setHistoryRecords([]);
            setActiveTabId(null);
            
            const activeTesterName = useGlobalStore.getState().currentUser?.name || "";
            const baseData = {
              scheduleMonth: "January" as ScheduleMonth,
              cycle: "Q1" as MaintenanceCycle,
              status: "Pending" as TestingStatus,
              healthCondition: "Satisfactory" as HealthCondition,
              tagNumber: "",
              location: "",
              dateOfTesting: new Date().toISOString().split("T")[0],
              testDate: new Date().toISOString().split("T")[0],
              testedBy: activeTesterName,
              testerName: activeTesterName,
              plantPersonnel: "",
              deficiency: "",
              remarks: "",
              overallSummaryText: "",
              complianceText: "",
              detailedChecklist: {},
              attachmentUrl: "",
              checklist: [],
              ...record, // Override with passed context
            };

            // Check for Auto-save draft
            const draft = localStorage.getItem('ril_hmd_form_draft');
            if (draft) {
              try {
                const parsed = JSON.parse(draft);
                setFormData({ 
                  ...baseData, 
                  ...parsed,
                  plantId: record?.plantId || parsed.plantId || "",
                  plantName: record?.plantName || parsed.plantName || "",
                  subSystemId: record?.subSystemId || parsed.subSystemId || "",
                  subSystemName: record?.subSystemName || parsed.subSystemName || "",
                  folder: record?.folder || parsed.folder || "",
                  categoryId: record?.categoryId || parsed.categoryId || ""
                });
                toast.success("Resumed from auto-saved draft");
              } catch (e) {
                setFormData(baseData);
              }
            } else {
              setFormData(baseData);
            }

            setImageFile(null);
            setImagePreview(null);
          }
        } else if (isNew) {
          setHistoryRecords([]);
          setActiveTabId(null);
          const activeTesterName = useGlobalStore.getState().currentUser?.name || "";
          const baseData = {
            scheduleMonth: "January" as ScheduleMonth,
            cycle: "Q1" as MaintenanceCycle,
            status: "Pending" as TestingStatus,
            healthCondition: "Satisfactory" as HealthCondition,
            tagNumber: "",
            location: "",
            dateOfTesting: new Date().toISOString().split("T")[0],
            testDate: new Date().toISOString().split("T")[0],
            testedBy: activeTesterName,
            testerName: activeTesterName,
            plantPersonnel: "",
            deficiency: "",
            remarks: "",
            overallSummaryText: "",
            complianceText: "",
            detailedChecklist: {},
            attachmentUrl: "",
            checklist: [],
          };

          const draft = localStorage.getItem('ril_hmd_form_draft');
          if (draft) {
            try {
              const parsed = JSON.parse(draft);
              setFormData({ ...baseData, ...parsed });
              toast.success("Resumed from auto-saved draft");
            } catch (e) {
              setFormData(baseData);
            }
          } else {
            setFormData(baseData);
          }
          
          setImageFile(null);
          setImagePreview(null);
        }
        setIsLoadingHistory(false);
      };
      load();
    }
  }, [record, isNew, isOpen]);

  // Background Auto-Save (useEffect)
  React.useEffect(() => {
    if (isOpen && isNew && formData && Object.keys(formData).length > 5) {
      const safeStringify = (obj: any) => {
        try {
          const normalizeFormData = (o: any, seen = new WeakSet()): any => {
            if (o === null || typeof o !== 'object') return o;
            if (o instanceof Event) return undefined;
            if (seen.has(o)) return undefined;
            seen.add(o);
            if (Array.isArray(o)) return o.map(i => normalizeFormData(i, seen));
            const res: any = {};
            for (const k in o) res[k] = normalizeFormData(o[k], seen);
            return res;
          };
          return JSON.stringify(normalizeFormData(obj));
        } catch (err) {
          console.warn("Failed to safe-stringify object:", err);
          return null;
        }
      };
      
      const str = safeStringify(formData);
      if (str) {
        localStorage.setItem('ril_hmd_form_draft', str);
      }
    }
  }, [formData, isOpen, isNew]);

  const handleTabSwitch = (historyId: string) => {
    const historicalRecord = historyRecords.find((r) => r.id === historyId);
    if (historicalRecord) {
      setActiveTabId(historyId);
      setFormData({ ...historicalRecord });
      setImageFile(null);
      setImagePreview(historicalRecord.attachmentUrl || null);
    }
  };

  const handleChecklistToggle = (checklistId: string) => {
    const current = formData.checklist || [];
    const exists = current.find((c) => c.checklistId === checklistId);
    let updated;
    if (exists) {
      updated = current.map((c) =>
        c.checklistId === checklistId ? { ...c, status: !c.status } : c,
      );
    } else {
      updated = [...current, { checklistId, status: true }];
    }
    setFormData({ ...formData, checklist: updated });
  };

  const handleSaveRecord = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (
      !formData.plantName ||
      !(formData.folder || formData.subSystemName) ||
      !formData.tagNumber
    ) {
      toast.error("Plant, Folder, and Tag Number are required.");
      return;
    }

    if (!isNew && formData.status !== "Pending" && !formData.testedBy) {
      toast.error("Tester Name is required for non-pending records.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Saving record...");

    try {
      const currentUser = useGlobalStore.getState().currentUser;
      const currentUserId = currentUser !== null ? currentUser.id : 'unknown';

      let currentAttachmentUrl = formData.attachmentUrl || "";

      if (imageFile) {
        currentAttachmentUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(imageFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      }

      const activeYear = await dbApi.getActiveYear();
      const plant = plants.find((p) => p.id === formData.plantId);
      const sub = subSystems.find((s) => s.id === formData.subSystemId);

      // Clean Data Before Saving (Firebase Requirement)
      // Ensure every field defaults to empty string, null, or false to avoid 'undefined'
      const sanitizedPayload: any = {
        plantId: formData.plantId || "",
        plantName: plant?.name || formData.plantName || "",
        unitType: plant?.unitType || formData.unitType || "",
        categoryId: formData.categoryId || sub?.categoryId || "",
        subSystemId: formData.subSystemId || "",
        subSystemName: sub?.name || formData.subSystemName || "",
        folder: formData.folder || sub?.name || formData.subSystemName || "",
        tagNumber: formData.tagNumber || "",
        location: formData.location || "",
        testDate:
          formData.dateOfTesting ||
          formData.testDate ||
          new Date().toISOString().split("T")[0],
        dateOfTesting:
          formData.dateOfTesting ||
          formData.testDate ||
          new Date().toISOString().split("T")[0],
        status: formData.status || "Pending",
        healthCondition: formData.healthCondition || "Satisfactory",
        testedBy: formData.testedBy || "",
        testerName: formData.testerName || formData.testedBy || "",
        plantPersonnel: formData.plantPersonnel || "",
        deficiency: formData.deficiency || "",
        remarks: formData.overallSummaryText || formData.remarks || "",
        overallSummaryText:
          formData.overallSummaryText || formData.remarks || "",
        complianceText: formData.complianceText || "",
        systemType: "Fixed System",
        testingPeriod: formData.cycle || "Q1",
        detailedChecklist: formData.detailedChecklist || {},
        attachmentUrl: currentAttachmentUrl || "",
        checklist: formData.checklist || [],
        financialYear: formData.financialYear || activeYear,
        year: formData.year || new Date().getFullYear().toString(),
        cycle: formData.cycle || "Q1",
        cycleName: formData.cycleName || formData.cycle || "Q1",
        updatedAt: new Date().toISOString(),
      };

      if (isNew || (!activeTabId && historyRecords.length === 0)) {
        const recordId = Math.random().toString(36).substring(2, 11);
        sanitizedPayload.id = recordId;
        sanitizedPayload.createdAt = new Date().toISOString();

        await setDoc(doc(db, "testRecords", recordId), sanitizedPayload);
      } else {
        const updateId = activeTabId || formData.id;
        if (!updateId) {
          throw new Error("Missing record reference for update");
        }

        await updateDoc(doc(db, "testRecords", updateId), sanitizedPayload);
        sanitizedPayload.id = updateId;
      }

      // Silent Auditor: Immutable Audit Log for Compliance
      await logAuditAction(
        sanitizedPayload.id,
        isNew ? 'CREATE_RECORD' : 'STATUS_CHANGE',
        currentUserId,
        {
          operationalStatus: sanitizedPayload.status, // specifically tracking: completed, pending, overdue, or undermaintence
          tagNumber: sanitizedPayload.tagNumber,
          plantName: sanitizedPayload.plantName,
          healthCondition: sanitizedPayload.healthCondition,
          timestamp: new Date().toISOString()
        }
      );

      // @ts-ignore
      if (formData.markPlantDefective && formData.plantId) {
         try {
           const plantRef = doc(db, 'masterPlants', formData.plantId);
           const pSnap = await getDoc(plantRef);
           if (pSnap.exists()) {
             await updateDoc(plantRef, { status: 'Defective' });
           }
         } catch (e) {
           console.error("Failed to update master plant status", e);
         }
      }

      // Handle Automatic Next Cycle Generation for Approved Records
      if (
        userRole === "Admin" &&
        sanitizedPayload.status === "Approved & Locked"
      ) {
        const currentTab = String(
          sanitizedPayload.cycleName || sanitizedPayload.cycle,
        )
          .trim()
          .toUpperCase();
        const nextInfo = getNextCycleInfo(currentTab);

        let nextYear =
          sanitizedPayload.year || new Date().getFullYear().toString();
        if (
          ["Q4", "SECOND SEMIANNUAL", "ANNUAL", "YEARLY"].includes(currentTab)
        ) {
          nextYear = String(parseInt(nextYear) + 1);
        }

        const futureId = Math.random().toString(36).substring(2, 11);
        const baseDate = new Date(sanitizedPayload.testDate);
        baseDate.setMonth(baseDate.getMonth() + nextInfo.nextMonths);
        const nextDateStr = baseDate.toISOString().split("T")[0];

        const futureRecord = {
          ...sanitizedPayload,
          id: futureId,
          status: "Pending",
          cycle: nextInfo.nextCycle,
          cycleName: nextInfo.nextCycle,
          dateOfTesting: nextDateStr,
          testDate: nextDateStr,
          year: nextYear,
          testerName: "",
          testedBy: "",
          plantPersonnel: "",
          attachmentUrl: "",
          deficiency: "",
          remarks: "",
          overallSummaryText: "",
          complianceText: "",
          detailedChecklist: {},
          checklist: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "testRecords", futureId), futureRecord);
      }

      toast.success("Record saved successfully!", { id: loadingToast });
      localStorage.removeItem('ril_hmd_form_draft');
      setIsSubmitting(false);
      await onSave();
      onClose();
    } catch (error: any) {
      console.error("Firebase Save Error: ", error);
      setIsSubmitting(false);
      toast.error(
        "Failed to save record. Check your connection or permissions.",
        { id: loadingToast },
      );
      alert("Failed to save record. Check your connection or permissions.");
    }
  };

  if (!isOpen) return null;

  const isDataLoading =
    plants.length === 0 || subSystems.length === 0 || isLoadingHistory;

  const isFormValid = !!(
    formData.tagNumber &&
    formData.status &&
    formData.healthCondition
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? "Add New Test Record" : "Equipment Profile"}
      maxWidth={isNew ? "max-w-5xl" : "max-w-7xl"}
    >
      <div className="relative min-h-[500px]">
        {/* Header Branding */}
        <div className={cn("px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10", theme === 'modern' ? "bg-slate-900/80 border-slate-800" : "bg-white border-gray-100")}>
          <div className="flex flex-col">
            <span className={cn("text-[14px] font-black tracking-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
              RELIANCE INDUSTRIES LIMITED -{" "}
              <span className={cn("text-[#C09532]", theme === 'modern' ? "text-[#D4AF37]" : "")}>FIRE DEPARTMENT</span>
            </span>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Comprehensive Digital Testing Protocol
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                System Type
              </span>
              <span className={cn("text-sm font-black uppercase", theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")}>
                Fixed System
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                Period
              </span>
              <span className={cn("text-sm font-black uppercase", theme === 'modern' ? "text-slate-200" : "text-gray-900")}>
                {formData.cycle || "N/A"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                Execution Date
              </span>
              <span className={cn("text-sm font-black", theme === 'modern' ? "text-slate-200" : "text-gray-900")}>
                {new Date().toLocaleDateString("en-GB")}
              </span>
            </div>
          </div>
        </div>
        {isDataLoading && (
          <div className={cn("absolute inset-0 z-50 flex items-center justify-center", theme === 'modern' ? "bg-slate-900/60" : "bg-white/60")}>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 border-4 border-[#C09532] border-t-transparent rounded-full animate-spin mb-2" />
              <span className="font-bold text-[#C09532]">
                Loading Equipment Data...
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 p-1 h-full">
          {/* History Sidebar (Only shown when not new) */}
          {!isNew && (
            <div className="w-full lg:w-64 flex flex-col gap-3 border-r border-gray-100 pr-5 shrink-0 max-h-[700px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 px-2 text-gray-500 mb-2">
                <History className="h-4 w-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">
                  Historical Tests
                </h4>
              </div>
              <div className="flex flex-col gap-2">
                {historyRecords.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-2">
                    No history records found.
                  </p>
                ) : (
                  historyRecords.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleTabSwitch(r.id)}
                      className={cn(
                        "flex flex-col items-start text-left p-3 rounded-xl transition-all border-2 w-full",
                        activeTabId === r.id
                          ? "bg-white border-blue-500 shadow-sm shadow-blue-100"
                          : "bg-gray-50 border-transparent hover:bg-gray-100",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-bold mb-1",
                          activeTabId === r.id
                            ? "text-blue-900"
                            : "text-gray-900",
                        )}
                      >
                        {r.testDate
                          ? new Date(r.testDate).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })
                          : "Unknown Date"}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                          r.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : r.status === "Overdue"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {r.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MAIN COLUMN: Form Fields & Protocol Tabs */}
          <div className={cn("flex-1 flex flex-col rounded-3xl border shadow-sm overflow-hidden h-[calc(100vh-200px)] max-h-[800px]", theme === 'modern' ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100")}>
            {/* Tabs Header */}
            <div className={cn("flex items-center border-b px-6 pt-4 shrink-0", theme === 'modern' ? "border-slate-800 bg-slate-800/40" : "border-gray-100 bg-gray-50/50")}>
              <button
                onClick={() => setActiveFormTab("basic")}
                className={cn(
                  "px-6 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-colors",
                  activeFormTab === "basic"
                    ? "border-[#C09532] text-[#C09532]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                )}
              >
                Basic Details
              </button>
              <button
                onClick={() => setActiveFormTab("protocol")}
                className={cn(
                  "px-6 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-colors",
                  activeFormTab === "protocol"
                    ? "border-[#C09532] text-[#C09532]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                )}
              >
                Inspection Checklist
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {activeFormTab === "basic" ? (
                <div className="space-y-6 max-w-4xl">
                  {/* Top Row: Plant & Equipment Folder */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                        Plant Name
                      </label>
                      <div className={cn("w-full h-11 rounded-xl border-2 px-3 flex items-center text-sm font-bold", theme === 'modern' ? "bg-slate-900/50 border-slate-800 text-slate-100" : "bg-gray-50/50 border-gray-100 text-gray-900")}>
                        {formData.plantName || "N/A"}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                        EQUIPMENT / SUB-SYSTEM FOLDER
                      </label>
                      <div className={cn("w-full h-11 rounded-xl border-2 px-3 flex items-center text-sm font-bold", theme === 'modern' ? "bg-slate-900/50 border-slate-800 text-slate-100" : "bg-gray-50/50 border-gray-100 text-gray-900")}>
                        {formData.folder || formData.subSystemName || "N/A"}
                      </div>
                    </div>
                  </div>

            {/* Second Row: Tag No, Location, Test Date */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                    Tag Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTagLocked(false)}
                    className={cn("text-[10px] font-black flex items-center gap-1 transition-colors", theme === 'modern' ? "text-[#D4AF37] hover:text-[#C09532]" : "text-blue-600 hover:text-blue-800")}
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    Edit
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. MV-001"
                  className={cn("w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none transition-all disabled:opacity-50", theme === 'modern' ? "bg-slate-800/80 border-slate-700 text-slate-200 focus:border-[#D4AF37] disabled:bg-slate-900/50 disabled:text-slate-500" : "bg-white border-gray-100 text-gray-900 focus:border-blue-500 disabled:bg-gray-50/50 disabled:text-gray-400")}
                  value={formData.tagNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, tagNumber: e.target.value })
                  }
                  disabled={isTagLocked}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                    Location
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLocationLocked(false)}
                    className={cn("text-[10px] font-black flex items-center gap-1 transition-colors", theme === 'modern' ? "text-[#D4AF37] hover:text-[#C09532]" : "text-blue-600 hover:text-blue-800")}
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    Edit
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Building A, Floor 1"
                  className={cn("w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none transition-all disabled:opacity-50", theme === 'modern' ? "bg-slate-800/80 border-slate-700 text-slate-200 focus:border-[#D4AF37] disabled:bg-slate-900/50 disabled:text-slate-500" : "bg-white border-gray-100 text-gray-900 focus:border-blue-500 disabled:bg-gray-50/50 disabled:text-gray-400")}
                  value={formData.location || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  disabled={isLocationLocked}
                />
              </div>

              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                  Test Date
                </label>
                <input
                  type="date"
                  className={cn("w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none transition-all", theme === 'modern' ? "bg-slate-800/80 border-slate-700 text-slate-200 focus:border-[#D4AF37] [color-scheme:dark]" : "bg-white border-gray-100 text-gray-900 focus:border-blue-500")}
                  value={formData.dateOfTesting || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfTesting: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Third Row: Tester Name & Plant Personnel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                  Tester Name
                </label>
                <select
                  className={cn("w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none transition-all", theme === 'modern' ? "bg-slate-800/80 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "bg-white border-gray-100 text-gray-900 focus:border-blue-500")}
                  value={formData.testedBy || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, testedBy: e.target.value })
                  }
                >
                  <option value="">Select Tester...</option>
                  {users.map((u, idx) => (
                    <option key={u.id || `tester-${idx}`} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                  PLANT PERSONNEL
                </label>
                <input
                  type="text"
                  placeholder="Name of plant personnel..."
                  className={cn("w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none transition-all", theme === 'modern' ? "bg-slate-800/80 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "bg-white border-gray-100 text-gray-900 focus:border-blue-500")}
                  value={formData.plantPersonnel || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, plantPersonnel: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Camera className="h-3 w-3" />
                Upload Defect Photo
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#C09532]/50 hover:bg-[#C09532]/5 transition-all text-center">
                    <div className="flex flex-col items-center justify-center pt-2">
                      <Camera className="w-5 h-5 text-gray-400 mb-1" />
                      <p className="text-[9px] text-gray-500 font-bold">
                        CLICK TO UPLOAD
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {imagePreview && (
                  <div className="relative h-24 w-24 rounded-xl overflow-hidden border-2 border-gray-100 group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setFormData({ ...formData, attachmentUrl: "" });
                      }}
                      className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Deficiencies Observations */}
            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-red-400" : "text-red-500")}>
                OBSERVED DEFICIENCIES
              </label>
              <textarea
                placeholder="Consolidated remarks on safety, defects, and corrective actions..."
                className={cn("w-full min-h-[100px] rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none resize-none transition-all", theme === 'modern' ? "bg-red-950/20 border-red-900/50 text-red-200 focus:border-red-500 placeholder:text-red-900/50" : "bg-red-50/10 border-red-100 text-gray-900 focus:border-red-400 placeholder:text-gray-400")}
                value={formData.deficienciesText || ""}
                onChange={(e) =>
                  setFormData({ ...formData, deficienciesText: e.target.value })
                }
              />
            </div>

            {/* Compliance Textarea */}
            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-slate-500")}>
                TECHNICAL REMARKS & RECOMMENDATIONS
              </label>
              <textarea
                placeholder="Details on compliance standards and certifications..."
                className={cn("w-full min-h-[100px] rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none resize-none transition-all", theme === 'modern' ? "bg-slate-900/50 border-slate-700/50 text-slate-200 focus:border-[#D4AF37] placeholder:text-slate-600" : "bg-slate-50/50 border-slate-100 text-gray-900 focus:border-slate-400 placeholder:text-gray-400")}
                value={formData.complianceText || ""}
                onChange={(e) =>
                  setFormData({ ...formData, complianceText: e.target.value })
                }
              />
            </div>

            {/* Bottom Row: Status & Health */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                  Status
                </label>
                <select
                  className={cn("w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none disabled:opacity-50 transition-all", theme === 'modern' ? "bg-slate-800/80 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "bg-white border-gray-100 text-gray-900 focus:border-blue-500")}
                  value={formData.status || "Pending"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as TestingStatus,
                    })
                  }
                  disabled={false}
                >
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                </select>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>
                  Health
                </label>
                <select
                  className={cn(
                    "w-full h-11 rounded-xl border-2 px-3 text-sm font-bold outline-none transition-colors",
                    formData.healthCondition === "Satisfactory"
                      ? (theme === 'modern' ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" : "bg-green-50/50 border-green-200 text-green-700")
                      : (theme === 'modern' ? "bg-rose-950/30 border-rose-900/50 text-rose-400" : "bg-red-50/50 border-red-200 text-red-700"),
                  )}
                  value={formData.healthCondition || "Satisfactory"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      healthCondition: e.target.value as HealthCondition,
                      // @ts-ignore
                      markPlantDefective: e.target.value === "Unsatisfactory"
                    })
                  }
                >
                  <option value="Satisfactory">Satisfactory ✔️</option>
                  <option value="Unsatisfactory">Unsatisfactory ⚠️</option>
                </select>
                {formData.healthCondition === "Unsatisfactory" && (
                   <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                     <input 
                       type="checkbox" 
                       // @ts-ignore
                       checked={!!formData.markPlantDefective} 
                       // @ts-ignore
                       onChange={e => setFormData({...formData, markPlantDefective: e.target.checked})} 
                       className="rounded text-rose-600 focus:ring-rose-500" 
                     />
                     <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Mark Solid Plant as Defective Globally</span>
                   </label>
                )}
              </div>
            </div>

                  {/* Read-only Category info */}
                  <div className={cn("pt-2 flex items-center justify-between text-[11px] font-black uppercase tracking-widest p-3 rounded-lg border", theme === 'modern' ? "bg-slate-900/40 border-slate-700/50 text-slate-500" : "bg-gray-50/50 border-gray-100 text-gray-400")}>
                    <span>
                      Category:{" "}
                      <span className={cn(theme === 'modern' ? "text-slate-200" : "text-gray-900")}>
                        {categories.find((c) => c.id === formData.categoryId)?.name ||
                          "N/A"}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl space-y-6">
                  <div className={cn("p-5 rounded-3xl border-2", theme === 'modern' ? "bg-slate-900/40 border-slate-800" : "bg-[#f8f9fc] border-gray-100")}>
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("flex items-center gap-2", theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")}>
                        <FileText className="h-4 w-4" />
                        <h4 className="text-[11px] font-black uppercase tracking-wider">
                          Itemized Defect Protocol
                        </h4>
                      </div>
                      <span className={cn("text-[9px] font-bold uppercase", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>
                        Defect Observed | Specific Remarks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {PROTOCOL_ITEMS.map((item) => {
                        const itemData = formData.detailedChecklist?.[item.id] || {
                          hasDefect: false,
                          remarks: "",
                        };
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "py-2 px-3 rounded-xl border transition-all flex items-center justify-between",
                              itemData.hasDefect
                                ? (theme === 'modern' ? "border-[#D4AF37]/30 bg-[#D4AF37]/5" : "border-[#C09532]/30 bg-[#C09532]/5")
                                : (theme === 'modern' ? "border-slate-800 bg-slate-800/40" : "border-gray-100 bg-white"),
                            )}
                          >
                            <span
                              className={cn(
                                "text-[11px] font-black uppercase tracking-tight flex-1",
                                itemData.hasDefect
                                  ? (theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")
                                  : (theme === 'modern' ? "text-slate-300" : "text-gray-700"),
                              )}
                            >
                              {item.id.replace(/([A-Z])/g, " $1").trim()}
                            </span>

                            <label className="flex items-center gap-2 cursor-pointer ml-4">
                              <span className={cn("text-[9px] font-bold uppercase tracking-widest select-none", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>
                                Defect
                              </span>
                              <input
                                type="checkbox"
                                className={cn("w-4 h-4 rounded focus:ring-2 cursor-pointer", theme === 'modern' ? "text-[#D4AF37] border-slate-600 focus:ring-[#D4AF37] accent-[#D4AF37] bg-slate-900" : "text-[#C09532] border-gray-300 focus:ring-[#C09532] accent-[#C09532]")}
                                checked={itemData.hasDefect}
                                onChange={(e) => {
                                  const newProtocol = {
                                    ...(formData.detailedChecklist || {}),
                                  };
                                  newProtocol[item.id] = {
                                    ...itemData,
                                    hasDefect: e.target.checked,
                                  };
                                  setFormData({
                                    ...formData,
                                    detailedChecklist: newProtocol,
                                  });
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with actions - always visible */}
            <div className={cn("p-4 border-t flex items-center justify-end gap-3 shrink-0", theme === 'modern' ? "bg-slate-900/80 border-slate-800" : "bg-gray-50 border-gray-100")}>
              {!isNew && (
                <button
                  onClick={() =>
                    formData.id && generatePDFReport(formData as TestRecord)
                  }
                  className={cn("px-6 h-12 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-sm mr-auto", theme === 'modern' ? "text-emerald-400 bg-emerald-950/30 border-emerald-900/50 hover:bg-emerald-900/50" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200")}
                >
                  <Download className="h-4 w-4" />
                  Download Official PDF
                </button>
              )}
              <button
                onClick={onClose}
                className={cn("px-6 h-12 rounded-2xl text-sm font-black border-2 transition-all shadow-sm", theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50")}
              >
                Discard
              </button>
              <button
                onClick={handleSaveRecord}
                disabled={isSubmitting || !isFormValid}
                className={cn(
                  "px-8 h-12 rounded-2xl text-sm font-black text-white transition-all shadow-lg relative group",
                  isSubmitting || !isFormValid
                    ? (theme === 'modern' ? "bg-slate-700 cursor-not-allowed border-0 text-slate-400" : "bg-gray-400 cursor-not-allowed border-0")
                    : (theme === 'modern' ? "bg-[#D4AF37] hover:bg-[#C09532] shadow-[#D4AF37]/25" : "bg-[#C09532] hover:bg-[#A88028] shadow-[#C09532]/25"),
                )}
                title={!isFormValid ? "Tag Number, Status, and Health Condition are required" : undefined}
              >
                {!isFormValid && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-max bg-gray-900 text-white text-[10px] py-1 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Tag #, Status, & Health are required
                  </div>
                )}
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  "Save Record"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
