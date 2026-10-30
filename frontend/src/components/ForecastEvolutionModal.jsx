import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import { fetchForecastEvolution } from '../services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

export default function ForecastEvolutionModal({ targetStartTime, cutoffMode, customTime, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!targetStartTime) return;
    setLoading(true);
    fetchForecastEvolution({ targetStartTime, cutoffMode, customTime })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [targetStartTime, cutoffMode, customTime]);

  if (!targetStartTime) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Forecast Evolution & Revision History</h3>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
              Target Delivery: <strong>{targetStartTime.replace('T', ' ').replace('Z', ' UTC')}</strong>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading National Grid forecast revisions...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>
            Failed to load revisions: {error}
          </div>
        ) : (
          <div>
            {/* Outturn Summary Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1f293d',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                border: '1px solid #283548',
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Actual Outturn (FUELHH):</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                  {data.actualGeneration !== null ? `${data.actualGeneration?.toLocaleString()} MW` : 'N/A'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Total National Grid Revisions:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
                  {data.revisions?.length} revisions
                </div>
              </div>
            </div>

            {/* Revision Chart */}
            <div style={{ width: '100%', height: 220, marginBottom: '1.25rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.revisions.map((r) => ({
                    time: r.publishTime.slice(5, 16).replace('T', ' '),
                    leadTime: `${r.leadTimeHours}h ahead`,
                    generation: r.forecastGeneration,
                    actual: data.actualGeneration,
                    isCutoff: r.isCutoffSelected,
                  }))}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                  <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  {data.actualGeneration && (
                    <ReferenceLine
                      y={data.actualGeneration}
                      stroke="#10b981"
                      strokeDasharray="4 2"
                      label={{ value: 'Actual Outturn', fill: '#10b981', fontSize: 10, position: 'top' }}
                    />
                  )}
                  <Line
                    type="stepAfter"
                    dataKey="generation"
                    name="Forecast (MW)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Table of Revisions */}
            <div className="table-wrapper" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Published At (UTC)</th>
                    <th>Lead Time</th>
                    <th>Forecasted Generation</th>
                    <th>Error vs Outturn</th>
                    <th>Day-Ahead Decision Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revisions.map((rev, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: rev.isCutoffSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                      }}
                    >
                      <td>{rev.publishTime.replace('T', ' ').replace('Z', '')}</td>
                      <td>{rev.leadTimeHours} hrs</td>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>
                        {rev.forecastGeneration?.toLocaleString()} MW
                      </td>
                      <td>
                        {rev.error !== null ? (
                          <span style={{ color: rev.error >= 0 ? '#fbbf24' : '#818cf8', fontWeight: 600 }}>
                            {rev.error > 0 ? `+${rev.error}` : rev.error} MW
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {rev.isCutoffSelected ? (
                          <span className="badge badge-success" style={{ gap: '4px' }}>
                            <CheckCircle size={12} /> Selected for Day-Ahead Decision
                          </span>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {rev.leadTimeHours < 12 ? 'Intraday Revision' : 'Prior Revision'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
