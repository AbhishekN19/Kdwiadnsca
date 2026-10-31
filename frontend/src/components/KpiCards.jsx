import React from 'react';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';

export default function KpiCards({ metrics, worstOver, worstUnder }) {
  if (!metrics) return null;

  const isOverestimating = metrics.mbe > 0;
  const isUnderestimating = metrics.mbe < 0;

  return (
    <div className="kpi-grid">
      {/* 1. Mean Absolute Error (MAE) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Mean Absolute Error (MAE)</span>
          <Activity size={18} style={{ color: '#38bdf8' }} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{metrics.mae?.toLocaleString()}</span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtext">
          Normalized: <strong>{metrics.nmae}%</strong> of mean actual generation ({metrics.avgActual?.toLocaleString()} MW)
        </div>
      </div>

      {/* 2. Root Mean Square Error (RMSE) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Root Mean Square Error (RMSE)</span>
          <Zap size={18} style={{ color: '#fbbf24' }} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{metrics.rmse?.toLocaleString()}</span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtext">
          Penalizes large extreme deviations vs baseline error
        </div>
      </div>

      {/* 3. Mean Bias Error (MBE) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Mean Bias Error (MBE)</span>
          {isOverestimating ? (
            <TrendingUp size={18} style={{ color: '#f59e0b' }} />
          ) : (
            <TrendingDown size={18} style={{ color: '#818cf8' }} />
          )}
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: isOverestimating ? '#fbbf24' : '#a5b4fc' }}>
            {metrics.mbe > 0 ? `+${metrics.mbe?.toLocaleString()}` : metrics.mbe?.toLocaleString()}
          </span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtext">
          <span className={`badge ${isOverestimating ? 'badge-overestimate' : 'badge-underestimate'}`}>
            {isOverestimating ? '▲ Overestimating Generation' : '▼ Underestimating Generation'}
          </span>
        </div>
      </div>

      {/* 4. Pearson Correlation (r) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Forecast Correlation (r)</span>
          <Target size={18} style={{ color: '#10b981' }} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{metrics.correlation !== null ? metrics.correlation : '—'}</span>
        </div>
        <div className="kpi-subtext">
          Tracking fidelity across {metrics.count?.toLocaleString()} settlement periods
        </div>
      </div>

      {/* 5. Peak Overestimation Risk */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Peak Overestimation</span>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: '#f87171' }}>
            +{metrics.maxPositiveError?.toLocaleString()}
          </span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtext">
          {worstOver ? (
            <span>
              On <strong>{worstOver.settlementDate}</strong> (SP {worstOver.settlementPeriod}) — Shortfall Risk
            </span>
          ) : (
            'Largest physical deficit risk'
          )}
        </div>
      </div>

      {/* 6. Peak Underestimation (Surplus) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Peak Underestimation</span>
          <TrendingDown size={18} style={{ color: '#818cf8' }} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: '#818cf8' }}>
            {metrics.maxNegativeError?.toLocaleString()}
          </span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtext">
          {worstUnder ? (
            <span>
              On <strong>{worstUnder.settlementDate}</strong> (SP {worstUnder.settlementPeriod}) — Surplus / Curtailment
            </span>
          ) : (
            'Largest unexpected generation surplus'
          )}
        </div>
      </div>
    </div>
  );
}
