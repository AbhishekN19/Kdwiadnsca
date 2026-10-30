import React, { useState } from 'react';
import { ArrowUpDown, Eye, Calendar } from 'lucide-react';

export default function DailyAccuracyTable({ dailyData, onInspectDate }) {
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  if (!dailyData || dailyData.length === 0) return null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedList = [...dailyData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-area">
          <div className="chart-title">Daily Forecast Accuracy Leaderboard (January 2026)</div>
          <div className="chart-subtitle">
            Rank and evaluate accuracy across all 31 days • Click any day to zoom into its 48 settlement periods
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                Delivery Date <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('mae')} style={{ cursor: 'pointer' }}>
                MAE (MW) <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('nmae')} style={{ cursor: 'pointer' }}>
                NMAE (%) <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('rmse')} style={{ cursor: 'pointer' }}>
                RMSE (MW) <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('mbe')} style={{ cursor: 'pointer' }}>
                MBE (MW Bias) <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('avgActual')} style={{ cursor: 'pointer' }}>
                Avg Actual <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('avgForecast')} style={{ cursor: 'pointer' }}>
                Avg Forecast <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map((day) => {
              const isOver = day.mbe > 0;
              return (
                <tr key={day.date}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Calendar size={14} style={{ color: '#38bdf8' }} />
                      <span>{day.date}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{day.mae?.toLocaleString()}</strong> MW
                  </td>
                  <td>
                    <span style={{ color: day.nmae > 25 ? '#f87171' : '#34d399' }}>
                      {day.nmae}%
                    </span>
                  </td>
                  <td>{day.rmse?.toLocaleString()} MW</td>
                  <td>
                    <span className={`badge ${isOver ? 'badge-overestimate' : 'badge-underestimate'}`}>
                      {day.mbe > 0 ? `+${day.mbe}` : day.mbe} MW
                    </span>
                  </td>
                  <td>{day.avgActual?.toLocaleString()} MW</td>
                  <td>{day.avgForecast?.toLocaleString()} MW</td>
                  <td>
                    <button
                      className="filter-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                      onClick={() => onInspectDate(day.date)}
                    >
                      <Eye size={12} /> Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
