import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

export default function IntradayProfileChart({ profileData }) {
  if (!profileData || profileData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-time">
            Settlement Period {data.settlementPeriod} ({data.timeOfDay} UTC)
          </div>
          <div className="tooltip-row">
            <span style={{ color: '#38bdf8' }}>● Mean Absolute Error:</span>
            <strong>{data.mae?.toLocaleString()} MW</strong>
          </div>
          <div className="tooltip-row">
            <span style={{ color: data.mbe >= 0 ? '#fbbf24' : '#818cf8' }}>
              ● Mean Bias Error (MBE):
            </span>
            <strong>{data.mbe > 0 ? `+${data.mbe}` : data.mbe} MW</strong>
          </div>
          <div className="tooltip-row" style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.3rem', borderTop: '1px solid #334155', paddingTop: '0.3rem' }}>
            <span>Avg Actual: {data.avgActual?.toLocaleString()} MW</span>
            <span>Avg Forecast: {data.avgForecast?.toLocaleString()} MW</span>
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
          <div className="chart-title">Intraday Forecast Accuracy Profile (Settlement Periods 1 to 48)</div>
          <div className="chart-subtitle">
            Average MAE and directional bias across time of day (00:00 to 23:30 UTC)
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={profileData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
            <XAxis
              dataKey="timeOfDay"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              interval={3}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} MW`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '0.85rem' }}
            />
            <ReferenceLine y={0} stroke="#4b5563" />
            <Bar dataKey="mae" name="Mean Absolute Error (MAE)" fill="#38bdf8" opacity={0.6} />
            <Line
              type="monotone"
              dataKey="mbe"
              name="Mean Bias Error (MBE)"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
