import { timeliness2025Records } from "./timeliness2025Data.js";
import { reportingStatus2025Aggregates } from "./reportingStatus2025Data.js";
import { orderFillRate2025Aggregates } from "./orderFillRate2025Data.js";

export const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const navItems = [
  "Executive Summary",
  "Reporting Performance",
  "Commodity Availability",
  "Stock Status / MOS",
  "Stock Imbalances",
  "AMC / Consumption Trends",
  "Provincial Performance",
  "Programme Performance",
  "Facility Level Analysis",
  "Data Quality",
];

export const stockStatuses = [
  "According to Plan",
  "Understock",
  "Emergency",
  "Stock-out",
  "Overstock",
  "Excess",
];

const provinceOrder = [
  "Central",
  "Copperbelt",
  "Eastern",
  "Luapula",
  "Lusaka",
  "Muchinga",
  "Northern",
  "North-Western",
  "Southern",
  "Western",
];

const provinceDistrictMap = timeliness2025Records.reduce((map, row) => {
  if (!map.has(row.province)) map.set(row.province, new Set());
  map.get(row.province).add(row.district);
  return map;
}, new Map());

const provinces = provinceOrder
  .filter((province) => provinceDistrictMap.has(province))
  .map((province) => [province, Array.from(provinceDistrictMap.get(province)).sort()]);

const reportingStatusByDistrictMonth = new Map(
  reportingStatus2025Aggregates.map((row) => [`${row.month}|${row.province}|${row.district}`, row]),
);

const orderFillRateByDistrictMonth = new Map(
  orderFillRate2025Aggregates.map((row) => [`${row.month}|${row.province}|${row.district}`, row]),
);

const programmes = [
  ["HIV", ["Tenofovir/Lamivudine/Dolutegravir", "HIV Test Kits", "Cotrimoxazole"]],
  ["Malaria", ["Artemether Lumefantrine", "Rapid Diagnostic Tests", "Injectable Artesunate"]],
  ["Family Planning", ["DMPA IM", "Implants", "Combined Oral Pills"]],
  ["Maternal Health", ["Oxytocin", "Magnesium Sulphate", "Misoprostol"]],
  ["Vaccines", ["BCG Vaccine", "Measles Rubella Vaccine", "Pentavalent Vaccine"]],
];

const facilityLevels = [
  "Health Post",
  "Health Centre",
  "Level 1 Hospital",
  "Level 2 Hospital",
  "Level 3 Hospital",
  "Specialized Hospital",
];

function seeded(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function classifyMos(mos) {
  if (mos <= 0.05) return "Stock-out";
  if (mos < 0.5) return "Emergency";
  if (mos < 2) return "Understock";
  if (mos <= 5) return "According to Plan";
  if (mos <= 8) return "Overstock";
  return "Excess";
}

// Real 2025 reporting completeness, timeliness, and order fill rate come from
// the converted source modules. Replace or extend those modules when new CSV or
// Excel extracts are available.
export const mockRecords = [];

let id = 1;
timeliness2025Records.forEach((timelinessRow, timelinessIndex) => {
  const { province, district, month } = timelinessRow;
  const provinceIndex = Math.max(0, provinceOrder.indexOf(province));
  const districtIndex = provinces.find(([name]) => name === province)?.[1].indexOf(district) ?? 0;
  const monthIndex = Math.max(0, months.indexOf(month));
  const reportingStatusRow = reportingStatusByDistrictMonth.get(`${month}|${province}|${district}`);
  const orderFillRow = orderFillRateByDistrictMonth.get(`${month}|${province}|${district}`);

  programmes.forEach(([programme, commodities], programmeIndex) => {
    commodities.forEach((commodity, commodityIndex) => {
      const level = facilityLevels[(districtIndex + programmeIndex + commodityIndex + monthIndex) % facilityLevels.length];
      const seed = id + timelinessIndex * 17 + provinceIndex * 19 + programmeIndex * 13;
      const seasonal = Math.sin((monthIndex / 12) * Math.PI * 2) * 4;
      const reportingCompleteness = reportingStatusRow?.reportingCompleteness ?? timelinessRow.reportingCompleteness;
      const reportingTimeliness = timelinessRow.reportingTimeliness;
      const availability = clamp(84 + provinceIndex * 0.9 + programmeIndex * 1.2 - commodityIndex * 2.2 + seasonal + seeded(seed, 3) * 16, 48, 100);
      const mos = clamp((availability / 100) * 5.4 + seeded(seed, 4) * 4 - (commodityIndex === 2 ? 1.2 : 0), 0, 10);
      const stockStatus = classifyMos(mos);
      const stockOutRate = stockStatus === "Stock-out" ? 100 : clamp(18 - availability / 8 + seeded(seed, 5) * 10, 0, 45);
      const orderFillRate = orderFillRow?.orderFillRate ?? null;
      const modeledOrderFillRate = clamp(availability - 4 + seeded(seed, 6) * 13, 45, 100);
      const amc = Math.round(120 + programmeIndex * 180 + commodityIndex * 85 + provinceIndex * 22 + seeded(seed, 7) * 420);

      mockRecords.push({
        id,
        year: 2025,
        month,
        province,
        district,
        facility: `${district} ${level} ${programmeIndex + 1}`,
        facilityLevel: level,
        programme,
        commodity,
        reportingCompleteness,
        reportingTimeliness,
        expectedReports: timelinessRow.expected,
        reportedOnTime: timelinessRow.reportedOnTime,
        reportedLate: timelinessRow.reportedLate,
        reportedReports: timelinessRow.reported,
        reportingStatusExpected: reportingStatusRow?.expected ?? null,
        reportingStatusReported: reportingStatusRow?.reported ?? null,
        nonReportingFacilities: reportingStatusRow?.nonReporting ?? 0,
        supplyingDepot: timelinessRow.supplyingDepot,
        availability,
        mos,
        stockStatus,
        stockOutRate,
        orderFillRate,
        modeledOrderFillRate,
        orderedQuantity: orderFillRow?.orderedQuantity ?? null,
        shippedQuantity: orderFillRow?.shippedQuantity ?? null,
        orderLineItems: orderFillRow?.lineItems ?? 0,
        zeroFillItems: orderFillRow?.zeroFillItems ?? 0,
        amc,
        missingReport: (reportingStatusRow?.nonReporting ?? 0) > 0,
        duplicateRecord: seeded(seed, 8) > 0.985,
        incompleteData: availability < 58 || seeded(seed, 9) > 0.975,
        outlier: mos > 8.5 || amc > 980,
        irregularReporting: reportingTimeliness < 68,
      });
      id += 1;
    });
  });
});
