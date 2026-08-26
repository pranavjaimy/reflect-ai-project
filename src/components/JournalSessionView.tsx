import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  ArrowLeft,
  Tag,
  Star,
  Download,
  Trash2,
  RefreshCw,
  Target,
  Edit2,
  FileText,
  Lightbulb,
  Compass,
  ListTodo,
  CheckCircle2,
  Plus,
  Save,
  Check,
  BookmarkCheck,
  Clock,
  Loader2,
  X
} from 'lucide-react';
import {
  Conversation,
  JournalMessage,
  ReflectionActionType,
  ExtractedGoalSuggestion,
  Goal
} from '../types';
import {
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  updateConversation,
  createGoal
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';

interface JournalSessionViewProps {
  conversation: Conversation;
  goals: Goal[];
  onBack: () => void;
  onUpdateConversationState: (convId: string, updates: Partial<Conversation>) => void;
  onGoalCreated?: (newGoal: Goal) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const JournalSessionView: React.FC<JournalSessionViewProps> = ({
  conversation,
  goals,
  onBack,
  onUpdateConversationState,
  onGoalCreated,
  showToast,
}) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [inputContent, setInputContent] = useState('');
  const [selectedAction, setSelectedAction] = useState<ReflectionActionType>('chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved_draft' | 'idle'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');

  // Title and Tag Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation.title);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showTagEditor, setShowTagEditor] = useState(false);

  // Inline Message Editing
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Extracted Goals State
  const [extractedGoalsState, setExtractedGoalsState] = useState<ExtractedGoalSuggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const draftKey = `mindscribe_draft_${conversation.id}`;

  // Restore uncommitted draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setInputContent(savedDraft);
        setSaveStatus('unsaved_draft');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [conversation.id, draftKey]);

  // Save draft to localStorage as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputContent(val);
    if (val.trim()) {
      setSaveStatus('unsaved_draft');
      try {
        localStorage.setItem(draftKey, val);
      } catch (err) {}
    } else {
      setSaveStatus('saved');
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {}
    }
  };

  // Load messages from Firestore
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const fetchMsgs = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await getMessages(currentUser.uid, conversation.id);
        if (isMounted) {
          setMessages(msgs);
          setSaveStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err: any) {
        console.error('Failed to load messages:', err);
        showToast('Could not load session messages from Firestore.', 'error');
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };
    fetchMsgs();
    return () => {
      isMounted = false;
    };
  }, [conversation.id, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle Title Save
  const handleSaveTitle = async () => {
    if (!currentUser || !titleInput.trim()) return;
    try {
      setSaveStatus('saving');
      await updateConversation(currentUser.uid, conversation.id, { title: titleInput.trim() });
      onUpdateConversationState(conversation.id, { title: titleInput.trim() });
      setIsEditingTitle(false);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Title updated and saved.', 'success');
    } catch (err) {
      setSaveStatus('idle');
      showToast('Failed to update title in Firestore.', 'error');
    }
  };

  // Handle Tags
  const handleAddTag = async (tag: string) => {
    if (!currentUser) return;
    const cleanTag = tag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanTag || conversation.tags?.includes(cleanTag)) return;
    const newTags = [...(conversation.tags || []), cleanTag];
    try {
      setSaveStatus('saving');
      await updateConversation(currentUser.uid, conversation.id, { tags: newTags });
      onUpdateConversationState(conversation.id, { tags: newTags });
      setCustomTagInput('');
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      showToast('Failed to add tag.', 'error');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!currentUser) return;
    const newTags = (conversation.tags || []).filter((t) => t !== tagToRemove);
    try {
      setSaveStatus('saving');
      await updateConversation(currentUser.uid, conversation.id, { tags: newTags });
      onUpdateConversationState(conversation.id, { tags: newTags });
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      showToast('Failed to remove tag.', 'error');
    }
  };

  // Explicit "Save Session" Button Action
  const handleExplicitSaveSession = async () => {
    if (!currentUser) return;
    setIsSavingManual(true);
    setSaveStatus('saving');

    try {
      // 1. If there is text in the textarea, save it as a new journal entry
      const textToSave = inputContent.trim();
      let updatedList = [...messages];

      if (textToSave) {
        const userMsg = await addMessage(currentUser.uid, conversation.id, {
          role: 'user',
          content: textToSave,
          timestamp: Date.now(),
          actionType: selectedAction || 'chat',
        });
        updatedList.push(userMsg);
        setMessages(updatedList);
        setInputContent('');
        try {
          localStorage.removeItem(draftKey);
        } catch (e) {}

        // Auto-generate title if untitled
        if (conversation.title === 'Untitled Reflection' || conversation.title === 'New Reflection') {
          fetch('/api/gemini/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstMessage: textToSave }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.title) {
                updateConversation(currentUser.uid, conversation.id, { title: res.title });
                onUpdateConversationState(conversation.id, { title: res.title });
                setTitleInput(res.title);
              }
            })
            .catch(() => {});
        }
      }

      // 2. Refresh conversation metadata in Firestore
      const lastPreview = updatedList.length > 0 
        ? updatedList[updatedList.length - 1].content.slice(0, 140).replace(/\n/g, ' ')
        : (conversation.lastMessagePreview || '');

      await updateConversation(currentUser.uid, conversation.id, {
        lastMessagePreview: lastPreview,
        messageCount: updatedList.length,
      });

      onUpdateConversationState(conversation.id, {
        lastMessagePreview: lastPreview,
        messageCount: updatedList.length,
        updatedAt: Date.now(),
      });

      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Conversation successfully saved to Firestore!', 'success');
    } catch (err: any) {
      console.error('Error saving session:', err);
      setSaveStatus('idle');
      showToast('Failed to save session. Your text is preserved in the editor.', 'error');
    } finally {
      setIsSavingManual(false);
    }
  };

  // Explicit "Save Entry" Button (Saves user thought directly to Firestore without triggering AI)
  const handleSaveEntryOnly = async () => {
    if (!currentUser) return;
    const textToSend = inputContent.trim();
    if (!textToSend) {
      showToast('Please type a journal entry before saving.', 'error');
      return;
    }

    setIsSavingManual(true);
    setSaveStatus('saving');

    try {
      const userMsg = await addMessage(currentUser.uid, conversation.id, {
        role: 'user',
        content: textToSend,
        timestamp: Date.now(),
        actionType: 'chat',
      });

      const updatedList = [...messages, userMsg];
      setMessages(updatedList);
      setInputContent('');
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {}

      // If untitled, generate title
      if (conversation.title === 'Untitled Reflection' || conversation.title === 'New Reflection') {
        fetch('/api/gemini/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: textToSend }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.title) {
              updateConversation(currentUser.uid, conversation.id, { title: res.title });
              onUpdateConversationState(conversation.id, { title: res.title });
              setTitleInput(res.title);
            }
          })
          .catch(() => {});
      }

      onUpdateConversationState(conversation.id, {
        lastMessagePreview: textToSend.slice(0, 140).replace(/\n/g, ' '),
        messageCount: updatedList.length,
        updatedAt: Date.now(),
      });

      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Journal entry saved to conversation.', 'success');
    } catch (err: any) {
      console.error('Error saving entry:', err);
      setSaveStatus('unsaved_draft');
      showToast('Failed to save entry. Please try again.', 'error');
    } finally {
      setIsSavingManual(false);
    }
  };

  // Handle sending a message / reflection with Gemini
  const handleSendMessage = async (overrideContent?: string, overrideAction?: ReflectionActionType) => {
    if (!currentUser) return;
    const textToSend = (overrideContent !== undefined ? overrideContent : inputContent).trim();
    const actionToUse = overrideAction || selectedAction;

    if (!textToSend && actionToUse === 'chat') {
      showToast('Please type your thoughts to reflect with Gemini.', 'error');
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    setSaveStatus('saving');

    try {
      let currentMsgList = [...messages];

      // 1. If there is user text, persist user message to Firestore
      if (textToSend) {
        const userMsg = await addMessage(currentUser.uid, conversation.id, {
          role: 'user',
          content: textToSend,
          timestamp: Date.now(),
          actionType: actionToUse,
        });
        currentMsgList.push(userMsg);
        setMessages(currentMsgList);
        setInputContent('');
        try {
          localStorage.removeItem(draftKey);
        } catch (e) {}

        // Auto-generate title if untitled
        if (conversation.title === 'Untitled Reflection' || conversation.title === 'New Reflection') {
          fetch('/api/gemini/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstMessage: textToSend }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.title) {
                updateConversation(currentUser.uid, conversation.id, { title: res.title });
                onUpdateConversationState(conversation.id, { title: res.title });
                setTitleInput(res.title);
              }
            })
            .catch(() => {});
        }
      }

      // 2. Call the backend API (with fallback ladder)
      let aiText = '';
      let modelUsed = 'gemini-3.6-flash';
      let extractedGoals: ExtractedGoalSuggestion[] = [];

      if (actionToUse === 'chat') {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentMsgList.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (!response.ok) {
          throw new Error((await response.json())?.error || 'Failed to generate response.');
        }
        const data = await response.json();
        aiText = data.text;
        modelUsed = data.modelUsed;
      } else {
        // Specialized reflection action
        const response = await fetch('/api/gemini/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionToUse,
            conversationHistory: currentMsgList.map((m) => ({ role: m.role, content: m.content })),
            userInput: textToSend,
          }),
        });
        if (!response.ok) {
          throw new Error((await response.json())?.error || 'Failed to process reflection action.');
        }
        const data = await response.json();
        aiText = data.text;
        modelUsed = data.modelUsed;

        // If extracting goals, also parse structured goals
        if (actionToUse === 'extract-goals') {
          try {
            const goalRes = await fetch('/api/gemini/extract-goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: textToSend || aiText }),
            });
            const goalData = await goalRes.json();
            if (goalData?.goals && Array.isArray(goalData.goals)) {
              extractedGoals = goalData.goals;
              setExtractedGoalsState(goalData.goals);
            }
          } catch (e) {
            console.warn('Structured goal extraction parse skipped:', e);
          }
        }
      }

      // 3. Save AI message to Firestore
      const aiMsg = await addMessage(currentUser.uid, conversation.id, {
        role: 'assistant',
        content: aiText,
        timestamp: Date.now(),
        actionType: actionToUse,
        metadata: {
          modelUsed,
          extractedGoals: extractedGoals.length > 0 ? extractedGoals : undefined,
        },
      });

      const fullUpdatedList = [...currentMsgList, aiMsg];
      setMessages(fullUpdatedList);

      onUpdateConversationState(conversation.id, {
        lastMessagePreview: aiText.slice(0, 140).replace(/\n/g, ' '),
        messageCount: fullUpdatedList.length,
        updatedAt: Date.now(),
      });

      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Reflection saved to your journal archive.', 'success');
    } catch (error: any) {
      console.error('Error generating reflection:', error);
      setSaveStatus('idle');
      showToast(error.message || 'Failed to connect to Gemini. Please retry.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Inline Message Editing Save
  const handleSaveEditedMessage = async (msgId: string) => {
    if (!currentUser || !editingContent.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateMessage(currentUser.uid, conversation.id, msgId, {
        content: editingContent.trim(),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: editingContent.trim() } : m))
      );
      setEditingMsgId(null);
      setEditingContent('');
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Message updated and saved to Firestore.', 'success');
    } catch (err) {
      showToast('Failed to update message.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Regenerate last AI response
  const handleRegenerate = async (msgId: string) => {
    if (!currentUser || isGenerating) return;
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex <= 0) return;

    const previousUserMsg = messages[msgIndex - 1];
    if (previousUserMsg.role !== 'user') return;

    try {
      // Remove old assistant message
      await deleteMessage(currentUser.uid, conversation.id, msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      // Re-trigger generation with the previous user message
      await handleSendMessage(previousUserMsg.content, previousUserMsg.actionType);
    } catch (err: any) {
      showToast('Failed to regenerate response.', 'error');
    }
  };

  // Delete message
  const handleDeleteMsg = async (msgId: string) => {
    if (!currentUser) return;
    try {
      await deleteMessage(currentUser.uid, conversation.id, msgId);
      const remaining = messages.filter((m) => m.id !== msgId);
      setMessages(remaining);
      onUpdateConversationState(conversation.id, {
        messageCount: remaining.length,
        lastMessagePreview: remaining.length > 0
          ? remaining[remaining.length - 1].content.slice(0, 140).replace(/\n/g, ' ')
          : '',
      });
      showToast('Message removed from Firestore.', 'success');
    } catch (err) {
      showToast('Failed to delete message.', 'error');
    }
  };

  // Add Extracted Goal to user's Goals hub
  const handleSaveExtractedGoal = async (goalItem: ExtractedGoalSuggestion) => {
    if (!currentUser) return;
    try {
      const newGoal = await createGoal(currentUser.uid, {
        title: goalItem.title,
        description: goalItem.rationale,
        category: goalItem.category,
        milestones: goalItem.milestones,
        sourceConversationId: conversation.id,
      });
      if (onGoalCreated) onGoalCreated(newGoal);
      showToast(`Goal "${goalItem.title}" saved to your Goals Hub!`, 'success');
    } catch (err) {
      showToast('Failed to save goal.', 'error');
    }
  };

  // Export session to Markdown
  const handleExportSession = () => {
    let md = `# ${conversation.title}\nDate: ${new Date(conversation.createdAt).toLocaleString()}\n`;
    if (conversation.tags?.length) {
      md += `Tags: ${conversation.tags.join(', ')}\n\n`;
    }
    md += `\n---\n\n`;

    messages.forEach((m) => {
      const sender = m.role === 'user' ? '👤 Journaler' : '✨ Gemini Guide';
      md += `### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n`;
      if (m.actionType && m.actionType !== 'chat') {
        md += `*Mode: ${m.actionType}*\n\n`;
      }
      md += `${m.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-export.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Session exported as Markdown.', 'success');
  };

  const actionModes: {
    id: ReflectionActionType;
    label: string;
    icon: React.FC<{ className?: string }>;
    desc: string;
  }[] = [
    { id: 'chat', label: 'Reflection Stream', icon: Sparkles, desc: 'Natural dialogue & guided inquiry' },
    { id: 'summarize', label: 'Summarize', icon: FileText, desc: 'Executive takeaways & key realizations' },
    { id: 'reflect', label: 'Deep Reflect', icon: Compass, desc: 'Gentle observation & perspective reframing' },
    { id: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, desc: 'Creative solutions & alternative angles' },
    { id: 'themes', label: 'Find Themes', icon: Tag, desc: 'Identify recurring mental & emotional patterns' },
    { id: 'extract-goals', label: 'Extract Goals', icon: Target, desc: 'Turn thoughts into actionable milestones' },
    { id: 'next-steps', label: 'Next Steps', icon: ListTodo, desc: 'Concrete immediate actions for today/week' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Session Top Bar */}
      <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="session-back-btn"
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-colors cursor-pointer"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  id="session-title-input"
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="px-3 py-1 rounded-lg bg-stone-800 border border-amber-500 text-stone-100 text-base font-serif font-semibold focus:outline-hidden"
                  autoFocus
                />
                <button
                  id="session-title-save-btn"
                  onClick={handleSaveTitle}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 cursor-pointer"
                >
                  Save
                </button>
                <button
                  id="session-title-cancel-btn"
                  onClick={() => setIsEditingTitle(false)}
                  className="px-2 py-1 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-serif font-bold text-stone-100 tracking-tight">
                  {conversation.title}
                </h2>
                <button
                  id="session-edit-title-btn"
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-200 transition-opacity cursor-pointer"
                  title="Rename title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-400">
              {/* Firestore Cloud Sync Badge */}
              {saveStatus === 'saved' && (
                <span
                  id="session-saved-status-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium"
                >
                  <Check className="w-3 h-3" />
                  <span>Saved to Cloud</span>
                </span>
              )}
              {saveStatus === 'saving' && (
                <span
                  id="session-saving-status-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === 'unsaved_draft' && (
                <span
                  id="session-draft-status-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Unsaved draft</span>
                </span>
              )}

              <span>•</span>
              <span>{messages.length} messages</span>

              {/* Tag Pills */}
              {conversation.tags?.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[11px]"
                >
                  #{t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                id="session-add-tag-toggle"
                onClick={() => setShowTagEditor(!showTagEditor)}
                className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Tag</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Session Utilities: Prominent Save Conversation Button */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            id="session-save-btn"
            onClick={handleExplicitSaveSession}
            disabled={isSavingManual || isGenerating}
            title="Save conversation and notes to Firestore"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingManual ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Conversation</span>
          </button>

          <button
            id="session-export-btn"
            onClick={handleExportSession}
            title="Export session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tag Editor Dropdown */}
      {showTagEditor && (
        <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400">Quick Tags:</span>
          {['Work', 'Learning', 'Ideas', 'Goals', 'Personal', 'Projects'].map((qt) => (
            <button
              key={qt}
              onClick={() => handleAddTag(qt)}
              className="px-2 py-1 rounded bg-stone-700 hover:bg-amber-500 hover:text-stone-950 text-stone-300 text-xs transition-colors cursor-pointer"
            >
              +{qt}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag(customTagInput)}
              placeholder="Custom tag..."
              className="px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-xs text-stone-200 focus:outline-hidden"
            />
            <button
              onClick={() => handleAddTag(customTagInput)}
              className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Reflection Action Selector Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Gemini Reflection Focus
          </span>
          <span className="text-xs text-stone-400 italic">
            {actionModes.find((m) => m.id === selectedAction)?.desc}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {actionModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedAction === mode.id;
            return (
              <button
                key={mode.id}
                id={`action-chip-${mode.id}`}
                onClick={() => setSelectedAction(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold shadow-xs'
                    : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:text-stone-100 hover:border-stone-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-stone-950' : 'text-amber-400'}`} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="space-y-4 min-h-[300px]">
        {loadingMessages ? (
          <div className="py-16 text-center text-stone-400 space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs">Loading reflection history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-semibold text-stone-200">
              Your reflection canvas is open.
            </h4>
            <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
              Write whatever is on your mind below. You can save your entries directly with <strong>Save Entry</strong> or explore with Gemini using <strong>Reflect with Gemini</strong>.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isEditingThis = editingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`p-5 rounded-2xl border transition-all ${
                  isUser
                    ? 'bg-stone-850/80 border-stone-750 text-stone-100 ml-4 sm:ml-12'
                    : 'bg-stone-900/90 border-stone-800 text-stone-200 mr-4 sm:mr-12 shadow-sm'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between mb-3 text-xs text-stone-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                      {isUser ? (
                        <>👤 You</>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400 font-serif">MindScribe</span>
                        </>
                      )}
                    </span>
                    {msg.actionType && msg.actionType !== 'chat' && (
                      <span className="px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 text-[10px] uppercase font-medium border border-stone-700">
                        {msg.actionType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {/* Inline edit button */}
                    <button
                      id={`edit-msg-btn-${msg.id}`}
                      onClick={() => {
                        setEditingMsgId(msg.id);
                        setEditingContent(msg.content);
                      }}
                      title="Edit message"
                      className="p-1 text-stone-400 hover:text-stone-200 rounded transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {!isUser && (
                      <button
                        onClick={() => handleRegenerate(msg.id)}
                        title="Regenerate response"
                        className="p-1 text-stone-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMsg(msg.id)}
                      title="Delete message"
                      className="p-1 text-stone-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Message Content / Inline Edit Form */}
                {isEditingThis ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      id={`edit-textarea-${msg.id}`}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-stone-800 border border-amber-500 text-sm text-stone-100 focus:outline-hidden resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingMsgId(null);
                          setEditingContent('');
                        }}
                        className="px-3 py-1 rounded-lg text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id={`save-edit-btn-${msg.id}`}
                        onClick={() => handleSaveEditedMessage(msg.id)}
                        disabled={isSavingEdit || !editingContent.trim()}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-sans leading-relaxed whitespace-pre-wrap text-stone-200">
                    {msg.content}
                  </div>
                )}

                {/* Extracted Goals Card (if action was extract-goals) */}
                {msg.metadata?.extractedGoals && msg.metadata.extractedGoals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-800 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Target className="w-4 h-4" />
                      <span>Extracted Goals Ready to Save:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.metadata.extractedGoals.map((eg, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-stone-800/60 border border-stone-700 flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-semibold text-xs text-stone-100">{eg.title}</h5>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-700 text-stone-300">
                                {eg.category}
                              </span>
                            </div>
                            {eg.rationale && (
                              <p className="text-[11px] text-stone-400 mt-1 italic">{eg.rationale}</p>
                            )}
                            <ul className="mt-2 space-y-1 text-[11px] text-stone-300">
                              {eg.milestones.map((m, mIdx) => (
                                <li key={mIdx} className="flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            id={`save-extracted-goal-btn-${idx}`}
                            onClick={() => handleSaveExtractedGoal(eg)}
                            className="w-full mt-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save to My Goals</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing / Generating Indicator */}
        {isGenerating && (
          <div
            id="gemini-generating-indicator"
            className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 text-stone-300 flex items-center gap-3 w-fit"
          >
            <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-xs font-medium text-amber-300 animate-pulse">
              MindScribe is synthesizing your reflection...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Writing Input Canvas with Save & Reflect Controls */}
      <div className="sticky bottom-4 z-20 bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-800 p-3 sm:p-4 shadow-xl">
        <div className="space-y-3">
          <textarea
            id="journal-entry-textarea"
            rows={3}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              selectedAction === 'chat'
                ? 'Type your thoughts freely... (Click "Save Entry" to save note, or "Reflect" for AI insights)'
                : `Enter your reflection or prompt for "${actionModes.find((m) => m.id === selectedAction)?.label}"...`
            }
            className="w-full p-3 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-stone-100 placeholder-stone-400 focus:outline-hidden focus:border-amber-500 transition-colors resize-none leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>Focus: <strong className="text-amber-400">{actionModes.find((m) => m.id === selectedAction)?.label}</strong></span>
              <span>•</span>
              <span className="hidden sm:inline">Cmd+Enter to reflect</span>
            </div>

            <div className="flex items-center justify-end gap-2 flex-wrap">
              {/* If user picked an action like summarize and has no text, offer to run on whole session */}
              {selectedAction !== 'chat' && messages.length > 0 && (
                <button
                  id="run-action-on-session-btn"
                  onClick={() => handleSendMessage(inputContent || 'Analyze current session', selectedAction)}
                  disabled={isGenerating || isSavingManual}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Run on Full Session
                </button>
              )}

              {/* Explicit "Save Entry" Button */}
              <button
                id="save-entry-btn"
                type="button"
                onClick={handleSaveEntryOnly}
                disabled={isGenerating || isSavingManual || !inputContent.trim()}
                title="Save this entry to the conversation without calling AI"
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingManual ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Save Entry</span>
              </button>

              {/* "Reflect with Gemini" Button */}
              <button
                id="send-reflection-btn"
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isGenerating || isSavingManual || (!inputContent.trim() && selectedAction === 'chat')}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <span className="inline-block w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Reflect with Gemini</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
