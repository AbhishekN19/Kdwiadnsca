import React from 'react';
import { Wind, Clock, Download, Settings, Calendar, Layers } from 'lucide-react';

export default function Navbar({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  cutoffMode,
  alignmentMode,
  setAlignmentMode,
  onOpenCutoffModal,
  onExportCsv,
}) {
  const cutoffLabels = {
    d_minus_1_1200: 'D-1 12:00 UTC (Day-Ahead Auction)',
    d_minus_1_1700: 'D-1 17:00 UTC (Afternoon Planning)',
    d_minus_1_2359: 'D-1 23:59 UTC (Midnight Cutoff)',
    intraday_latest: 'Intraday (Latest Pre-Delivery)',
    custom: 'Custom Cutoff',
  };

  return (
    <header className="header-bar">
      <div className="brand-section">
        <div className="brand-icon">
          <Wind size={22} />
        </div>
        <div>
          <div className="brand-title">UK Wind Generation Monitor</div>
          <div className="brand-subtitle">
            National Grid Day-Ahead Forecast & Outturn Accuracy Platform (Elexon BMRS)
          </div>
        </div>
      </div>

      <div className="controls-bar">
        {/* Date Selector */}
        <div className="control-pill" title="Filter delivery date range">
          <Calendar size={15} className="text-sky-400" />
          <input
            type="date"
            value={dateFrom}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
          />
          <span style={{ color: '#6b7280' }}>→</span>
          <input
            type="date"
            value={dateTo}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => setDateTo(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>

        {/* Cutoff Settings Button */}
        <button
          className="control-pill"
          onClick={onOpenCutoffModal}
          title="Configure Day-Ahead Decision Cutoff"
        >
          <Clock size={15} style={{ color: '#38bdf8' }} />
          <span>Cutoff: <strong>{cutoffLabels[cutoffMode] || cutoffMode}</strong></span>
          <Settings size={13} style={{ color: '#9ca3af', marginLeft: '2px' }} />
        </button>

        {/* Alignment Mode Toggle */}
        <button
          className="control-pill"
          onClick={() =>
            setAlignmentMode(alignmentMode === 'block_hourly' ? 'exact' : 'block_hourly')
          }
          title="Toggle between all 48 Half-Hour Settlement Periods vs 24 Hourly Exact Points"
        >
          <Layers size={15} style={{ color: '#10b981' }} />
          <span>
            {alignmentMode === 'block_hourly' ? '48 Periods (Half-Hourly)' : '24 Periods (Hourly Exact)'}
          </span>
        </button>

        {/* Export CSV */}
        <button
          className="control-pill"
          onClick={onExportCsv}
          title="Export current matched dataset to CSV for Excel / Trading Models"
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>
    </header>
  );
}
