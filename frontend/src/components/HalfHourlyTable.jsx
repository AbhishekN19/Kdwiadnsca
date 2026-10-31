import React, { useState } from 'react';
import { Search, History, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function HalfHourlyTable({ records, onSelectPeriod }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'over', 'under', 'severe' (>1000 MW error)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  if (!records || records.length === 0) return null;

  // Filter
  const filtered = records.filter((r) => {
    const matchesSearch =
      r.startTime.toLowerCase().includes(search.toLowerCase()) ||
      r.settlementDate.includes(search) ||
      (r.settlementPeriod && String(r.settlementPeriod).includes(search));

    if (!matchesSearch) return false;

    if (filterType === 'over') return r.error > 0;
    if (filterType === 'under') return r.error < 0;
    if (filterType === 'severe') return Math.abs(r.error) >= 1500;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-area">
          <div className="chart-title">Half-Hourly Settlement Records & Error Audit</div>
          <div className="chart-subtitle">
            Showing {filtered.length} matched periods • Audited against Day-Ahead decision cutoff
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            />
            <input
              type="text"
              placeholder="Search date or period..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.75rem 0.35rem 2rem',
                borderRadius: '6px',
                border: '1px solid #283548',
                background: '#1f293d',
                color: '#fff',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div className="quick-filters">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
            >
              All ({records.length})
            </button>
            <button
              className={`filter-btn ${filterType === 'severe' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('severe');
                setCurrentPage(1);
              }}
              title="Absolute error >= 1,500 MW"
            >
              High Error (&ge;1.5k MW)
            </button>
            <button
              className={`filter-btn ${filterType === 'over' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('over');
                setCurrentPage(1);
              }}
            >
              Overestimated (F &gt; A)
            </button>
            <button
              className={`filter-btn ${filterType === 'under' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('under');
                setCurrentPage(1);
              }}
            >
              Underestimated (F &lt; A)
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Delivery Start (UTC)</th>
              <th>Period</th>
              <th>Actual Outturn</th>
              <th>Day-Ahead Forecast</th>
              <th>Signed Error</th>
              <th>Lead Time</th>
              <th>Published At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, idx) => {
              const isOver = r.error > 0;
              return (
                <tr key={idx}>
                  <td>
                    <strong>{r.startTime.replace('T', ' ').replace('Z', '')}</strong>
                  </td>
                  <td>SP {r.settlementPeriod}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>
                    {r.actualGeneration?.toLocaleString()} MW
                  </td>
                  <td style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {r.forecastGeneration?.toLocaleString()} MW
                  </td>
                  <td>
                    <span className={`badge ${isOver ? 'badge-overestimate' : 'badge-underestimate'}`}>
                      {isOver ? `+${r.error?.toLocaleString()}` : r.error?.toLocaleString()} MW
                    </span>
                  </td>
                  <td>{r.leadTimeHours} hrs</td>
                  <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                    {r.publishTime?.replace('T', ' ').replace('Z', '')}
                  </td>
                  <td>
                    <button
                      className="filter-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                      onClick={() => onSelectPeriod(r.startTime)}
                      title="Inspect all forecast revisions published by National Grid for this period"
                    >
                      <History size={12} /> Revisions
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          fontSize: '0.85rem',
          color: '#9ca3af',
        }}
      >
        <div>
          Page {currentPage} of {totalPages}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="filter-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            className="filter-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
