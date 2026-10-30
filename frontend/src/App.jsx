import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import KpiCards from './components/KpiCards';
import GenerationChart from './components/GenerationChart';
import ErrorDistributionChart from './components/ErrorDistributionChart';
import IntradayProfileChart from './components/IntradayProfileChart';
import DailyAccuracyTable from './components/DailyAccuracyTable';
import HalfHourlyTable from './components/HalfHourlyTable';
import ForecastEvolutionModal from './components/ForecastEvolutionModal';
import CutoffSettingsModal from './components/CutoffSettingsModal';

import {
  fetchComparison,
  fetchSummary,
  fetchDailyAccuracy,
  fetchIntradayProfile,
} from './services/api';

import { BarChart3, TrendingUp, Calendar, Table as TableIcon, HelpCircle, Layers } from 'lucide-react';

export default function App() {
  // Global filter state
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-01-31');
  const [cutoffMode, setCutoffMode] = useState('d_minus_1_1200');
  const [customTime, setCustomTime] = useState('12:00');
  const [alignmentMode, setAlignmentMode] = useState('block_hourly'); // 'block_hourly' (48 SP) or 'exact' (24 SP)

  // Navigation tab: 'dashboard', 'daily', 'intraday', 'table'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Async data states
  const [comparisonData, setComparisonData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [dailyAccuracy, setDailyAccuracy] = useState([]);
  const [intradayProfile, setIntradayProfile] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [selectedPeriodForEvolution, setSelectedPeriodForEvolution] = useState(null);
  const [isCutoffModalOpen, setIsCutoffModalOpen] = useState(false);

  // Fetch all data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, sumRes, dailyRes, intraRes] = await Promise.all([
        fetchComparison({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }),
        fetchSummary({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }),
        fetchDailyAccuracy({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }),
        fetchIntradayProfile({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }),
      ]);
      setComparisonData(compRes);
      setSummaryData(sumRes);
      setDailyAccuracy(dailyRes);
      setIntradayProfile(intraRes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateFrom, dateTo, cutoffMode, customTime, alignmentMode]);

  // Quick filter helper
  const handleQuickFilter = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
  };

  // Inspect specific date
  const handleInspectDate = (dateStr) => {
    setDateFrom(dateStr);
    setDateTo(dateStr);
    setActiveTab('dashboard');
  };

  // Export current comparison data to CSV
  const handleExportCsv = () => {
    if (!comparisonData || !comparisonData.records) return;
    const records = comparisonData.records;
    const headers = [
      'startTime',
      'settlementDate',
      'settlementPeriod',
      'actualGenerationMW',
      'forecastGenerationMW',
      'publishTime',
      'leadTimeHours',
      'signedErrorMW',
      'absoluteErrorMW',
      'percentageError',
    ];
    const rows = records.map((r) => [
      r.startTime,
      r.settlementDate,
      r.settlementPeriod,
      r.actualGeneration,
      r.forecastGeneration,
      r.publishTime,
      r.leadTimeHours,
      r.error,
      r.absoluteError,
      r.percentageError || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UK_Wind_Forecast_Accuracy_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      {/* Navbar & Global Filter Controls */}
      <Navbar
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        cutoffMode={cutoffMode}
        alignmentMode={alignmentMode}
        setAlignmentMode={setAlignmentMode}
        onOpenCutoffModal={() => setIsCutoffModalOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={16} /> Overview & Visual Comparison
        </button>
        <button
          className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <Calendar size={16} /> Daily Leaderboard ({dailyAccuracy.length} Days)
        </button>
        <button
          className={`tab-btn ${activeTab === 'intraday' ? 'active' : ''}`}
          onClick={() => setActiveTab('intraday')}
        >
          <TrendingUp size={16} /> Intraday Profile (48 Periods)
        </button>
        <button
          className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <TableIcon size={16} /> Detailed Data Audit Table
        </button>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Processing and matching UK wind generation outturn with day-ahead forecasts...</p>
        </div>
      ) : error ? (
        <div className="chart-card" style={{ borderColor: '#ef4444', textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Backend Connection Error</h3>
          <p style={{ color: '#9ca3af' }}>{error}</p>
          <button
            className="filter-btn active"
            style={{ marginTop: '1rem', padding: '0.5rem 1.25rem' }}
            onClick={loadDashboardData}
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards (MAE, RMSE, MBE, Correlation, Peak Errors) */}
          <KpiCards
            metrics={comparisonData?.metrics}
            worstOver={summaryData?.worstOverestimation}
            worstUnder={summaryData?.worstUnderestimation}
          />

          {/* Tab 1: Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <>
              <GenerationChart
                records={comparisonData?.records}
                onSelectPeriod={(st) => setSelectedPeriodForEvolution(st)}
                onQuickFilter={handleQuickFilter}
              />

              <ErrorDistributionChart
                records={comparisonData?.records}
                distribution={comparisonData?.distribution}
              />
            </>
          )}

          {/* Tab 2: Daily Accuracy Breakdown */}
          {activeTab === 'daily' && (
            <DailyAccuracyTable
              dailyData={dailyAccuracy}
              onInspectDate={handleInspectDate}
            />
          )}

          {/* Tab 3: Intraday Profile */}
          {activeTab === 'intraday' && (
            <IntradayProfileChart profileData={intradayProfile} />
          )}

          {/* Tab 4: Half-Hourly Audit Table */}
          {activeTab === 'table' && (
            <HalfHourlyTable
              records={comparisonData?.records}
              onSelectPeriod={(st) => setSelectedPeriodForEvolution(st)}
            />
          )}
        </>
      )}

      {/* Modal: National Grid Forecast Revision Evolution */}
      {selectedPeriodForEvolution && (
        <ForecastEvolutionModal
          targetStartTime={selectedPeriodForEvolution}
          cutoffMode={cutoffMode}
          customTime={customTime}
          onClose={() => setSelectedPeriodForEvolution(null)}
        />
      )}

      {/* Modal: Cutoff Settings */}
      {isCutoffModalOpen && (
        <CutoffSettingsModal
          cutoffMode={cutoffMode}
          setCutoffMode={setCutoffMode}
          customTime={customTime}
          setCustomTime={setCustomTime}
          onClose={() => setIsCutoffModalOpen(false)}
        />
      )}
    </div>
  );
}
