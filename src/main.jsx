import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { mockRecords, months, navItems, stockStatuses } from "./mockSupplyChainData.js";
import { timeliness2025Metadata } from "./timeliness2025Data.js";
import { reportingStatus2025Aggregates, reportingStatus2025Metadata, reportingStatus2025NonReporting } from "./reportingStatus2025Data.js";
import { orderFillRate2025Aggregates, orderFillRate2025LowFillItems, orderFillRate2025Metadata, orderFillRate2025MonthlySummary } from "./orderFillRate2025Data.js";
import "./styles.css";

const pct = (value) => `${Math.round(value)}%`;
const pct2 = (value) => `${Number(value).toFixed(2)}%`;
const oneDec = (value) => Number(value).toFixed(1);
const avg = (items, key) => {
  const values = items.map((row) => row[key]).filter((value) => typeof value === "number" && Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};

function unique(records, key) {
  return Array.from(new Set(records.map((row) => row[key]))).sort();
}

function scoreRecord(row) {
  const mosAdequacy = row.stockStatus === "According to Plan" ? 100 : row.stockStatus === "Understock" ? 72 : row.stockStatus === "Emergency" ? 42 : row.stockStatus === "Stock-out" ? 18 : row.stockStatus === "Overstock" ? 70 : 55;
  return row.reportingCompleteness * 0.22 + row.reportingTimeliness * 0.18 + row.availability * 0.28 + mosAdequacy * 0.2 + (100 - row.stockOutRate) * 0.12;
}

function groupBy(records, key) {
  return records.reduce((groups, row) => {
    groups[row[key]] = groups[row[key]] || [];
    groups[row[key]].push(row);
    return groups;
  }, {});
}

function orderFillSummary(monthFilter = "All") {
  const rows = orderFillRate2025MonthlySummary.filter((row) => monthFilter === "All" || row.month === monthFilter);
  const approvedProducts = rows.reduce((sum, row) => sum + row.approvedProducts, 0);
  const shippedProducts = rows.reduce((sum, row) => sum + row.shippedProducts, 0);
  return {
    rows,
    approvedProducts,
    shippedProducts,
    orderFillRate: approvedProducts ? (shippedProducts / approvedProducts) * 100 : 0,
  };
}

function summarize(records, key) {
  return Object.entries(groupBy(records, key)).map(([name, rows]) => ({
    name,
    reportingCompleteness: avg(rows, "reportingCompleteness"),
    reportingTimeliness: avg(rows, "reportingTimeliness"),
    availability: avg(rows, "availability"),
    mos: avg(rows, "mos"),
    stockOutRate: avg(rows, "stockOutRate"),
    orderFillRate: avg(rows, "orderFillRate"),
    amc: avg(rows, "amc"),
    score: rows.reduce((sum, row) => sum + scoreRecord(row), 0) / rows.length,
    records: rows.length,
  })).sort((a, b) => b.score - a.score);
}

function statusDistribution(records) {
  const total = records.length || 1;
  return stockStatuses.map((status) => ({
    name: status,
    value: records.filter((row) => row.stockStatus === status).length,
    percent: (records.filter((row) => row.stockStatus === status).length / total) * 100,
  }));
}

function useFilteredRecords(filters) {
  return useMemo(() => mockRecords.filter((row) => (
    row.year === Number(filters.year) &&
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district) &&
    (filters.facilityLevel === "All" || row.facilityLevel === filters.facilityLevel) &&
    (filters.programme === "All" || row.programme === filters.programme) &&
    (filters.commodity === "All" || row.commodity === filters.commodity)
  )), [filters]);
}

function App() {
  const [activePage, setActivePage] = useState("Executive Summary");
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [filters, setFilters] = useState({
    year: 2025,
    month: "All",
    province: "All",
    district: "All",
    facilityLevel: "All",
    programme: "All",
    commodity: "All",
  });
  const records = useFilteredRecords(filters);
  const districts = filters.province === "All" ? unique(mockRecords, "district") : unique(mockRecords.filter((row) => row.province === filters.province), "district");

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "province" ? { district: "All" } : {}),
    }));
  };

  const props = { records, filters, setFilters, selectedProvince, setSelectedProvince, setActivePage };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SC</div>
          <div>
            <p className="eyebrow">Zambia Public Health</p>
            <h1>Supply Chain Performance</h1>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <button key={item} className={activePage === item ? "nav-item active" : "nav-item"} onClick={() => setActivePage(item)}>
              <span>{item}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="identity-band" aria-label="Republic of Zambia Ministry of Health and National Supply Chain Coordinating Unit logos">
            <img src="/supply-chain-performance/assets/moh-logo-lockup.png" alt="Republic of Zambia Ministry of Health" className="moh-logo" />
            <img src="/supply-chain-performance/assets/nsccu-logo-lockup.png" alt="National Supply Chain Coordinating Unit" className="nsccu-logo" />
          </div>
          <div className="hero-row">
            <div className="hero-copy">
              <p className="eyebrow">National dashboard | 2025</p>
              <h2>{activePage}</h2>
              <p className="hero-summary">Public health logistics performance for medicines, vaccines, reporting, stock status, and commodity availability.</p>
            </div>
            <div className="topbar-metrics">
              <span>{records.length.toLocaleString()} records</span>
              <span>{pct(avg(records, "availability"))} availability</span>
            </div>
          </div>
        </header>

        <section className="filter-strip" aria-label="Dashboard filters">
          <Select label="Year" value={filters.year} options={[2025]} onChange={(value) => updateFilter("year", value)} />
          <Select label="Month" value={filters.month} options={["All", ...months]} onChange={(value) => updateFilter("month", value)} />
          <Select label="Province" value={filters.province} options={["All", ...unique(mockRecords, "province")]} onChange={(value) => updateFilter("province", value)} />
          <Select label="District" value={filters.district} options={["All", ...districts]} onChange={(value) => updateFilter("district", value)} />
          <Select label="Facility level" value={filters.facilityLevel} options={["All", ...unique(mockRecords, "facilityLevel")]} onChange={(value) => updateFilter("facilityLevel", value)} />
          <Select label="Programme" value={filters.programme} options={["All", ...unique(mockRecords, "programme")]} onChange={(value) => updateFilter("programme", value)} />
          <Select label="Commodity" value={filters.commodity} options={["All", ...unique(mockRecords, "commodity")]} onChange={(value) => updateFilter("commodity", value)} />
        </section>

        {activePage === "Executive Summary" && <ExecutiveSummary {...props} />}
        {activePage === "Reporting Performance" && <ReportingPerformance {...props} />}
        {activePage === "Reporting Status" && <ReportingStatusPage {...props} />}
        {activePage === "Commodity Availability" && <CommodityAvailability {...props} />}
        {activePage === "Stock Status / MOS" && <StockStatus {...props} />}
        {activePage === "Stock Imbalances" && <StockImbalances {...props} />}
        {activePage === "AMC / Consumption Trends" && <ConsumptionTrends {...props} />}
        {activePage === "Order Fill Rate" && <OrderFillRatePage {...props} />}
        {activePage === "Provincial Performance" && <ProvincialPerformance {...props} />}
        {activePage === "Programme Performance" && <ProgrammePerformance {...props} />}
        {activePage === "Facility Level Analysis" && <FacilityLevelAnalysis {...props} />}
        {activePage === "Data Quality" && <DataQuality {...props} />}
      </main>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function KpiCard({ label, value, detail, tone = "neutral" }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function KpiGrid({ records }) {
  const nationalOrderFill = orderFillSummary("All");
  return (
    <section className="kpi-grid">
      <KpiCard label="Reporting Completeness" value={pct(avg(records, "reportingCompleteness"))} detail="National average" tone="good" />
      <KpiCard label="Reporting Timeliness" value={pct(avg(records, "reportingTimeliness"))} detail="Submitted on schedule" tone="good" />
      <KpiCard label="Commodity Availability" value={pct(avg(records, "availability"))} detail="Tracer items available" tone={avg(records, "availability") >= 90 ? "good" : "warn"} />
      <KpiCard label="Average MOS" value={oneDec(avg(records, "mos"))} detail="Months of stock" />
      <KpiCard label="Stock-out Rate" value={pct(avg(records, "stockOutRate"))} detail="Facilities with zero balance" tone={avg(records, "stockOutRate") > 10 ? "danger" : "good"} />
      <KpiCard label="Order Fill Rate" value={pct2(nationalOrderFill.orderFillRate)} detail="Products shipped / approved" />
    </section>
  );
}

function ExecutiveSummary({ records, setFilters, setActivePage }) {
  const provincial = summarize(records, "province");
  const monthly = months.map((month) => ({ name: month.slice(0, 3), availability: avg(records.filter((row) => row.month === month), "availability"), reporting: avg(records.filter((row) => row.month === month), "reportingCompleteness") }));
  const best = provincial[0];
  const lowest = provincial[provincial.length - 1];
  return (
    <>
      <KpiGrid records={records} />
      <section className="dashboard-grid two-one">
        <Panel title="2025 National Trends" subtitle="Reporting completeness and commodity availability">
          <LineChart data={monthly} series={[{ key: "reporting", label: "Reporting", color: "#0d7a53" }, { key: "availability", label: "Availability", color: "#0b3a67" }]} />
        </Panel>
        <InsightBox title="Automated Insight" text={`${best?.name || "Top province"} is currently leading with a composite score of ${oneDec(best?.score || 0)}. ${lowest?.name || "Lowest province"} needs focused support, especially on stock availability and timeliness.`} />
      </section>
      <Panel title="Provincial Performance Ranking" subtitle="Click a province to filter and drill into districts">
        <BarChart data={provincial} valueKey="score" onSelect={(item) => { setFilters((current) => ({ ...current, province: item.name, district: "All" })); setActivePage("Provincial Performance"); }} />
      </Panel>
    </>
  );
}

function ReportingPerformance({ records, filters, setFilters }) {
  const monthly = months.map((month) => ({ name: month.slice(0, 3), completeness: avg(records.filter((row) => row.month === month), "reportingCompleteness"), timeliness: avg(records.filter((row) => row.month === month), "reportingTimeliness") }));
  const provinces = summarize(records, "province");
  const districts = summarize(records, "district");
  const irregular = reportingStatus2025NonReporting.filter((row) => (
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district) &&
    (filters.facilityLevel === "All" || row.facilityLevel === filters.facilityLevel)
  )).slice(0, 20);
  const reportingUnits = new Map();
  records.forEach((row) => {
    reportingUnits.set(`${row.month}|${row.province}|${row.district}`, row);
  });
  const sourceRows = Array.from(reportingUnits.values());
  const expectedReports = sourceRows.reduce((sum, row) => sum + (row.expectedReports || 0), 0);
  const onTimeReports = sourceRows.reduce((sum, row) => sum + (row.reportedOnTime || 0), 0);
  const statusExpected = sourceRows.reduce((sum, row) => sum + (row.reportingStatusExpected || 0), 0);
  const statusReported = sourceRows.reduce((sum, row) => sum + (row.reportingStatusReported || 0), 0);
  const statusNonReporting = sourceRows.reduce((sum, row) => sum + (row.nonReportingFacilities || 0), 0);
  return (
    <>
      <section className="source-note">
        <strong>2025 reporting sources loaded:</strong>
        <span>{reportingStatus2025Metadata.recordCount.toLocaleString()} facility status rows and {timeliness2025Metadata.recordCount.toLocaleString()} timeliness rows across {reportingStatus2025Metadata.districtCount} districts.</span>
        <span>{statusReported.toLocaleString()} reported facilities out of {statusExpected.toLocaleString()} expected; {statusNonReporting.toLocaleString()} non-reporting in current filter.</span>
        <span>{onTimeReports.toLocaleString()} on-time reports out of {expectedReports.toLocaleString()} expected timeliness reports.</span>
      </section>
      <section className="dashboard-grid halves">
        <Panel title="Completeness and Timeliness by Month" subtitle="January to December 2025">
          <LineChart data={monthly} series={[{ key: "completeness", label: "Completeness", color: "#0d7a53" }, { key: "timeliness", label: "Timeliness", color: "#c58a00" }]} />
        </Panel>
        <Panel title="Province Reporting Heatmap" subtitle="Darker cells show stronger reporting">
          <Heatmap data={provinces} keys={["reportingCompleteness", "reportingTimeliness"]} />
        </Panel>
      </section>
      <Panel title="Province to District Drilldown" subtitle="Select a province bar to filter the dashboard">
        <BarChart data={provinces} valueKey="reportingCompleteness" onSelect={(item) => setFilters((current) => ({ ...current, province: item.name, district: "All" }))} />
      </Panel>
      <DataTable title="Non-reporting Facilities from Reporting Status" rows={irregular} columns={["province", "district", "facilityCode", "facility", "facilityLevel", "programme", "month", "status"]} />
      <DataTable title="District Reporting Ranking" rows={districts.slice(0, 12)} columns={["name", "reportingCompleteness", "reportingTimeliness", "records"]} />
    </>
  );
}

function ReportingStatusPage({ filters, setFilters }) {
  const sourceRows = reportingStatus2025Aggregates.filter((row) => (
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district)
  ));
  const nonReportingRows = reportingStatus2025NonReporting.filter((row) => (
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district) &&
    (filters.facilityLevel === "All" || row.facilityLevel === filters.facilityLevel)
  ));
  const totals = summarizeReportingStatus(sourceRows);
  const monthly = months.map((month) => {
    const rows = sourceRows.filter((row) => row.month === month);
    const monthTotals = summarizeReportingStatus(rows);
    return { name: month.slice(0, 3), completeness: monthTotals.completeness };
  });
  const provinceRows = summarizeReportingStatusBy(sourceRows, "province");
  const districtRows = summarizeReportingStatusBy(sourceRows, "district");
  const statusData = Object.entries(totals.statusCounts).map(([name, value]) => ({
    name,
    value,
    percent: totals.expected ? (value / totals.expected) * 100 : 0,
  }));

  return (
    <>
      <section className="source-note">
        <strong>2025 reporting status source loaded:</strong>
        <span>{reportingStatus2025Metadata.recordCount.toLocaleString()} facility status rows from {reportingStatus2025Metadata.files.length} monthly exports.</span>
        <span>{sourceRows.length.toLocaleString()} district-month rows match the current filters.</span>
      </section>
      <section className="kpi-grid">
        <KpiCard label="Reporting Completeness" value={pct(totals.completeness)} detail="Reported / expected facility reports" tone={totals.completeness >= 90 ? "good" : totals.completeness >= 80 ? "warn" : "danger"} />
        <KpiCard label="Expected Reports" value={totals.expected.toLocaleString()} detail="Facility reporting obligations" />
        <KpiCard label="Reported" value={totals.reported.toLocaleString()} detail="All statuses except non-reporting" tone="good" />
        <KpiCard label="Non-reporting" value={totals.nonReporting.toLocaleString()} detail="Facilities without report" tone={totals.nonReporting ? "danger" : "good"} />
        <KpiCard label="In Approval" value={(totals.statusCounts.IN_APPROVAL || 0).toLocaleString()} detail="Submitted, awaiting approval" tone="warn" />
        <KpiCard label="Released" value={(totals.statusCounts.RELEASED || 0).toLocaleString()} detail="Released reports" tone="good" />
      </section>
      <section className="dashboard-grid halves">
        <Panel title="Monthly Reporting Completeness" subtitle="Reporting status by period">
          <LineChart data={monthly} series={[{ key: "completeness", label: "Completeness", color: "#0d7a53" }]} />
        </Panel>
        <Panel title="Reporting Status Distribution" subtitle="Facility report workflow status">
          <Donut data={statusData} />
        </Panel>
      </section>
      <Panel title="Province Reporting Completeness" subtitle="Click a province to filter districts">
        <BarChart data={provinceRows} valueKey="reportingCompleteness" onSelect={(item) => setFilters((current) => ({ ...current, province: item.name, district: "All" }))} />
      </Panel>
      <DataTable title="District Reporting Status Summary" rows={districtRows.slice(0, 40)} columns={["name", "reportingCompleteness", "expected", "reported", "nonReporting"]} />
      <DataTable title="Non-reporting Facilities" rows={nonReportingRows.slice(0, 60)} columns={["province", "district", "facilityCode", "facility", "facilityLevel", "programme", "month", "status"]} />
    </>
  );
}

function summarizeReportingStatus(rows) {
  const expected = rows.reduce((sum, row) => sum + row.expected, 0);
  const reported = rows.reduce((sum, row) => sum + row.reported, 0);
  const nonReporting = rows.reduce((sum, row) => sum + row.nonReporting, 0);
  const statusCounts = rows.reduce((counts, row) => {
    Object.entries(row.statusCounts || {}).forEach(([status, count]) => {
      counts[status] = (counts[status] || 0) + count;
    });
    return counts;
  }, {});
  return {
    expected,
    reported,
    nonReporting,
    statusCounts,
    completeness: expected ? (reported / expected) * 100 : 0,
  };
}

function summarizeReportingStatusBy(rows, key) {
  return Object.entries(groupBy(rows, key)).map(([name, group]) => {
    const totals = summarizeReportingStatus(group);
    return {
      name,
      reportingCompleteness: totals.completeness,
      expected: totals.expected,
      reported: totals.reported,
      nonReporting: totals.nonReporting,
      records: group.length,
    };
  }).sort((a, b) => b.reportingCompleteness - a.reportingCompleteness);
}

function CommodityAvailability({ records }) {
  const commodities = summarize(records, "commodity");
  const monthly = months.map((month) => ({ name: month.slice(0, 3), availability: avg(records.filter((row) => row.month === month), "availability") }));
  return (
    <>
      <Panel title="Availability Trend" subtitle="Green >=90%, amber 80-89%, red <80%">
        <LineChart data={monthly} series={[{ key: "availability", label: "Availability", color: "#0d7a53" }]} />
      </Panel>
      <section className="dashboard-grid halves">
        <Panel title="Top 10 Commodities" subtitle="Highest average availability">
          <RankList rows={commodities.slice(0, 10)} valueKey="availability" />
        </Panel>
        <Panel title="Bottom 10 Commodities" subtitle="Lowest average availability">
          <RankList rows={[...commodities].sort((a, b) => a.availability - b.availability).slice(0, 10)} valueKey="availability" />
        </Panel>
      </section>
      <DataTable title="Availability by Commodity and Programme" rows={commodities} columns={["name", "availability", "score", "records"]} />
    </>
  );
}

function StockStatus({ records }) {
  const provinces = summarize(records, "province");
  const programmes = summarize(records, "programme");
  const monthly = months.map((month) => ({ name: month.slice(0, 3), mos: avg(records.filter((row) => row.month === month), "mos") }));
  return (
    <>
      <section className="dashboard-grid halves">
        <Panel title="Average MOS Trend" subtitle="Months of stock by month">
          <LineChart data={monthly} series={[{ key: "mos", label: "MOS", color: "#0b3a67" }]} maxValue={8} />
        </Panel>
        <Panel title="MOS Classification Distribution" subtitle="Current filtered record set">
          <Donut data={statusDistribution(records)} />
        </Panel>
      </section>
      <Panel title="MOS by Province" subtitle="Average months of stock">
        <BarChart data={provinces} valueKey="mos" maxValue={8} />
      </Panel>
      <DataTable title="Programme MOS Summary" rows={programmes} columns={["name", "mos", "stockOutRate", "availability", "records"]} />
    </>
  );
}

function StockImbalances({ records }) {
  const imbalanceCategories = [
    "ACCORDING TO PLAN(2-4 MOS)",
    "EMERGENCY LEVELS(<=0.5 MOS)",
    "OVERSTOCKED(>=12 MOS)",
    "OVERSTOCKED(4-12 MOS)",
    "STOCKED OUT",
    "UNDERSTOCKED(0.5-2 MOS)",
  ];
  const provinces = trueProvincialImbalances();
  const quarterly = trueQuarterlyImbalances();
  const distribution = imbalanceCategories.map((category) => ({
    name: category,
    value: provinces.at(-1)[category],
    percent: provinces.at(-1)[category],
  }));
  return (
    <>
      <section className="dashboard-grid halves">
        <Panel title="Stock Status Distribution" subtitle="True national imbalance distribution">
          <Donut data={distribution} />
        </Panel>
        <Panel title="Category Share" subtitle="Grand Total from source pivot">
          <RankList rows={distribution} valueKey="percent" />
        </Panel>
      </section>
      <Panel title="Stacked Province Comparison" subtitle="True stock status percentage by province">
        <StackedBars data={provinces} keys={imbalanceCategories} normalize />
      </Panel>
      <DataTable title="Provincial Imbalance Percentages" rows={provinces} columns={["name", ...imbalanceCategories]} />
      <Panel title="Quarterly Imbalance Trend" subtitle="True Q1-Q4 imbalance percentages from the source chart">
        <StackedBars data={quarterly} keys={imbalanceCategories} normalize />
      </Panel>
      <DataTable title="Quarterly Imbalance Percentages" rows={quarterly} columns={["name", ...imbalanceCategories, "basis"]} />
    </>
  );
}

function trueProvincialImbalances() {
  const rows = [
    ["Central Province", 21.7, 8.1, 11.1, 22.2, 10.5, 26.3],
    ["Copperbelt Province", 18.1, 13.4, 7.8, 15.7, 17.5, 27.4],
    ["Eastern Province", 21.2, 11.3, 7.2, 17.4, 11.7, 31.1],
    ["Luapula Province", 17.8, 10.8, 9.5, 17.5, 18.0, 26.5],
    ["Lusaka Province", 15.8, 11.7, 9.1, 17.2, 22.1, 24.1],
    ["Muchinga Province", 19.4, 9.3, 10.1, 20.6, 17.7, 22.9],
    ["Northern Province", 14.9, 13.6, 9.4, 17.1, 18.9, 26.0],
    ["North-Western Province", 18.7, 8.2, 14.4, 21.5, 15.4, 21.8],
    ["Southern Province", 17.5, 13.2, 9.3, 17.5, 16.5, 26.0],
    ["Western Province", 17.7, 9.7, 12.8, 20.6, 17.8, 21.5],
    ["Grand Total", 18.3, 11.2, 9.9, 18.5, 16.4, 25.8],
  ];
  return rows.map(([name, according, emergency, over12, over4to12, stockedOut, understocked]) => ({
    name,
    "ACCORDING TO PLAN(2-4 MOS)": according,
    "EMERGENCY LEVELS(<=0.5 MOS)": emergency,
    "OVERSTOCKED(>=12 MOS)": over12,
    "OVERSTOCKED(4-12 MOS)": over4to12,
    "STOCKED OUT": stockedOut,
    "UNDERSTOCKED(0.5-2 MOS)": understocked,
  }));
}

function trueQuarterlyImbalances() {
  const rows = [
    ["Q1", 7.24, 4.02, 3.95, 7.45, 5.38, 9.84, "Actual"],
    ["Q2", 7.60, 4.54, 4.39, 7.72, 6.04, 10.49, "Actual"],
    ["Q3", 3.85, 2.43, 2.33, 3.84, 3.18, 5.71, "Actual"],
    ["Q4", 2.84, 2.07, 1.94, 2.73, 2.67, 4.55, "Actual"],
    ["Grand Total", 18.69, 10.99, 10.67, 19.01, 14.60, 26.04, "Overall"],
  ];
  return rows.map(([name, according, emergency, over12, over4to12, stockedOut, understocked, basis]) => ({
    name,
    "ACCORDING TO PLAN(2-4 MOS)": according,
    "EMERGENCY LEVELS(<=0.5 MOS)": emergency,
    "OVERSTOCKED(>=12 MOS)": over12,
    "OVERSTOCKED(4-12 MOS)": over4to12,
    "STOCKED OUT": stockedOut,
    "UNDERSTOCKED(0.5-2 MOS)": understocked,
    basis,
  }));
}

function ConsumptionTrends({ records, filters, setFilters }) {
  const [compare, setCompare] = useState([]);
  const baseCommodity = filters.commodity === "All" ? unique(mockRecords, "commodity")[0] : filters.commodity;
  const selected = Array.from(new Set([baseCommodity, ...compare])).slice(0, 4);
  const data = months.map((month) => {
    const row = { name: month.slice(0, 3) };
    selected.forEach((commodity) => {
      row[commodity] = avg(records.filter((item) => item.month === month && item.commodity === commodity), "amc");
    });
    return row;
  });
  return (
    <>
      <Panel title="Commodity Search and Comparison" subtitle="Select a commodity in the global filter, then add comparison items">
        <div className="compare-row">
          {unique(mockRecords, "commodity").map((commodity) => (
            <button key={commodity} className={selected.includes(commodity) ? "chip active" : "chip"} onClick={() => {
              if (commodity === baseCommodity) setFilters((current) => ({ ...current, commodity }));
              setCompare((current) => current.includes(commodity) ? current.filter((item) => item !== commodity) : [...current, commodity]);
            }}>{commodity}</button>
          ))}
        </div>
      </Panel>
      <Panel title="Adjusted Consumption / AMC Trend" subtitle={selected.join(" vs ")}>
        <LineChart data={data} series={selected.map((commodity, index) => ({ key: commodity, label: commodity, color: ["#0b3a67", "#0d7a53", "#c58a00", "#b83232"][index] }))} maxValue={Math.max(1000, ...data.flatMap((row) => selected.map((key) => row[key] || 0))) * 1.15} />
      </Panel>
      <DataTable title="Monthly AMC Table" rows={data} columns={["name", ...selected]} />
    </>
  );
}

function OrderFillRatePage({ filters, setFilters }) {
  const sourceRows = orderFillRate2025Aggregates.filter((row) => (
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district)
  ));
  const officialSummary = orderFillSummary(filters.month);
  const lowFillItems = orderFillRate2025LowFillItems.filter((row) => (
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district) &&
    (filters.programme === "All" || row.programme === filters.programme) &&
    (filters.commodity === "All" || row.productName === filters.commodity)
  ));
  const zeroFillItems = sourceRows.reduce((sum, row) => sum + row.zeroFillItems, 0);
  const lineItems = sourceRows.reduce((sum, row) => sum + row.lineItems, 0);
  const overFilledItems = sourceRows.reduce((sum, row) => sum + row.overFilledItems, 0);
  const monthly = orderFillRate2025MonthlySummary.map((row) => ({ name: row.month.slice(0, 3), fillRate: row.orderFillRate }));
  const provinceRows = summarizeOrderFill(sourceRows, "province");
  const districtRows = summarizeOrderFill(sourceRows, "district");

  return (
    <>
      <section className="source-note">
        <strong>2025 order fill-rate source loaded:</strong>
        <span>Official screenshot totals loaded for {officialSummary.rows.length} month(s): {officialSummary.shippedProducts.toLocaleString()} shipped out of {officialSummary.approvedProducts.toLocaleString()} approved.</span>
        <span>{orderFillRate2025Metadata.recordCount.toLocaleString()} exported product lines remain available for drilldown.</span>
      </section>
      <section className="kpi-grid">
        <KpiCard label="Order Fill Rate" value={pct2(officialSummary.orderFillRate)} detail="Products shipped / approved" tone={officialSummary.orderFillRate >= 80 ? "good" : officialSummary.orderFillRate >= 50 ? "warn" : "danger"} />
        <KpiCard label="Products Approved" value={officialSummary.approvedProducts.toLocaleString()} detail="Official source total" />
        <KpiCard label="Products Shipped" value={officialSummary.shippedProducts.toLocaleString()} detail="Official source total" />
        <KpiCard label="Zero-fill Lines" value={zeroFillItems.toLocaleString()} detail={`${lineItems.toLocaleString()} total line items`} tone={zeroFillItems ? "danger" : "good"} />
        <KpiCard label="Over-filled Lines" value={overFilledItems.toLocaleString()} detail="Shipped above ordered quantity" tone="warn" />
        <KpiCard label="Facilities Covered" value={orderFillRate2025Metadata.facilityCount.toLocaleString()} detail={`${orderFillRate2025Metadata.productCount} products`} />
      </section>
      <section className="dashboard-grid halves">
        <Panel title="Monthly Order Fill Rate" subtitle="Official percentage from screenshot summaries">
          <LineChart data={monthly} series={[{ key: "fillRate", label: "Fill rate", color: "#0b3a67" }]} maxValue={2} />
        </Panel>
        <Panel title="Province Ranking" subtitle="Click a province to filter">
          <BarChart data={provinceRows} valueKey="orderFillRate" onSelect={(item) => setFilters((current) => ({ ...current, province: item.name, district: "All" }))} />
        </Panel>
      </section>
      <Panel title="District Order Fill Rate" subtitle="District-month aggregates from order fill-rate exports">
        <BarChart data={districtRows} valueKey="orderFillRate" />
      </Panel>
      <DataTable title="Low Fill Product Lines" rows={lowFillItems.slice(0, 50)} columns={["province", "district", "facility", "productCode", "productName", "orderedQuantity", "shippedQuantity", "itemFillRate"]} />
    </>
  );
}

function summarizeOrderFill(rows, key) {
  return Object.entries(groupBy(rows, key)).map(([name, group]) => {
    const ordered = group.reduce((sum, row) => sum + row.orderedQuantity, 0);
    const shipped = group.reduce((sum, row) => sum + row.shippedQuantity, 0);
    return {
      name,
      orderFillRate: ordered ? Math.min(100, (shipped / ordered) * 100) : 0,
      orderedQuantity: ordered,
      shippedQuantity: shipped,
      lineItems: group.reduce((sum, row) => sum + row.lineItems, 0),
      zeroFillItems: group.reduce((sum, row) => sum + row.zeroFillItems, 0),
    };
  }).sort((a, b) => b.orderFillRate - a.orderFillRate);
}

function ProvincialPerformance({ records, setFilters }) {
  const rows = summarize(records, "province");
  return (
    <>
      <Panel title="Composite Provincial Score" subtitle="Reporting, availability, MOS adequacy, and stock-out performance">
        <BarChart data={rows} valueKey="score" onSelect={(item) => setFilters((current) => ({ ...current, province: item.name, district: "All" }))} />
      </Panel>
      <section className="scorecard-grid">
        {rows.map((row) => <Scorecard key={row.name} row={row} />)}
      </section>
      <DataTable title="Province Ranking" rows={rows} columns={["name", "score", "reportingCompleteness", "reportingTimeliness", "availability", "mos", "stockOutRate"]} />
    </>
  );
}

function ProgrammePerformance({ records, filters }) {
  const rows = summarize(records, "programme");
  const officialOrderFill = orderFillSummary(filters.month);
  const lowFillItems = orderFillRate2025LowFillItems.filter((row) => (
    (filters.month === "All" || row.month === filters.month) &&
    (filters.province === "All" || row.province === filters.province) &&
    (filters.district === "All" || row.district === filters.district) &&
    (filters.programme === "All" || row.programme === filters.programme) &&
    (filters.commodity === "All" || row.productName === filters.commodity)
  )).slice(0, 20);
  return (
    <>
      <section className="source-note">
        <strong>2025 order fill-rate source loaded:</strong>
        <span>{orderFillRate2025Metadata.recordCount.toLocaleString()} order lines from {orderFillRate2025Metadata.files.length} monthly exports, covering {orderFillRate2025Metadata.facilityCount} facilities and {orderFillRate2025Metadata.productCount} products.</span>
        <span>Official order fill rate: {pct2(officialOrderFill.orderFillRate)} from {officialOrderFill.shippedProducts.toLocaleString()} shipped out of {officialOrderFill.approvedProducts.toLocaleString()} approved.</span>
      </section>
      <Panel title="Programme Composite Score" subtitle="Programme comparison across core supply chain indicators">
        <BarChart data={rows} valueKey="score" />
      </Panel>
      <DataTable title="Programme Performance Matrix" rows={rows} columns={["name", "availability", "mos", "stockOutRate", "orderFillRate", "amc", "reportingCompleteness", "reportingTimeliness"]} />
      <DataTable title="Low Order Fill Items from Source Data" rows={lowFillItems} columns={["province", "district", "facility", "productCode", "productName", "orderedQuantity", "shippedQuantity", "itemFillRate"]} />
    </>
  );
}

function FacilityLevelAnalysis({ records }) {
  const rows = summarize(records, "facilityLevel");
  const facilities = summarize(records, "facility").slice(0, 20);
  return (
    <>
      <Panel title="Performance by Facility Level" subtitle="Health posts through specialized hospitals">
        <BarChart data={rows} valueKey="score" />
      </Panel>
      <DataTable title="Facility Drilldown" rows={facilities} columns={["name", "score", "availability", "mos", "stockOutRate", "records"]} />
    </>
  );
}

function DataQuality({ records }) {
  const flagged = records.filter((row) => row.missingReport || row.duplicateRecord || row.incompleteData || row.outlier || row.irregularReporting);
  const provinceQuality = summarize(records, "province").map((row) => {
    const issues = records.filter((record) => record.province === row.name && (record.missingReport || record.duplicateRecord || record.incompleteData || record.outlier || record.irregularReporting)).length;
    return { ...row, dataQualityScore: Math.max(0, 100 - (issues / row.records) * 100) };
  }).sort((a, b) => b.dataQualityScore - a.dataQualityScore);
  return (
    <>
      <section className="kpi-grid">
        <KpiCard label="Flagged Records" value={flagged.length.toLocaleString()} detail="Missing, duplicate, incomplete, outlier, or irregular" tone={flagged.length ? "warn" : "good"} />
        <KpiCard label="Data Quality Score" value={pct(avg(provinceQuality, "dataQualityScore"))} detail="Province-weighted quality score" tone="good" />
        <KpiCard label="Outliers" value={records.filter((row) => row.outlier).length} detail="AMC or MOS anomalies" tone="warn" />
        <KpiCard label="Duplicate Records" value={records.filter((row) => row.duplicateRecord).length} detail="Potential duplicate submissions" />
      </section>
      <Panel title="Data Quality by Province" subtitle="Higher scores indicate fewer flagged records">
        <BarChart data={provinceQuality} valueKey="dataQualityScore" />
      </Panel>
      <DataTable title="Flagged Records" rows={flagged.slice(0, 50)} columns={["province", "district", "facility", "month", "commodity", "missingReport", "duplicateRecord", "incompleteData", "outlier", "irregularReporting"]} />
    </>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function InsightBox({ title, text }) {
  return (
    <aside className="insight-box">
      <span className="eyebrow">AI-ready narrative</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </aside>
  );
}

function LineChart({ data, series, maxValue = 100 }) {
  const width = 760;
  const height = 250;
  const pad = 32;
  const x = (index) => pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1);
  const y = (value) => height - pad - (Math.max(0, value) / maxValue) * (height - pad * 2);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {[0, 25, 50, 75, 100].map((tick) => <line key={tick} x1={pad} x2={width - pad} y1={y((tick / 100) * maxValue)} y2={y((tick / 100) * maxValue)} className="grid-line" />)}
        {series.map((item) => {
          const points = data.map((row, index) => `${x(index)},${y(row[item.key] || 0)}`).join(" ");
          return <polyline key={item.key} points={points} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {data.map((row, index) => <text key={row.name} x={x(index)} y={height - 8} textAnchor="middle" className="axis-label">{row.name}</text>)}
      </svg>
      <div className="legend">{series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div>
    </div>
  );
}

function BarChart({ data, valueKey, maxValue = 100, onSelect }) {
  const top = data.slice(0, 12);
  const max = Math.max(maxValue, ...top.map((row) => row[valueKey] || 0));
  return (
    <div className="bar-chart">
      {top.map((row) => (
        <button key={row.name} className="bar-row" onClick={() => onSelect?.(row)}>
          <span>{row.name}</span>
          <div className="bar-track"><div className={toneClass(row[valueKey])} style={{ width: `${Math.max(3, ((row[valueKey] || 0) / max) * 100)}%` }} /></div>
          <strong>{valueKey === "mos" ? oneDec(row[valueKey]) : valueKey === "orderFillRate" ? pct2(row[valueKey]) : pct(row[valueKey])}</strong>
        </button>
      ))}
    </div>
  );
}

function StackedBars({ data, keys, normalize = false }) {
  return (
    <div className="stacked-bars">
      {data.map((row) => (
        <div className="stacked-row" key={row.name}>
          <span>{row.name}</span>
          <div className="stack">
            {keys.map((key) => {
              const total = keys.reduce((sum, item) => sum + (row[item] || 0), 0) || 1;
              const width = normalize ? ((row[key] || 0) / total) * 100 : row[key] || 0;
              return <i key={key} style={{ width: `${width}%`, background: statusColor(key) }} title={`${key}: ${oneDec(row[key] || 0)}%`} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ data, keys }) {
  return (
    <div className="heatmap">
      {data.slice(0, 10).map((row) => (
        <React.Fragment key={row.name}>
          <strong>{row.name}</strong>
          {keys.map((key) => <span key={key} style={{ background: `rgba(13, 122, 83, ${Math.max(0.18, (row[key] || 0) / 100)})` }}>{pct(row[key])}</span>)}
        </React.Fragment>
      ))}
    </div>
  );
}

function Donut({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;
  const gradients = data.map((item) => {
    const start = offset;
    const size = (item.value / total) * 100;
    offset += size;
    return `${statusColor(item.name)} ${start}% ${offset}%`;
  }).join(", ");
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${gradients})` }}><span>{total}</span></div>
      <div className="donut-legend">{data.map((item) => <span key={item.name}><i style={{ background: statusColor(item.name) }} />{item.name} {pct(item.percent)}</span>)}</div>
    </div>
  );
}

function RankList({ rows, valueKey }) {
  return (
    <ol className="rank-list">
      {rows.map((row) => <li key={row.name}><span>{row.name}</span><strong>{valueKey === "mos" ? oneDec(row[valueKey]) : pct(row[valueKey])}</strong></li>)}
    </ol>
  );
}

function Scorecard({ row }) {
  return (
    <article className="scorecard">
      <div>
        <h3>{row.name}</h3>
        <span>{row.records} records</span>
      </div>
      <strong>{pct(row.score)}</strong>
      <p>Availability {pct(row.availability)} | Stock-out {pct(row.stockOutRate)}</p>
    </article>
  );
}

function DataTable({ title, rows, columns }) {
  return (
    <Panel title={title} subtitle={`${rows.length} rows shown`}>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{labelize(column)}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.name || row.facility || row.province}-${index}`}>
                {columns.map((column) => <td key={column}>{formatCell(row[column], column)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function labelize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function formatCell(value, column) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (stockStatuses.includes(column) || column.includes("MOS") || column === "STOCKED OUT") return pct(value);
  if (typeof value === "number") return value > 12 ? Math.round(value).toLocaleString() : oneDec(value);
  return value ?? "N/A";
}

function toneClass(value) {
  if (value >= 90) return "bar-fill good-fill";
  if (value >= 80) return "bar-fill warn-fill";
  return "bar-fill danger-fill";
}

function statusColor(status) {
  return {
    "According to Plan": "#0d7a53",
    Understock: "#c58a00",
    Emergency: "#e35d2f",
    "Stock-out": "#b83232",
    Overstock: "#3478a6",
    Excess: "#6b7280",
    "ACCORDING TO PLAN(2-4 MOS)": "#41cf55",
    "OVERSTOCKED(>=12 MOS)": "#f2f500",
    "OVERSTOCKED(4-12 MOS)": "#cc62c9",
    "EMERGENCY LEVELS(<=0.5 MOS)": "#72bce4",
    "UNDERSTOCKED(0.5-2 MOS)": "#f4c0a6",
    "STOCKED OUT": "#ff0000",
  }[status] || "#0b3a67";
}

createRoot(document.getElementById("root")).render(<App />);
