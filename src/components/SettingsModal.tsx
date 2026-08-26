import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  FileJson,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  User,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  exportAllUserData,
  formatExportAsMarkdown,
  wipeAllUserData
} from '../lib/firestoreService';
import { ConfirmationModal } from './ConfirmationModal';

interface SettingsModalProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ showToast }) => {
  const { currentUser, userProfile, deleteAccount, logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export JSON
  const handleExportJSON = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    try {
      const data = await exportAllUserData(currentUser.uid);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindscribe-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported complete journal archive as JSON.', 'success');
    } catch (err) {
      showToast('Failed to export data.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Markdown
  const handleExportMarkdown = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    try {
      const data = await exportAllUserData(currentUser.uid);
      const mdStr = formatExportAsMarkdown(data);
      const blob = new Blob([mdStr], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindscribe-journal-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported complete journal as formatted Markdown.', 'success');
    } catch (err) {
      showToast('Failed to export Markdown.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Account Deletion
  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast('Account and all Firestore journal data permanently wiped.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security, Privacy & Data Sovereignty</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 tracking-tight">
          Privacy & Data Management
        </h2>
        <p className="text-sm text-stone-400 mt-1">
          Review your security configuration, export your journal history, or manage your account.
        </p>
      </div>

      {/* Security Architecture Audit Card */}
      <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-5 shadow-sm">
        <h3 className="font-serif font-bold text-lg text-stone-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" />
          <span>Active Security & Data Isolation</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-850/60 border border-stone-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Firebase UID Data Partitioning</span>
            </div>
            <p className="text-stone-400 leading-relaxed">
              All collections (<code className="text-amber-300">users/{currentUser?.uid}/*</code>) are enforced by Cloud Firestore Security Rules matching <code className="text-amber-300">request.auth.uid == userId</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-850/60 border border-stone-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Server-Isolated Gemini Keys</span>
            </div>
            <p className="text-stone-400 leading-relaxed">
              Gemini API keys remain strictly server-side in Secret Manager / environment variables. No client-side exposure.
            </p>
          </div>
        </div>

        {/* User Identity Details */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 text-xs space-y-2">
          <p className="font-semibold text-stone-300 flex items-center gap-1.5">
            <User className="w-4 h-4 text-amber-400" />
            <span>Authenticated User Context</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-400">
            <p>
              Email: <span className="text-stone-200">{currentUser?.email || 'N/A'}</span>
            </p>
            <p>
              Firebase UID: <span className="font-mono text-[11px] text-stone-300">{currentUser?.uid}</span>
            </p>
            <p>
              Auth Provider: <span className="text-stone-200">Google Authentication</span>
            </p>
            <p>
              Account Created: <span className="text-stone-200">{new Date(userProfile?.createdAt || Date.now()).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Data Export Center */}
      <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4 shadow-sm">
        <h3 className="font-serif font-bold text-lg text-stone-100 flex items-center gap-2">
          <Download className="w-5 h-5 text-amber-400" />
          <span>Export Your Journal Archive</span>
        </h3>
        <p className="text-xs text-stone-400 leading-relaxed">
          Download your complete reflective history, messages, daily check-ins, extracted goals, and AI insights. You own 100% of your data.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            id="export-markdown-btn"
            onClick={handleExportMarkdown}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Export as Markdown (.md)</span>
          </button>

          <button
            id="export-json-btn"
            onClick={handleExportJSON}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileJson className="w-4 h-4" />
            <span>Export as JSON (.json)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-900/40 space-y-4 shadow-sm">
        <h3 className="font-serif font-bold text-lg text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Data Erasure & Account Deletion</span>
        </h3>
        <p className="text-xs text-rose-200/80 leading-relaxed">
          Permanently deletes all your journal entries, messages, goals, daily check-ins, and insight reports from Cloud Firestore, followed by Firebase account deletion. This action cannot be undone.
        </p>

        <button
          id="delete-account-trigger-btn"
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Wipe All Data & Delete Account</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Permanently Delete Account & Data?"
        message="This will completely remove all your journal entries, messages, goals, daily check-ins, and AI reports from Firestore. Your Firebase user account will also be closed."
        confirmLabel="Yes, Wipe All Data"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
