import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Target,
  Search,
  Star,
  Clock,
  ChevronRight,
  Trash2,
  Edit2,
  Tag,
  Flame,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { Conversation, Goal, JournalStats, ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  conversations: Conversation[];
  goals: Goal[];
  stats: JournalStats;
  onSelectConversation: (conversationId: string) => void;
  onNewReflection: (customTitle?: string, goalId?: string, initialPrompt?: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, currentTitle: string) => void;
  onToggleFavorite: (conversationId: string, currentStatus: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  conversations,
  goals,
  stats,
  onSelectConversation,
  onNewReflection,
  onDeleteConversation,
  onRenameConversation,
  onToggleFavorite,
  setActiveTab,
}) => {
  const { userProfile, currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);

  // Extract all distinct tags
  const allTags = Array.from(
    new Set(conversations.flatMap((c) => c.tags || []).filter(Boolean))
  );

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessagePreview || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));
    const matchesFav = !filterFavoritesOnly || c.isFavorite;
    return matchesSearch && matchesTag && matchesFav;
  });

  const activeGoals = goals.filter((g) => g.status === 'active');
  const greetingName =
    userProfile?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Journaler';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div
        id="dashboard-welcome-banner"
        className="relative overflow-hidden rounded-3xl bg-linear-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 p-6 sm:p-8 text-stone-100 shadow-sm"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-3">
              <span>Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 tracking-tight">
              Welcome back, {greetingName}.
            </h2>
            <p className="text-sm text-stone-400 mt-1 max-w-xl">
              Ready to reflect on your day, explore fresh perspectives, or advance your milestones?
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dashboard-new-session-cta"
              onClick={onNewReflection}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start Reflection</span>
            </button>
            <button
              id="dashboard-daily-checkin-cta"
              onClick={() => setActiveTab('daily')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 font-medium text-sm transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Daily Check-in</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div
          id="stat-streak-card"
          className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium text-stone-400">Current Streak</p>
            <p className="text-2xl font-bold font-serif text-stone-100 mt-1">
              {stats.currentStreak} <span className="text-sm font-sans font-normal text-stone-400">days</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Total Reflections */}
        <div
          id="stat-reflections-card"
          className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium text-stone-400">Total Reflections</p>
            <p className="text-2xl font-bold font-serif text-stone-100 mt-1">
              {stats.totalReflections}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Active Goals */}
        <div
          id="stat-goals-card"
          className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium text-stone-400">Active Goals</p>
            <p className="text-2xl font-bold font-serif text-stone-100 mt-1">
              {activeGoals.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* AI Insights Shortcut */}
        <div
          id="stat-insights-shortcut"
          onClick={() => setActiveTab('insights')}
          className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/40 transition-colors flex items-center justify-between cursor-pointer group"
        >
          <div>
            <p className="text-xs font-medium text-amber-400">AI Growth Insights</p>
            <p className="text-sm font-semibold text-stone-200 mt-1 group-hover:text-amber-300 flex items-center gap-1">
              <span>View Analysis</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left (Recent Reflections) + Right (Active Goals & Prompts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Conversations (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Recent Journal Sessions</span>
            </h3>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <button
                id="filter-favorites-toggle"
                onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
                className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  filterFavoritesOnly
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
                }`}
                title="Filter favorites"
              >
                <Star className={`w-3.5 h-3.5 ${filterFavoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Starred</span>
              </button>
            </div>
          </div>

          {/* Search & Tags Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="journal-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reflections, realizations, and notes..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-stone-100 placeholder-stone-400 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Tag Pills */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedTag === null
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  All Tags
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-amber-500 text-stone-950 font-semibold'
                        : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversation List */}
          {filteredConversations.length === 0 ? (
            <div
              id="empty-conversations-state"
              className="p-8 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-base font-serif font-medium text-stone-200">
                {searchQuery || selectedTag || filterFavoritesOnly
                  ? 'No journal sessions match your filter.'
                  : 'Your journal is ready for your first reflection.'}
              </p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Write freely about what is on your mind. MindScribe helps you reflect, find patterns, and turn thoughts into goals.
              </p>
              <button
                id="empty-state-new-reflection-btn"
                onClick={onNewReflection}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Begin First Reflection</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  id={`conversation-card-${conv.id}`}
                  className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-stone-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div
                    onClick={() => onSelectConversation(conv.id)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="font-serif font-semibold text-stone-100 group-hover:text-amber-300 transition-colors">
                        {conv.title}
                      </h4>
                      {conv.isFavorite && (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                    </div>
                    {conv.lastMessagePreview ? (
                      <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                        {conv.lastMessagePreview}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-400 italic">No messages yet...</p>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-stone-400">
                      <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                      {conv.tags && conv.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {conv.tags.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px]"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button
                      id={`fav-btn-${conv.id}`}
                      onClick={() => onToggleFavorite(conv.id, conv.isFavorite)}
                      title={conv.isFavorite ? 'Unfavorite' : 'Favorite'}
                      className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${conv.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                      />
                    </button>
                    <button
                      id={`rename-btn-${conv.id}`}
                      onClick={() => onRenameConversation(conv.id, conv.title)}
                      title="Rename conversation"
                      className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-btn-${conv.id}`}
                      onClick={() => onDeleteConversation(conv.id)}
                      title="Delete conversation"
                      className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      id={`open-btn-${conv.id}`}
                      onClick={() => onSelectConversation(conv.id)}
                      className="ml-1 p-1.5 text-stone-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Goals & Quick Guided Prompts */}
        <div className="space-y-6">
          {/* Active Goals Card */}
          <div
            id="dashboard-goals-panel"
            className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-stone-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Active Goals</span>
              </h3>
              <button
                id="goals-panel-view-all-btn"
                onClick={() => setActiveTab('goals')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-800/30 border border-stone-800 text-center space-y-2">
                <p className="text-xs text-stone-400">
                  No active goals yet. Extract goals directly from your reflections using Gemini!
                </p>
                <button
                  id="dashboard-create-goal-btn"
                  onClick={() => setActiveTab('goals')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                >
                  + Add a Goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.slice(0, 3).map((g) => {
                  const completedMilestones = g.milestones.filter((m) => m.completed).length;
                  const totalMilestones = g.milestones.length;
                  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-xl bg-stone-800/40 border border-stone-800/80 hover:border-stone-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <h5 className="font-medium text-xs text-stone-200 line-clamp-1">{g.title}</h5>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                          {g.category}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-400">
                        <span>{completedMilestones} of {totalMilestones} milestones</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inspirational Reflection Starters */}
          <div
            id="reflection-starters-card"
            className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3"
          >
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Thought Starters</span>
            </div>
            <p className="text-xs text-stone-400">
              Not sure where to begin today? Tap any prompt to open a fresh session:
            </p>

            <div className="space-y-2">
              {[
                'What decision gave me the most energy or tension today?',
                'What is one small win or breakthrough I haven’t celebrated?',
                'Where am I feeling friction, and what assumption is behind it?',
                'What is my single most important intention for the upcoming week?',
              ].map((prompt, i) => (
                <button
                  key={i}
                  id={`starter-prompt-${i}`}
                  onClick={() => onNewReflection(`Reflection: ${prompt.slice(0, 30)}...`, undefined, prompt)}
                  className="w-full text-left p-2.5 rounded-xl bg-stone-800/30 hover:bg-stone-800 border border-stone-800 text-xs text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
