import React from 'react';
import { X, Check, HelpCircle } from 'lucide-react';

export default function CutoffSettingsModal({
  cutoffMode,
  setCutoffMode,
  customTime,
  setCustomTime,
  onClose,
}) {
  const options = [
    {
      id: 'd_minus_1_1200',
      title: 'D-1 12:00 UTC (Recommended — EPEX SPOT Day-Ahead Auction)',
      desc: 'The official gate closure for Great Britain day-ahead wholesale electricity trading. Selects the most recent wind forecast published before midday on the day before delivery.',
    },
    {
      id: 'd_minus_1_1700',
      title: 'D-1 17:00 UTC (Afternoon Operational Planning)',
      desc: 'Used by utility dispatchers finalizing indicative balancing nominations after day-ahead exchange clearing.',
    },
    {
      id: 'd_minus_1_2359',
      title: 'D-1 23:59 UTC (Final Midnight Day-Ahead Cutoff)',
      desc: 'Captures the latest evening forecast available before delivery day begins at midnight.',
    },
    {
      id: 'intraday_latest',
      title: 'Intraday (Latest Pre-Delivery Forecast)',
      desc: 'Selects the most recent forecast published right before delivery half-hour begins. Used to benchmark how forecast accuracy improves from Day-Ahead to Intraday.',
    },
    {
      id: 'custom',
      title: 'Custom Cutoff Time (D-1)',
      desc: 'Specify a customized time on the day prior to delivery.',
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Day-Ahead Decision Cutoff Settings</h3>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
              Configure when your trading desk submits wholesale power purchase orders
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {options.map((opt) => {
            const isSelected = cutoffMode === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setCutoffMode(opt.id)}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #283548',
                  background: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#1f293d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong style={{ color: isSelected ? '#38bdf8' : '#fff', fontSize: '0.9rem' }}>
                    {opt.title}
                  </strong>
                  {isSelected && <Check size={16} style={{ color: '#38bdf8' }} />}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.4 }}>
                  {opt.desc}
                </div>

                {opt.id === 'custom' && isSelected && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#fff' }}>Cutoff Time on D-1:</span>
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #38bdf8',
                        background: '#111827',
                        color: '#fff',
                        fontSize: '0.85rem',
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>UTC</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button
            className="filter-btn active"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            onClick={onClose}
          >
            Apply Cutoff Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
