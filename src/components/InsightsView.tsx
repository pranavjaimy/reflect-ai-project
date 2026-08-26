import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Brain,
  Layers,
  Award,
  AlertCircle,
  Clock,
  Compass,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { InsightReport, Conversation, DailyReflection } from '../types';
import {
  getInsightReports,
  saveInsightReport,
  getConversations,
  getDailyReflections
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';

interface InsightsViewProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ showToast }) => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<InsightReport[]>([]);
  const [activeReport, setActiveReport] = useState<InsightReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);

  // Load existing reports
  useEffect(() => {
    if (!currentUser) return;
    const fetchReports = async () => {
      setLoadingReports(true);
      try {
        const savedReports = await getInsightReports(currentUser.uid);
        setReports(savedReports);
        if (savedReports.length > 0) {
          setActiveReport(savedReports[0]);
        }
      } catch (err) {
        console.error('Error fetching insight reports:', err);
      } finally {
        setLoadingReports(false);
      }
    };
    fetchReports();
  }, [currentUser]);

  // Generate new insights report
  const handleGenerateInsights = async () => {
    if (!currentUser) return;
    setIsGenerating(true);

    try {
      // 1. Gather all user's historical entries (conversations & daily reflections)
      const convs = await getConversations(currentUser.uid);
      const dailyRefs = await getDailyReflections(currentUser.uid);

      const entriesToAnalyze = [
        ...convs.map((c) => ({
          date: new Date(c.createdAt).toLocaleDateString(),
          type: 'Journal Session',
          preview: `${c.title}: ${c.lastMessagePreview || ''}`,
          tags: c.tags,
        })),
        ...dailyRefs.map((dr) => ({
          date: dr.dateStr,
          type: 'Daily Reflection',
          preview: dr.rawPromptText,
          synthesis: dr.synthesis?.dailySummary,
        })),
      ];

      if (entriesToAnalyze.length === 0) {
        showToast('Please create at least 1 journal entry or daily reflection first.', 'error');
        setIsGenerating(false);
        return;
      }

      // 2. Call backend Gemini Insights endpoint
      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesToAnalyze }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI insights.');
      }

      const { insights } = await response.json();

      // 3. Save report to Firestore
      const newReport = await saveInsightReport(currentUser.uid, {
        generatedAt: Date.now(),
        entryCountAnalyzed: entriesToAnalyze.length,
        dateRange: {
          start: Date.now() - 30 * 86400000,
          end: Date.now(),
        },
        recurringThemes: insights.recurringThemes || [],
        frequentTopics: insights.frequentTopics || [],
        repeatedGoals: insights.repeatedGoals || [],
        progressOverTime: insights.progressOverTime || '',
        positiveDevelopments: insights.positiveDevelopments || [],
        areasToImprove: insights.areasToImprove || [],
        commonChallenges: insights.commonChallenges || [],
        priorityShifts: insights.priorityShifts || '',
        recommendedFocus: insights.recommendedFocus || '',
      });

      setReports((prev) => [newReport, ...prev]);
      setActiveReport(newReport);
      showToast('Comprehensive AI Insights report generated!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate insights.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
            <Brain className="w-3.5 h-3.5" />
            <span>Holistic Pattern Discovery & Self-Observation</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 tracking-tight">
            AI Growth Insights
          </h2>
          <p className="text-sm text-stone-400 mt-1 max-w-2xl">
            Gemini examines your historical journal entries to illuminate recurring patterns, progress, breakthroughs, and growth opportunities.
          </p>
        </div>

        <button
          id="generate-insights-btn"
          onClick={handleGenerateInsights}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          {isGenerating ? (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isGenerating ? 'Synthesizing Patterns...' : 'Generate Fresh Insights'}</span>
        </button>
      </div>

      {/* Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p>
          <strong>Privacy & Non-Clinical Framing:</strong> All insights are generated from your strictly isolated Firestore entries and framed as constructive self-reflection observations, not psychological or clinical diagnoses.
        </p>
      </div>

      {/* Main Insights Content */}
      {isGenerating ? (
        <div className="py-24 text-center space-y-4 rounded-3xl bg-stone-900/40 border border-stone-800">
          <div className="w-10 h-10 mx-auto border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <h4 className="font-serif font-bold text-stone-200 text-lg">
            Analyzing your journal timeline...
          </h4>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Gemini is identifying recurring motifs, tracking mindset shifts, and consolidating positive breakthroughs across your entries.
          </p>
        </div>
      ) : activeReport ? (
        <div className="space-y-6">
          {/* Report Meta Header */}
          <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-100 text-base">
                  Growth Synthesis Report
                </h3>
                <p className="text-xs text-stone-400">
                  Analyzed {activeReport.entryCountAnalyzed} journal records • Generated {new Date(activeReport.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Switch previous reports */}
            {reports.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">History:</span>
                <select
                  value={activeReport.id}
                  onChange={(e) => {
                    const sel = reports.find((r) => r.id === e.target.value);
                    if (sel) setActiveReport(sel);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-xs text-stone-200 focus:outline-hidden"
                >
                  {reports.map((r, i) => (
                    <option key={r.id} value={r.id}>
                      Report #{reports.length - i} ({new Date(r.generatedAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Core Growth Observations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recurring Themes */}
            <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4">
              <h4 className="font-serif font-bold text-base text-stone-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-purple-400" />
                <span>Recurring Life Themes</span>
              </h4>
              <div className="space-y-3">
                {activeReport.recurringThemes.map((th, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-purple-300">{th.theme}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40">
                        {th.frequency}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">{th.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Over Time & Positive Breakthroughs */}
            <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4">
              <h4 className="font-serif font-bold text-base text-stone-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Progress & Positive Breakthroughs</span>
              </h4>

              {activeReport.progressOverTime && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-stone-200 leading-relaxed">
                  <p className="font-semibold text-emerald-300 mb-1">Timeline Progression:</p>
                  <p>{activeReport.progressOverTime}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Key Breakthroughs:
                </p>
                <ul className="space-y-1.5 text-xs text-stone-300">
                  {activeReport.positiveDevelopments.map((pd, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pd}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Areas for Constructive Growth & Challenges */}
            <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4">
              <h4 className="font-serif font-bold text-base text-stone-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Growth Areas & Common Challenges</span>
              </h4>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-800/80 space-y-2">
                  <p className="font-semibold text-xs text-amber-300">Areas to Explore Improving:</p>
                  <ul className="space-y-1 text-xs text-stone-300">
                    {activeReport.areasToImprove.map((ai, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{ai}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {activeReport.commonChallenges.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-800/80 space-y-2">
                    <p className="font-semibold text-xs text-stone-300">Common Obstacles Encountered:</p>
                    <ul className="space-y-1 text-xs text-stone-400">
                      {activeReport.commonChallenges.map((cc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span>-</span>
                          <span>{cc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Focus */}
            <div className="p-6 rounded-3xl bg-linear-to-br from-purple-950/40 to-stone-900 border border-purple-900/40 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-base text-purple-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>Recommended Focus for Coming Weeks</span>
                </h4>
                <p className="text-sm text-stone-200 leading-relaxed">
                  {activeReport.recommendedFocus}
                </p>

                {activeReport.priorityShifts && (
                  <div className="pt-3 border-t border-purple-900/40">
                    <p className="text-xs font-semibold text-purple-300 mb-1">
                      Observed Shift in Priorities:
                    </p>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {activeReport.priorityShifts}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex flex-wrap gap-1.5 text-[11px]">
                {activeReport.frequentTopics.map((top, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 border border-stone-700"
                  >
                    #{top}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-stone-200 text-lg">
            No Insights Reports Generated Yet
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Once you have written a few reflections or daily check-ins, click <strong>"Generate Fresh Insights"</strong> to let Gemini discover overarching patterns and growth trends across your history.
          </p>
          <button
            onClick={handleGenerateInsights}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Run Initial Analysis
          </button>
        </div>
      )}
    </div>
  );
};
