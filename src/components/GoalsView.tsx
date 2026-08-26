import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Goal, GoalMilestone } from '../types';
import { createGoal, updateGoal, deleteGoal } from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';

interface GoalsViewProps {
  goals: Goal[];
  onGoalUpdated: () => void;
  onOpenNewReflectionWithGoal?: (goalId: string, goalTitle: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onGoalUpdated,
  onOpenNewReflectionWithGoal,
  showToast,
}) => {
  const { currentUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Goal Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Goal['category']>('Personal');
  const [milestonesInput, setMilestonesInput] = useState<string[]>(['', '', '']);

  // Handle Milestone Toggle
  const handleToggleMilestone = async (goal: Goal, milestoneId: string) => {
    if (!currentUser) return;
    const updatedMilestones = goal.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextCompleted = !m.completed;
        return {
          ...m,
          completed: nextCompleted,
          completedAt: nextCompleted ? Date.now() : null,
        };
      }
      return m;
    });

    const allCompleted = updatedMilestones.length > 0 && updatedMilestones.every((m) => m.completed);
    const newStatus: Goal['status'] = allCompleted ? 'completed' : 'active';

    try {
      await updateGoal(currentUser.uid, goal.id, {
        milestones: updatedMilestones,
        status: newStatus,
        completedAt: allCompleted ? Date.now() : null,
      });
      onGoalUpdated();

      if (allCompleted) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast(`🎉 Goal "${goal.title}" completed! Congratulations!`, 'success');
      }
    } catch (err) {
      showToast('Failed to update milestone status.', 'error');
    }
  };

  // Handle Goal Delete
  const handleDeleteGoal = async (goalId: string) => {
    if (!currentUser) return;
    try {
      await deleteGoal(currentUser.uid, goalId);
      onGoalUpdated();
      showToast('Goal removed.', 'success');
    } catch (err) {
      showToast('Failed to delete goal.', 'error');
    }
  };

  // Handle Add New Milestone to existing goal
  const handleAddMilestoneToGoal = async (goal: Goal, text: string) => {
    if (!currentUser || !text.trim()) return;
    const newMilestone: GoalMilestone = {
      id: `m_${Date.now()}`,
      text: text.trim(),
      completed: false,
    };
    try {
      await updateGoal(currentUser.uid, goal.id, {
        milestones: [...goal.milestones, newMilestone],
        status: 'active',
      });
      onGoalUpdated();
      showToast('Milestone added.', 'success');
    } catch (err) {
      showToast('Failed to add milestone.', 'error');
    }
  };

  // Handle Goal Creation
  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim()) return;
    setIsSaving(true);
    try {
      const cleanMilestones = milestonesInput.map((m) => m.trim()).filter(Boolean);
      await createGoal(currentUser.uid, {
        title: title.trim(),
        description: description.trim(),
        category,
        milestones: cleanMilestones.length > 0 ? cleanMilestones : ['Initial planning & first step'],
      });
      onGoalUpdated();
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setCategory('Personal');
      setMilestonesInput(['', '', '']);
      showToast('New goal created!', 'success');
    } catch (err) {
      showToast('Failed to create goal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'active') return g.status === 'active';
    if (activeFilter === 'completed') return g.status === 'completed';
    return true;
  });

  const categories: Goal['category'][] = [
    'Personal',
    'Career',
    'Health',
    'Learning',
    'Mindfulness',
    'Projects',
    'Other',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-2">
            <Target className="w-3.5 h-3.5" />
            <span>Milestone Tracking & Journal Alignment</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 tracking-tight">
            Goals & Milestones
          </h2>
          <p className="text-sm text-stone-400 mt-1">
            Turn your journal reflections into structured, actionable achievements.
          </p>
        </div>

        <button
          id="create-goal-open-modal-btn"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          {(['active', 'completed', 'all'] as const).map((filter) => (
            <button
              key={filter}
              id={`filter-goals-${filter}`}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                activeFilter === filter
                  ? 'bg-stone-800 text-emerald-400 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {filter} (
              {goals.filter((g) => (filter === 'all' ? true : g.status === filter)).length}
              )
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div
          id="empty-goals-card"
          className="p-12 rounded-3xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-4"
        >
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-semibold text-stone-200 text-lg">
            No {activeFilter !== 'all' ? activeFilter : ''} goals found.
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            You can create a goal manually or extract goals automatically during your reflection sessions using Gemini!
          </p>
          <button
            id="empty-goals-create-btn"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGoals.map((goal) => {
            const completedCount = goal.milestones.filter((m) => m.completed).length;
            const totalCount = goal.milestones.length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isFinished = goal.status === 'completed';

            return (
              <div
                key={goal.id}
                id={`goal-card-${goal.id}`}
                className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between gap-4 shadow-sm"
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                      {goal.category}
                    </span>
                    <div className="flex items-center gap-2">
                      {isFinished ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-medium">
                          {percent}% done
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Delete Goal"
                        className="p-1 text-stone-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4
                    className={`font-serif text-lg font-bold text-stone-100 ${
                      isFinished ? 'line-through text-stone-400' : ''
                    }`}
                  >
                    {goal.title}
                  </h4>
                  {goal.description && (
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden my-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFinished ? 'bg-emerald-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Milestones Checklist */}
                  <div className="space-y-2 mt-4">
                    <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Milestones ({completedCount}/{totalCount})
                    </p>
                    <div className="space-y-1.5">
                      {goal.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          onClick={() => handleToggleMilestone(goal, milestone.id)}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                            milestone.completed
                              ? 'bg-emerald-950/20 border-emerald-900/40 text-stone-400'
                              : 'bg-stone-850/60 border-stone-800 text-stone-200 hover:border-stone-700'
                          }`}
                        >
                          {milestone.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-xs leading-snug ${
                              milestone.completed ? 'line-through text-stone-400' : ''
                            }`}
                          >
                            {milestone.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-400">
                    Created {new Date(goal.createdAt).toLocaleDateString()}
                  </span>
                  {onOpenNewReflectionWithGoal && (
                    <button
                      onClick={() => onOpenNewReflectionWithGoal(goal.id, goal.title)}
                      className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Reflect on Goal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div
            id="create-goal-dialog"
            className="w-full max-w-lg bg-stone-900 rounded-3xl border border-stone-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-stone-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold">Create New Goal</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Goal Title *
                </label>
                <input
                  id="goal-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master modern web security and APIs"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-sm text-stone-100 placeholder-stone-400 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-sm text-stone-100 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why this goal matters..."
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-sm text-stone-100 placeholder-stone-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Milestones list */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Milestones
                </label>
                <div className="space-y-2">
                  {milestonesInput.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => {
                          const updated = [...milestonesInput];
                          updated[idx] = e.target.value;
                          setMilestonesInput(updated);
                        }}
                        placeholder={`Milestone ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs text-stone-100 focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMilestonesInput([...milestonesInput, ''])}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add another milestone</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="create-goal-submit-btn"
                  type="submit"
                  disabled={isSaving || !title.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
