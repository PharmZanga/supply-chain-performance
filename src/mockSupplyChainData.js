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

const provinces = [
  ["Central", ["Kabwe", "Chibombo", "Kapiri Mposhi"]],
  ["Copperbelt", ["Ndola", "Kitwe", "Mufulira"]],
  ["Eastern", ["Chipata", "Petauke", "Lundazi"]],
  ["Luapula", ["Mansa", "Nchelenge", "Kawambwa"]],
  ["Lusaka", ["Lusaka", "Chongwe", "Kafue"]],
  ["Muchinga", ["Chinsali", "Isoka", "Mpika"]],
  ["Northern", ["Kasama", "Mbala", "Mporokoso"]],
  ["North-Western", ["Solwezi", "Mwinilunga", "Zambezi"]],
  ["Southern", ["Choma", "Livingstone", "Mazabuka"]],
  ["Western", ["Mongu", "Senanga", "Kalabo"]],
];

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

// Upload or map real 2025 CSV/Excel data here. Keep these field names so the
// dashboard components can render live eLMIS, ZAMMSA, or programme extracts.
export const mockRecords = [];

let id = 1;
provinces.forEach(([province, districts], provinceIndex) => {
  districts.forEach((district, districtIndex) => {
    programmes.forEach(([programme, commodities], programmeIndex) => {
      commodities.forEach((commodity, commodityIndex) => {
        months.forEach((month, monthIndex) => {
          const level = facilityLevels[(districtIndex + programmeIndex + commodityIndex + monthIndex) % facilityLevels.length];
          const seed = id + provinceIndex * 19 + programmeIndex * 13;
          const seasonal = Math.sin((monthIndex / 12) * Math.PI * 2) * 4;
          const reportingCompleteness = clamp(86 + provinceIndex * 0.6 - districtIndex * 1.8 + seasonal + seeded(seed, 1) * 12, 62, 100);
          const reportingTimeliness = clamp(80 + provinceIndex * 0.5 - districtIndex * 1.5 + seasonal + seeded(seed, 2) * 14, 55, 100);
          const availability = clamp(84 + provinceIndex * 0.9 + programmeIndex * 1.2 - commodityIndex * 2.2 + seasonal + seeded(seed, 3) * 16, 48, 100);
          const mos = clamp((availability / 100) * 5.4 + seeded(seed, 4) * 4 - (commodityIndex === 2 ? 1.2 : 0), 0, 10);
          const stockStatus = classifyMos(mos);
          const stockOutRate = stockStatus === "Stock-out" ? 100 : clamp(18 - availability / 8 + seeded(seed, 5) * 10, 0, 45);
          const orderFillRate = clamp(availability - 4 + seeded(seed, 6) * 13, 45, 100);
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
            availability,
            mos,
            stockStatus,
            stockOutRate,
            orderFillRate,
            amc,
            missingReport: reportingCompleteness < 72,
            duplicateRecord: seeded(seed, 8) > 0.985,
            incompleteData: availability < 58 || seeded(seed, 9) > 0.975,
            outlier: mos > 8.5 || amc > 980,
            irregularReporting: reportingTimeliness < 68,
          });
          id += 1;
        });
      });
    });
  });
});
