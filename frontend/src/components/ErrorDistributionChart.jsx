import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

export default function ErrorDistributionChart({ records, distribution }) {
  const [activeTab, setActiveTab] = useState('timeseries'); // 'timeseries' or 'histogram'

  // Prepare timeseries error data
  const errorSeries = (records || []).map((r, idx) => {
    const dt = new Date(r.startTime);
    const dateStr = dt.toISOString().slice(5, 10);
    const timeStr = dt.toISOString().slice(11, 16);
    return {
      index: idx,
      timeLabel: `${dateStr} ${timeStr}`,
      error: r.error,
      actual: r.actualGeneration,
      forecast: r.forecastGeneration,
      settlementPeriod: r.settlementPeriod,
    };
  });

  const CustomTimeSeriesTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOver = data.error > 0;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-time">{data.timeLabel} (SP {data.settlementPeriod})</div>
          <div className="tooltip-row">
            <span>Signed Error:</span>
            <strong style={{ color: isOver ? '#fbbf24' : '#818cf8' }}>
              {isOver ? `+${data.error?.toLocaleString()}` : data.error?.toLocaleString()} MW
            </strong>
          </div>
          <div className="tooltip-row" style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            <span>Forecast: {data.forecast?.toLocaleString()} MW</span>
            <span>Actual: {data.actual?.toLocaleString()} MW</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomHistogramTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-time">Error Range: {data.rangeLabel}</div>
          <div className="tooltip-row">
            <span>Period Count:</span>
            <strong>{data.count} periods</strong>
          </div>
          <div className="tooltip-row">
            <span>Percentage:</span>
            <strong>{data.percentage}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-area">
          <div className="chart-title">
            {activeTab === 'timeseries'
              ? 'Signed Forecast Error Over Time (Forecast − Actual)'
              : 'Forecast Error Frequency Distribution (MW)'}
          </div>
          <div className="chart-subtitle">
            {activeTab === 'timeseries'
              ? 'Amber = Overestimation (Procurement Shortfall Risk) • Purple = Underestimation (Generation Surplus)'
              : 'Statistical spread of forecast deviations across selected delivery periods'}
          </div>
        </div>

        <div className="quick-filters">
          <button
            className={`filter-btn ${activeTab === 'timeseries' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeseries')}
          >
            Error Timeline
          </button>
          <button
            className={`filter-btn ${activeTab === 'histogram' ? 'active' : ''}`}
            onClick={() => setActiveTab('histogram')}
          >
            Histogram Distribution
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'timeseries' ? (
            <BarChart data={errorSeries} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                interval={errorSeries.length > 300 ? Math.floor(errorSeries.length / 12) : Math.floor(errorSeries.length / 6)}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k MW`}
              />
              <Tooltip content={<CustomTimeSeriesTooltip />} />
              <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1.5} />
              <Bar dataKey="error" name="Signed Error (MW)">
                {errorSeries.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.error >= 0 ? '#f59e0b' : '#818cf8'}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={distribution || []} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis dataKey="rangeLabel" stroke="#6b7280" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomHistogramTooltip />} />
              <Bar dataKey="percentage" name="% of Periods">
                {(distribution || []).map((entry, index) => {
                  const isNegative = entry.maxMW <= 0;
                  return (
                    <Cell
                      key={`hist-${index}`}
                      fill={isNegative ? '#818cf8' : '#f59e0b'}
                      opacity={0.9}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
