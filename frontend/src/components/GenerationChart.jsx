import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from 'recharts';
import { Calendar, Eye } from 'lucide-react';

export default function GenerationChart({ records, onSelectPeriod, onQuickFilter }) {
  const [showBrush, setShowBrush] = useState(false);

  if (!records || records.length === 0) {
    return (
      <div className="chart-card">
        <div className="loading-container">
          <p>No generation records found for selected criteria.</p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = records.map((r, idx) => {
    const dt = new Date(r.startTime);
    const dateStr = dt.toISOString().slice(5, 10); // MM-DD
    const timeStr = dt.toISOString().slice(11, 16); // HH:MM
    return {
      index: idx,
      rawStartTime: r.startTime,
      timeLabel: `${dateStr} ${timeStr}`,
      dateOnly: r.settlementDate,
      settlementPeriod: r.settlementPeriod,
      actual: r.actualGeneration,
      forecast: r.forecastGeneration,
      error: r.error,
      leadTimeHours: r.leadTimeHours,
      publishTime: r.publishTime,
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOver = data.error > 0;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-time">
            {data.rawStartTime.replace('T', ' ').replace('Z', ' UTC')} (SP {data.settlementPeriod})
          </div>
          <div className="tooltip-row">
            <span style={{ color: '#10b981' }}>● Actual Generation:</span>
            <strong>{data.actual?.toLocaleString()} MW</strong>
          </div>
          <div className="tooltip-row">
            <span style={{ color: '#38bdf8' }}>● Day-Ahead Forecast:</span>
            <strong>{data.forecast?.toLocaleString()} MW</strong>
          </div>
          <div className="tooltip-row">
            <span style={{ color: isOver ? '#fbbf24' : '#818cf8' }}>
              ● Signed Error (F - A):
            </span>
            <strong style={{ color: isOver ? '#fbbf24' : '#818cf8' }}>
              {data.error > 0 ? `+${data.error?.toLocaleString()}` : data.error?.toLocaleString()} MW
            </strong>
          </div>
          <div className="tooltip-row" style={{ marginTop: '0.4rem', borderTop: '1px solid #334155', paddingTop: '0.3rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            <span>Forecast Published:</span>
            <span>{data.publishTime?.slice(11, 16)} UTC (D-1)</span>
          </div>
          <div className="tooltip-row" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            <span>Lead Time:</span>
            <span>{data.leadTimeHours} hrs ahead</span>
          </div>
          {onSelectPeriod && (
            <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
              <button
                className="filter-btn"
                style={{ width: '100%', fontSize: '0.75rem', background: '#0284c7', color: '#fff' }}
                onClick={() => onSelectPeriod(data.rawStartTime)}
              >
                Inspect Forecast Revisions
              </button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-area">
          <div className="chart-title">Day-Ahead Wind Forecast vs Actual Generation (Outturn)</div>
          <div className="chart-subtitle">
            National Grid GB transmission system (Elexon BMRS WINDFOR & FUELHH) • {records.length} periods
          </div>
        </div>

        <div className="quick-filters">
          <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginRight: '0.25rem' }}>Presets:</span>
          <button className="filter-btn" onClick={() => onQuickFilter('2026-01-01', '2026-01-31')}>
            Full Month
          </button>
          <button className="filter-btn" onClick={() => onQuickFilter('2026-01-01', '2026-01-07')}>
            Week 1
          </button>
          <button className="filter-btn" onClick={() => onQuickFilter('2026-01-08', '2026-01-14')}>
            Week 2
          </button>
          <button className="filter-btn" onClick={() => onQuickFilter('2026-01-15', '2026-01-21')}>
            Week 3
          </button>
          <button className="filter-btn" onClick={() => onQuickFilter('2026-01-22', '2026-01-31')}>
            Week 4
          </button>
          <button
            className={`filter-btn ${showBrush ? 'active' : ''}`}
            onClick={() => setShowBrush(!showBrush)}
            title="Toggle time-scrubber slider"
          >
            Slider Zoom
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              interval={records.length > 300 ? Math.floor(records.length / 14) : Math.floor(records.length / 8)}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '0.85rem' }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual Outturn (FUELHH)"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#actualGradient)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Day-Ahead Forecast (WINDFOR)"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
            />
            {showBrush && (
              <Brush
                dataKey="timeLabel"
                height={28}
                stroke="#38bdf8"
                fill="#111827"
                travellerWidth={10}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
