export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
  lastLoginAt: number;
}

export type ReflectionActionType = 
  | 'chat'
  | 'summarize'
  | 'reflect'
  | 'brainstorm'
  | 'themes'
  | 'extract-goals'
  | 'next-steps';

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actionType?: ReflectionActionType;
  metadata?: {
    modelUsed?: string;
    wordCount?: number;
    extractedGoals?: ExtractedGoalSuggestion[];
  };
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  tags: string[];
  goalId?: string | null;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
  messageCount?: number;
}

export interface GoalMilestone {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: number | null;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: 'Personal' | 'Career' | 'Health' | 'Learning' | 'Mindfulness' | 'Projects' | 'Other';
  status: 'active' | 'completed' | 'archived';
  milestones: GoalMilestone[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
  sourceConversationId?: string | null;
}

export interface ExtractedGoalSuggestion {
  title: string;
  category: Goal['category'];
  milestones: string[];
  rationale?: string;
}

export interface DailyReflectionSynthesis {
  dailySummary: string;
  keyEvents: string[];
  whatWentWell: string[];
  challenges: string[];
  lessonsLearned: string[];
  tomorrowFocus: string;
}

export interface DailyReflection {
  id: string; // format: YYYY-MM-DD
  userId: string;
  dateStr: string; // YYYY-MM-DD
  rawPromptText: string;
  synthesis?: DailyReflectionSynthesis;
  mood?: 'great' | 'good' | 'neutral' | 'challenging' | 'rough';
  createdAt: number;
  updatedAt: number;
}

export interface InsightReport {
  id: string;
  userId: string;
  generatedAt: number;
  entryCountAnalyzed: number;
  dateRange: { start: number; end: number };
  recurringThemes: { theme: string; frequency: string; description: string }[];
  frequentTopics: string[];
  repeatedGoals: string[];
  progressOverTime: string;
  positiveDevelopments: string[];
  areasToImprove: string[];
  commonChallenges: string[];
  priorityShifts: string;
  recommendedFocus: string;
}

export interface JournalStats {
  totalReflections: number;
  currentStreak: number;
  longestStreak: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  totalWordsWritten: number;
  lastReflectionDate?: string | null;
}

export type ActiveTab = 'dashboard' | 'journal' | 'daily' | 'goals' | 'insights' | 'settings';
