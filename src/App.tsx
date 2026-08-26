import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { JournalSessionView } from './components/JournalSessionView';
import { DailyReflectionView } from './components/DailyReflectionView';
import { GoalsView } from './components/GoalsView';
import { InsightsView } from './components/InsightsView';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { ConfirmationModal } from './components/ConfirmationModal';
import {
  ActiveTab,
  Conversation,
  Goal,
  JournalStats
} from './types';
import {
  getConversations,
  createConversation,
  deleteConversation,
  updateConversation,
  getGoals,
  getJournalStats
} from './lib/firestoreService';

const MainAppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<JournalStats>({
    totalReflections: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeGoalsCount: 0,
    completedGoalsCount: 0,
    totalWordsWritten: 0,
  });

  // Toast & Modal States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [renameModalData, setRenameModalData] = useState<{ id: string; title: string } | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
  }, []);

  // Fetch all initial user data
  const refreshUserData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [convList, goalsList, statsData] = await Promise.all([
        getConversations(currentUser.uid),
        getGoals(currentUser.uid),
        getJournalStats(currentUser.uid),
      ]);
      setConversations(convList);
      setGoals(goalsList);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshUserData();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setGoals([]);
    }
  }, [currentUser, refreshUserData]);

  // Handle creating a brand new reflection session
  const handleNewReflection = async (customInitialTitle?: string, goalId?: string, initialPrompt?: string) => {
    if (!currentUser) return;
    try {
      const newConv = await createConversation(
        currentUser.uid,
        customInitialTitle || 'Untitled Reflection',
        [],
        goalId
      );
      if (initialPrompt) {
        try {
          localStorage.setItem(`mindscribe_draft_${newConv.id}`, initialPrompt);
        } catch (e) {}
      }
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv);
      setActiveTab('journal');
      showToast('New reflection canvas created and saved.', 'success');
      refreshUserData();
    } catch (err) {
      showToast('Failed to create new reflection session.', 'error');
    }
  };

  // Open an existing conversation
  const handleSelectConversation = (convId: string) => {
    const found = conversations.find((c) => c.id === convId);
    if (found) {
      setActiveConversation(found);
      setActiveTab('journal');
    }
  };

  // Delete conversation
  const handleConfirmDeleteConv = async () => {
    if (!currentUser || !conversationToDelete) return;
    try {
      await deleteConversation(currentUser.uid, conversationToDelete);
      setConversations((prev) => prev.filter((c) => c.id !== conversationToDelete));
      if (activeConversation?.id === conversationToDelete) {
        setActiveConversation(null);
        setActiveTab('dashboard');
      }
      showToast('Journal session removed.', 'success');
      refreshUserData();
    } catch (err) {
      showToast('Failed to delete session.', 'error');
    } finally {
      setConversationToDelete(null);
    }
  };

  // Rename conversation
  const handleConfirmRename = async () => {
    if (!currentUser || !renameModalData || !newTitleInput.trim()) return;
    try {
      await updateConversation(currentUser.uid, renameModalData.id, {
        title: newTitleInput.trim(),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === renameModalData.id ? { ...c, title: newTitleInput.trim() } : c))
      );
      if (activeConversation?.id === renameModalData.id) {
        setActiveConversation((prev) => (prev ? { ...prev, title: newTitleInput.trim() } : null));
      }
      showToast('Session renamed.', 'success');
    } catch (err) {
      showToast('Failed to rename session.', 'error');
    } finally {
      setRenameModalData(null);
      setNewTitleInput('');
    }
  };

  // Favorite toggle
  const handleToggleFavorite = async (convId: string, currentStatus: boolean) => {
    if (!currentUser) return;
    try {
      await updateConversation(currentUser.uid, convId, { isFavorite: !currentStatus });
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, isFavorite: !currentStatus } : c))
      );
    } catch (err) {
      showToast('Failed to update favorite status.', 'error');
    }
  };

  // If loading auth state from Firebase
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm font-serif text-stone-300">Opening MindScribe Sanctuary...</p>
      </div>
    );
  }

  // If unauthenticated, show Landing Page with Google Sign-in
  if (!currentUser) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'journal') {
            // Keep active session in memory or clear if requested
          }
        }}
        onNewReflection={() => handleNewReflection()}
        streakCount={stats.currentStreak}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardView
            conversations={conversations}
            goals={goals}
            stats={stats}
            onSelectConversation={handleSelectConversation}
            onNewReflection={() => handleNewReflection()}
            onDeleteConversation={(id) => setConversationToDelete(id)}
            onRenameConversation={(id, currentTitle) => {
              setRenameModalData({ id, title: currentTitle });
              setNewTitleInput(currentTitle);
            }}
            onToggleFavorite={handleToggleFavorite}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'journal' && (
          activeConversation ? (
            <JournalSessionView
              conversation={activeConversation}
              goals={goals}
              onBack={() => setActiveTab('dashboard')}
              onUpdateConversationState={(convId, updates) => {
                setConversations((prev) =>
                  prev.map((c) => (c.id === convId ? { ...c, ...updates } : c))
                );
                setActiveConversation((prev) => (prev ? { ...prev, ...updates } : null));
              }}
              onGoalCreated={() => refreshUserData()}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
              <p className="text-sm text-stone-400">No active journal session selected.</p>
              <button
                onClick={() => handleNewReflection()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                Create New Reflection
              </button>
            </div>
          )
        )}

        {activeTab === 'daily' && (
          <DailyReflectionView
            onReflectionSaved={refreshUserData}
            showToast={showToast}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            goals={goals}
            onGoalUpdated={refreshUserData}
            onOpenNewReflectionWithGoal={(goalId, goalTitle) => {
              handleNewReflection(`Reflection on Goal: ${goalTitle}`, goalId);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'insights' && <InsightsView showToast={showToast} />}

        {activeTab === 'settings' && <SettingsModal showToast={showToast} />}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(conversationToDelete)}
        title="Delete Journal Session?"
        message="This will permanently delete this conversation and all associated messages from your Firestore archive. This action cannot be reversed."
        confirmLabel="Delete Session"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteConv}
        onCancel={() => setConversationToDelete(null)}
      />

      {/* Rename Modal */}
      {renameModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-stone-900 rounded-3xl border border-stone-800 p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-stone-100">Rename Journal Session</h3>
            <input
              type="text"
              value={newTitleInput}
              onChange={(e) => setNewTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
              placeholder="Session title..."
              className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRenameModalData(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={!newTitleInput.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
