import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  Conversation,
  JournalMessage,
  Goal,
  DailyReflection,
  InsightReport,
  JournalStats
} from '../types';

/**
 * Strict Undefined-Stripping helper to ensure zero-crash Firestore payloads
 */
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = cleanPayload(val);
      } else if (Array.isArray(val)) {
        cleaned[key] = val.map(item =>
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? cleanPayload(item)
            : item
        ).filter(item => item !== undefined);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned as T;
}

// ----------------------------------------------------
// User Profile Operations
// ----------------------------------------------------
export async function syncUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const now = Date.now();

  if (!snap.exists()) {
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: now,
      lastLoginAt: now,
    };
    await setDoc(userRef, cleanPayload(newProfile));
    return newProfile;
  } else {
    const existing = snap.data() as UserProfile;
    const updated: UserProfile = {
      ...existing,
      email: user.email ?? existing.email,
      displayName: user.displayName ?? existing.displayName,
      photoURL: user.photoURL ?? existing.photoURL,
      lastLoginAt: now,
    };
    await updateDoc(userRef, cleanPayload({
      email: updated.email,
      displayName: updated.displayName,
      photoURL: updated.photoURL,
      lastLoginAt: now,
    }));
    return updated;
  }
}

// ----------------------------------------------------
// Conversations Operations (users/{uid}/conversations)
// ----------------------------------------------------
export async function createConversation(
  userId: string,
  initialTitle: string = 'Untitled Reflection',
  tags: string[] = [],
  goalId?: string | null
): Promise<Conversation> {
  const convsRef = collection(db, 'users', userId, 'conversations');
  const convDoc = doc(convsRef);
  const now = Date.now();

  const conversation: Conversation = {
    id: convDoc.id,
    userId,
    title: initialTitle,
    tags,
    goalId: goalId || null,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: '',
    messageCount: 0,
  };

  await setDoc(convDoc, cleanPayload(conversation));
  return conversation;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const convsRef = collection(db, 'users', userId, 'conversations');
  const q = query(convsRef, orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Conversation);
}

export async function getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
  const ref = doc(db, 'users', userId, 'conversations', conversationId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Conversation) : null;
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  updates: Partial<Conversation>
): Promise<void> {
  const ref = doc(db, 'users', userId, 'conversations', conversationId);
  await updateDoc(ref, cleanPayload({
    ...updates,
    updatedAt: Date.now(),
  }));
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  // Delete all messages within conversation first
  const msgsRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
  const msgsSnap = await getDocs(msgsRef);
  const batch = writeBatch(db);

  msgsSnap.docs.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });

  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  batch.delete(convRef);
  await batch.commit();
}

// ----------------------------------------------------
// Messages Operations (users/{uid}/conversations/{id}/messages)
// ----------------------------------------------------
export async function getMessages(userId: string, conversationId: string): Promise<JournalMessage[]> {
  const msgsRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
  const q = query(msgsRef, orderBy('timestamp', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as JournalMessage);
}

export async function addMessage(
  userId: string,
  conversationId: string,
  messageData: Omit<JournalMessage, 'id'> & { id?: string }
): Promise<JournalMessage> {
  const msgsRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
  const msgDoc = messageData.id ? doc(msgsRef, messageData.id) : doc(msgsRef);
  
  const message: JournalMessage = {
    id: msgDoc.id,
    role: messageData.role,
    content: messageData.content,
    timestamp: messageData.timestamp || Date.now(),
    actionType: messageData.actionType || 'chat',
    metadata: messageData.metadata || {},
  };

  await setDoc(msgDoc, cleanPayload(message));

  // Update conversation lastMessagePreview and updatedAt timestamp
  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  const preview = message.content.slice(0, 140).replace(/\n/g, ' ');
  await updateDoc(convRef, cleanPayload({
    lastMessagePreview: preview,
    updatedAt: Date.now(),
  }));

  return message;
}

export async function updateMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  updates: Partial<JournalMessage>
): Promise<void> {
  const msgRef = doc(db, 'users', userId, 'conversations', conversationId, 'messages', messageId);
  await updateDoc(msgRef, cleanPayload({
    ...updates,
  }));
}

export async function deleteMessage(userId: string, conversationId: string, messageId: string): Promise<void> {
  const msgRef = doc(db, 'users', userId, 'conversations', conversationId, 'messages', messageId);
  await deleteDoc(msgRef);
}

// ----------------------------------------------------
// Goals Operations (users/{uid}/goals)
// ----------------------------------------------------
export async function createGoal(
  userId: string,
  goalData: {
    title: string;
    description?: string;
    category: Goal['category'];
    milestones: string[];
    sourceConversationId?: string | null;
  }
): Promise<Goal> {
  const goalsRef = collection(db, 'users', userId, 'goals');
  const goalDoc = doc(goalsRef);
  const now = Date.now();

  const milestonesList = goalData.milestones.map((text, idx) => ({
    id: `m_${now}_${idx}`,
    text: text.trim(),
    completed: false,
  }));

  const goal: Goal = {
    id: goalDoc.id,
    userId,
    title: goalData.title.trim(),
    description: goalData.description?.trim() || '',
    category: goalData.category,
    status: 'active',
    milestones: milestonesList,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    sourceConversationId: goalData.sourceConversationId || null,
  };

  await setDoc(goalDoc, cleanPayload(goal));
  return goal;
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const goalsRef = collection(db, 'users', userId, 'goals');
  const q = query(goalsRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Goal);
}

export async function updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(ref, cleanPayload({
    ...updates,
    updatedAt: Date.now(),
  }));
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'goals', goalId);
  await deleteDoc(ref);
}

// ----------------------------------------------------
// Daily Reflections (users/{uid}/dailyReflections)
// ----------------------------------------------------
export async function saveDailyReflection(
  userId: string,
  reflection: Omit<DailyReflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<DailyReflection> {
  const dateKey = reflection.dateStr; // e.g. "2026-08-26"
  const ref = doc(db, 'users', userId, 'dailyReflections', dateKey);
  const now = Date.now();

  const existingSnap = await getDoc(ref);
  const fullReflection: DailyReflection = {
    id: dateKey,
    userId,
    dateStr: dateKey,
    rawPromptText: reflection.rawPromptText,
    synthesis: reflection.synthesis,
    mood: reflection.mood,
    createdAt: existingSnap.exists() ? (existingSnap.data().createdAt || now) : now,
    updatedAt: now,
  };

  await setDoc(ref, cleanPayload(fullReflection));
  return fullReflection;
}

export async function getDailyReflections(userId: string): Promise<DailyReflection[]> {
  const ref = collection(db, 'users', userId, 'dailyReflections');
  const q = query(ref, orderBy('dateStr', 'desc'), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as DailyReflection);
}

export async function getDailyReflectionForDate(userId: string, dateStr: string): Promise<DailyReflection | null> {
  const ref = doc(db, 'users', userId, 'dailyReflections', dateStr);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as DailyReflection) : null;
}

// ----------------------------------------------------
// Insights Reports (users/{uid}/insights)
// ----------------------------------------------------
export async function saveInsightReport(
  userId: string,
  reportData: Omit<InsightReport, 'id' | 'userId'>
): Promise<InsightReport> {
  const insightsRef = collection(db, 'users', userId, 'insights');
  const docRef = doc(insightsRef);

  const report: InsightReport = {
    id: docRef.id,
    userId,
    ...reportData,
  };

  await setDoc(docRef, cleanPayload(report));
  return report;
}

export async function getInsightReports(userId: string): Promise<InsightReport[]> {
  const ref = collection(db, 'users', userId, 'insights');
  const q = query(ref, orderBy('generatedAt', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as InsightReport);
}

// ----------------------------------------------------
// Statistics & Streak Calculator
// ----------------------------------------------------
export async function getJournalStats(userId: string): Promise<JournalStats> {
  const convs = await getConversations(userId);
  const dailyReflections = await getDailyReflections(userId);
  const goals = await getGoals(userId);

  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalReflections = convs.length + dailyReflections.length;

  // Calculate streak based on dates
  const activeDates = new Set<string>();
  convs.forEach(c => {
    const d = new Date(c.createdAt).toISOString().split('T')[0];
    activeDates.add(d);
  });
  dailyReflections.forEach(d => {
    activeDates.add(d.dateStr);
  });

  const sortedDates = Array.from(activeDates).sort().reverse();
  
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
    let checkDate = sortedDates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
    while (true) {
      const dateString = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dateString)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    totalReflections,
    currentStreak,
    longestStreak: Math.max(currentStreak, sortedDates.length > 0 ? 1 : 0),
    activeGoalsCount: activeGoals,
    completedGoalsCount: completedGoals,
    totalWordsWritten: 0,
    lastReflectionDate: sortedDates[0] || null,
  };
}

// ----------------------------------------------------
// Data Export & User Data Deletion
// ----------------------------------------------------
export async function exportAllUserData(userId: string): Promise<{
  exportedAt: string;
  conversations: Array<Conversation & { messages: JournalMessage[] }>;
  goals: Goal[];
  dailyReflections: DailyReflection[];
  insights: InsightReport[];
}> {
  const convs = await getConversations(userId);
  const convsWithMessages = await Promise.all(
    convs.map(async conv => {
      const msgs = await getMessages(userId, conv.id);
      return { ...conv, messages: msgs };
    })
  );

  const goals = await getGoals(userId);
  const dailyReflections = await getDailyReflections(userId);
  const insights = await getInsightReports(userId);

  return {
    exportedAt: new Date().toISOString(),
    conversations: convsWithMessages,
    goals,
    dailyReflections,
    insights,
  };
}

export function formatExportAsMarkdown(data: {
  exportedAt: string;
  conversations: Array<Conversation & { messages: JournalMessage[] }>;
  goals: Goal[];
  dailyReflections: DailyReflection[];
}): string {
  let md = `# MindScribe Journal Export\nExported on: ${new Date(data.exportedAt).toLocaleString()}\n\n`;

  md += `## 🎯 Goals (${data.goals.length})\n\n`;
  data.goals.forEach(g => {
    md += `### ${g.title} [${g.status.toUpperCase()}]\n`;
    md += `*Category: ${g.category}*\n\n`;
    if (g.description) md += `${g.description}\n\n`;
    md += `**Milestones:**\n`;
    g.milestones.forEach(m => {
      md += `- [${m.completed ? 'x' : ' '}] ${m.text}\n`;
    });
    md += `\n---\n\n`;
  });

  md += `## 📅 Daily Reflections (${data.dailyReflections.length})\n\n`;
  data.dailyReflections.forEach(dr => {
    md += `### Reflection: ${dr.dateStr}\n\n`;
    md += `${dr.rawPromptText}\n\n`;
    if (dr.synthesis) {
      md += `**AI Synthesis:**\n`;
      md += `*Summary*: ${dr.synthesis.dailySummary}\n\n`;
      if (dr.synthesis.whatWentWell?.length) {
        md += `*What went well:*\n`;
        dr.synthesis.whatWentWell.forEach(w => md += `- ${w}\n`);
        md += `\n`;
      }
      if (dr.synthesis.challenges?.length) {
        md += `*Challenges:*\n`;
        dr.synthesis.challenges.forEach(c => md += `- ${c}\n`);
        md += `\n`;
      }
      if (dr.synthesis.tomorrowFocus) {
        md += `*Tomorrow's Focus*: ${dr.synthesis.tomorrowFocus}\n\n`;
      }
    }
    md += `\n---\n\n`;
  });

  md += `## 📖 Journal Reflections & AI Sessions (${data.conversations.length})\n\n`;
  data.conversations.forEach(c => {
    md += `### ${c.title}\n`;
    md += `*Date: ${new Date(c.createdAt).toLocaleDateString()} | Tags: ${c.tags.join(', ') || 'None'}*\n\n`;
    c.messages.forEach(m => {
      const sender = m.role === 'user' ? '👤 User' : '✨ Gemini Guide';
      md += `#### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n\n`;
      md += `${m.content}\n\n`;
    });
    md += `\n---\n\n`;
  });

  return md;
}

export async function wipeAllUserData(userId: string): Promise<void> {
  const convs = await getConversations(userId);
  for (const conv of convs) {
    await deleteConversation(userId, conv.id);
  }

  const goals = await getGoals(userId);
  for (const g of goals) {
    await deleteGoal(userId, g.id);
  }

  const dailyReflections = await getDailyReflections(userId);
  for (const dr of dailyReflections) {
    await deleteDoc(doc(db, 'users', userId, 'dailyReflections', dr.id));
  }

  const insights = await getInsightReports(userId);
  for (const ins of insights) {
    await deleteDoc(doc(db, 'users', userId, 'insights', ins.id));
  }

  // Delete user profile doc
  await deleteDoc(doc(db, 'users', userId));
}
