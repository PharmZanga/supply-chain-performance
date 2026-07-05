import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { mockRecords, months, navItems, stockStatuses } from "./mockSupplyChainData";
import "./styles.css";

const pct = (value) => `${Math.round(value)}%`;
const oneDec = (value) => Number(value).toFixed(1);
const avg = (items, key) => (items.length ? items.reduce((sum, row) => sum + row[key], 0) / items.length : 0);

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
          <div>
            <p className="eyebrow">National dashboard | 2025</p>
            <h2>{activePage}</h2>
          </div>
          <div className="topbar-metrics">
            <span>{records.length.toLocaleString()} records</span>
            <span>{pct(avg(records, "availability"))} availability</span>
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
        {activePage === "Commodity Availability" && <CommodityAvailability {...props} />}
        {activePage === "Stock Status / MOS" && <StockStatus {...props} />}
        {activePage === "Stock Imbalances" && <StockImbalances {...props} />}
        {activePage === "AMC / Consumption Trends" && <ConsumptionTrends {...props} />}
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
  return (
    <section className="kpi-grid">
      <KpiCard label="Reporting Completeness" value={pct(avg(records, "reportingCompleteness"))} detail="National average" tone="good" />
      <KpiCard label="Reporting Timeliness" value={pct(avg(records, "reportingTimeliness"))} detail="Submitted on schedule" tone="good" />
      <KpiCard label="Commodity Availability" value={pct(avg(records, "availability"))} detail="Tracer items available" tone={avg(records, "availability") >= 90 ? "good" : "warn"} />
      <KpiCard label="Average MOS" value={oneDec(avg(records, "mos"))} detail="Months of stock" />
      <KpiCard label="Stock-out Rate" value={pct(avg(records, "stockOutRate"))} detail="Facilities with zero balance" tone={avg(records, "stockOutRate") > 10 ? "danger" : "good"} />
      <KpiCard label="Order Fill Rate" value={pct(avg(records, "orderFillRate"))} detail="Where order data exists" />
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

function ReportingPerformance({ records, setFilters }) {
  const monthly = months.map((month) => ({ name: month.slice(0, 3), completeness: avg(records.filter((row) => row.month === month), "reportingCompleteness"), timeliness: avg(records.filter((row) => row.month === month), "reportingTimeliness") }));
  const provinces = summarize(records, "province");
  const districts = summarize(records, "district");
  const irregular = records.filter((row) => row.reportingCompleteness < 80 || row.reportingTimeliness < 75).slice(0, 12);
  return (
    <>
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
      <DataTable title="Non-reporting or Irregular Reporting Facilities" rows={irregular} columns={["province", "district", "facility", "facilityLevel", "month", "reportingCompleteness", "reportingTimeliness"]} />
      <DataTable title="District Reporting Ranking" rows={districts.slice(0, 12)} columns={["name", "reportingCompleteness", "reportingTimeliness", "records"]} />
    </>
  );
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
  const distribution = statusDistribution(records);
  const provinces = Object.entries(groupBy(records, "province")).map(([name, rows]) => ({ name, ...Object.fromEntries(statusDistribution(rows).map((item) => [item.name, item.percent])) }));
  return (
    <>
      <section className="dashboard-grid halves">
        <Panel title="Stock Status Distribution" subtitle="Percentage of stock balance categories">
          <Donut data={distribution} />
        </Panel>
        <Panel title="Category Share" subtitle="Filtered comparison">
          <RankList rows={distribution} valueKey="percent" />
        </Panel>
      </section>
      <Panel title="Stacked Province Comparison" subtitle="Stock status percentage by province">
        <StackedBars data={provinces} keys={stockStatuses} />
      </Panel>
    </>
  );
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

function ProgrammePerformance({ records }) {
  const rows = summarize(records, "programme");
  return (
    <>
      <Panel title="Programme Composite Score" subtitle="Programme comparison across core supply chain indicators">
        <BarChart data={rows} valueKey="score" />
      </Panel>
      <DataTable title="Programme Performance Matrix" rows={rows} columns={["name", "availability", "mos", "stockOutRate", "amc", "reportingCompleteness", "reportingTimeliness"]} />
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
          <strong>{valueKey === "mos" ? oneDec(row[valueKey]) : pct(row[valueKey])}</strong>
        </button>
      ))}
    </div>
  );
}

function StackedBars({ data, keys }) {
  return (
    <div className="stacked-bars">
      {data.map((row) => (
        <div className="stacked-row" key={row.name}>
          <span>{row.name}</span>
          <div className="stack">
            {keys.map((key) => <i key={key} className={`status-${key.toLowerCase().replaceAll(" ", "-")}`} style={{ width: `${row[key] || 0}%` }} title={`${key}: ${oneDec(row[key] || 0)}%`} />)}
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
                {columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}
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

function formatCell(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
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
  }[status] || "#0b3a67";
}

createRoot(document.getElementById("root")).render(<App />);
