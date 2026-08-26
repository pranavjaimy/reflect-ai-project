import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Flame,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  Save,
  Clock,
  ArrowRight,
  RefreshCw,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyReflection, DailyReflectionSynthesis } from '../types';
import {
  getDailyReflections,
  saveDailyReflection,
  getDailyReflectionForDate
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';

interface DailyReflectionViewProps {
  onReflectionSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const DailyReflectionView: React.FC<DailyReflectionViewProps> = ({
  onReflectionSaved,
  showToast,
}) => {
  const { currentUser } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [reflectionText, setReflectionText] = useState('');
  const [mood, setMood] = useState<'great' | 'good' | 'neutral' | 'challenging' | 'rough'>('good');
  const [synthesis, setSynthesis] = useState<DailyReflectionSynthesis | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pastReflections, setPastReflections] = useState<DailyReflection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load reflections history
  useEffect(() => {
    if (!currentUser) return;
    const loadReflections = async () => {
      setLoadingHistory(true);
      try {
        const list = await getDailyReflections(currentUser.uid);
        setPastReflections(list);

        // Load today's reflection if exists
        const currentToday = await getDailyReflectionForDate(currentUser.uid, selectedDate);
        if (currentToday) {
          setReflectionText(currentToday.rawPromptText || '');
          if (currentToday.mood) setMood(currentToday.mood);
          if (currentToday.synthesis) setSynthesis(currentToday.synthesis);
        } else {
          setReflectionText('');
          setSynthesis(null);
        }
      } catch (err) {
        console.error('Error loading daily reflections:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadReflections();
  }, [currentUser, selectedDate]);

  // Handle Synthesis with Gemini
  const handleSynthesize = async () => {
    if (!reflectionText.trim()) {
      showToast('Please write your thoughts for today before synthesizing.', 'error');
      return;
    }
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/gemini/daily-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPromptText: reflectionText,
          mood,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to synthesize daily reflection.');
      }

      const data = await res.json();
      setSynthesis(data.synthesis);
      showToast('Daily reflection synthesized by Gemini!', 'success');

      // Auto-save the reflection with synthesis
      if (currentUser) {
        await saveDailyReflection(currentUser.uid, {
          dateStr: selectedDate,
          rawPromptText: reflectionText,
          mood,
          synthesis: data.synthesis,
        });
        onReflectionSaved();
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error synthesizing reflection.', 'error');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Manual save without AI
  const handleManualSave = async () => {
    if (!currentUser || !reflectionText.trim()) return;
    setIsSaving(true);
    try {
      await saveDailyReflection(currentUser.uid, {
        dateStr: selectedDate,
        rawPromptText: reflectionText,
        mood,
        synthesis: synthesis || undefined,
      });
      onReflectionSaved();
      showToast('Daily reflection saved to your private journal.', 'success');
    } catch (err) {
      showToast('Failed to save reflection.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate date grid for the last 14 days
  const pastDates: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    pastDates.push(d.toISOString().split('T')[0]);
  }

  const recordedDateSet = new Set(pastReflections.map((r) => r.dateStr));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Evening Synthesis & Daily Growth</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 tracking-tight">
            Daily Reflection
          </h2>
          <p className="text-sm text-stone-400 mt-1">
            Capture what happened, what went well, and what to focus on next.
          </p>
        </div>

        {/* Quick Streak Indicator */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900 border border-stone-800 self-start md:self-auto">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-400">Recorded Days</p>
            <p className="text-sm font-bold text-stone-200">
              {recordedDateSet.size} days logged
            </p>
          </div>
        </div>
      </div>

      {/* Date Ribbon / Calendar Tracker */}
      <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Select Date to Review or Write
          </span>
          <span className="text-xs text-amber-400 font-medium">
            {selectedDate === todayStr ? 'Today' : selectedDate}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {pastDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const hasEntry = recordedDateSet.has(dateStr);
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
            const dayNum = dateObj.getDate();

            return (
              <button
                key={dateStr}
                id={`date-pill-${dateStr}`}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[54px] p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 border-amber-400 text-stone-950 font-bold shadow-xs'
                    : hasEntry
                    ? 'bg-stone-800/80 border-emerald-500/40 text-stone-200 hover:border-emerald-400'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                <span className="text-[10px] uppercase font-medium">{dayName}</span>
                <span className="text-sm mt-0.5">{dayNum}</span>
                {hasEntry && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left (Writing Canvas) + Right (AI Synthesis Review) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Writing Area */}
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-stone-100">
                How was your day?
              </h3>

              {/* Mood selector */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'great', label: 'Great', icon: '😄' },
                  { id: 'good', label: 'Good', icon: '🙂' },
                  { id: 'neutral', label: 'Neutral', icon: '😐' },
                  { id: 'challenging', label: 'Challenging', icon: '😕' },
                ].map((m) => (
                  <button
                    key={m.id}
                    id={`mood-btn-${m.id}`}
                    onClick={() => setMood(m.id as any)}
                    className={`p-1.5 rounded-lg text-sm transition-transform ${
                      mood === m.id
                        ? 'bg-stone-800 scale-125 border border-amber-500/50'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                    title={m.label}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Helper Cards */}
            <div className="p-3.5 rounded-xl bg-stone-800/40 border border-stone-800/80 text-xs text-stone-300 space-y-1">
              <p className="font-semibold text-amber-400">Helpful Angles to Reflect On:</p>
              <ul className="list-disc list-inside space-y-0.5 text-stone-400">
                <li>What key event or moment stood out today?</li>
                <li>What went well or what are you grateful for?</li>
                <li>What felt challenging or drained your energy?</li>
                <li>What is your single most important focus for tomorrow?</li>
              </ul>
            </div>

            <textarea
              id="daily-reflection-textarea"
              rows={8}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Write freely about today's events, mindset, feelings, and takeaways..."
              className="w-full p-4 rounded-2xl bg-stone-850 border border-stone-750 text-sm text-stone-100 placeholder-stone-400 focus:outline-hidden focus:border-amber-500 transition-colors leading-relaxed resize-none"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                id="daily-save-manual-btn"
                onClick={handleManualSave}
                disabled={isSaving || !reflectionText.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                id="daily-synthesize-gemini-btn"
                onClick={handleSynthesize}
                disabled={isSynthesizing || !reflectionText.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSynthesizing ? (
                  <span className="inline-block w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Synthesize with Gemini</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Synthesis & Structured Review */}
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4 shadow-sm min-h-[440px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg text-stone-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Gemini Evening Review</span>
                </h3>
                {synthesis && (
                  <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="p-1.5 text-stone-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                    title="Re-synthesize"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isSynthesizing ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 mx-auto border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-xs font-medium text-amber-300 animate-pulse">
                    Synthesizing key events, lessons, and tomorrow's intention...
                  </p>
                </div>
              ) : synthesis ? (
                <div className="space-y-4 text-xs leading-relaxed animate-in fade-in duration-200">
                  {/* Daily Summary */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <p className="font-semibold text-amber-300 text-xs mb-1">Overview</p>
                    <p className="text-stone-200">{synthesis.dailySummary}</p>
                  </div>

                  {/* Key Events & Wins */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {synthesis.whatWentWell?.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-800 space-y-1.5">
                        <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>What Went Well</span>
                        </p>
                        <ul className="space-y-1 text-stone-300">
                          {synthesis.whatWentWell.map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-emerald-400">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {synthesis.challenges?.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-800 space-y-1.5">
                        <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                          <span>Challenges & Friction</span>
                        </p>
                        <ul className="space-y-1 text-stone-300">
                          {synthesis.challenges.map((c, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-amber-400">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Lessons Learned */}
                  {synthesis.lessonsLearned?.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-800 space-y-1.5">
                      <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>Lessons & Insights Gained</span>
                      </p>
                      <ul className="space-y-1 text-stone-300">
                        {synthesis.lessonsLearned.map((l, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-purple-400">•</span>
                            <span>{l}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tomorrow's Focus */}
                  {synthesis.tomorrowFocus && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200">
                      <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Tomorrow's Priority Focus</span>
                      </p>
                      <p className="text-stone-200">{synthesis.tomorrowFocus}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3 text-stone-400">
                  <div className="w-10 h-10 mx-auto rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-serif text-stone-200">
                    No synthesis generated yet for this date.
                  </p>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto">
                    Type your thoughts on the left and click <strong>"Synthesize with Gemini"</strong> to extract key events, wins, and next-day focus.
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-stone-400 pt-3 border-t border-stone-800/80 flex items-center justify-between">
              <span>Cloud Firestore Isolated</span>
              <span>Daily Reflection #{selectedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
