import React from 'react';
import {
  BookOpen,
  Sparkles,
  Lock,
  Target,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, loading, error } = useAuth();

  const features = [
    {
      icon: Sparkles,
      title: '6 Guided AI Reflection Modes',
      description:
        'Go beyond generic chat: summarize thoughts, unpack emotional undertones, brainstorm creative approaches, uncover hidden themes, and extract next steps.',
    },
    {
      icon: Lock,
      title: 'Private Isolated Architecture',
      description:
        'Your reflections belong strictly to you. Enforced by Firebase Authentication and user-isolated Cloud Firestore security rules.',
    },
    {
      icon: Calendar,
      title: 'Daily Evening Check-ins',
      description:
        'Capture your day freely and let Gemini synthesize key events, gratitude, friction, lessons learned, and tomorrow’s primary intention.',
    },
    {
      icon: Target,
      title: 'Turn Insights into Goals',
      description:
        'Automatically extract actionable goals and sequential milestones directly from your journal entries into an interactive tracker.',
    },
    {
      icon: Brain,
      title: 'Historical Growth Insights',
      description:
        'Discover recurring life themes, mindset progression, and constructive growth opportunities over weeks and months of writing.',
    },
    {
      icon: Layers,
      title: 'Full Data Control & Export',
      description:
        'Export your entire journal history anytime as structured JSON or clean formatted Markdown. Zero vendor lock-in.',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-stone-100">
              MindScribe
            </h1>
            <p className="text-xs text-stone-400 font-sans">Private AI Journal & Reflection</p>
          </div>
        </div>

        <button
          id="landing-header-login-btn"
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium border border-stone-700 transition-colors cursor-pointer"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 text-amber-400" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 sm:py-20 text-center flex flex-col items-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Thoughtful Self-Discovery Powered by Gemini AI</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-serif font-bold text-stone-100 tracking-tight leading-[1.15] max-w-3xl mb-6">
          A tranquil sanctuary for your thoughts, reflections, and growth.
        </h2>

        <p className="text-lg sm:text-xl text-stone-300 font-sans max-w-2xl leading-relaxed mb-10">
          MindScribe transforms free-form journaling into deep self-awareness. 
          Unpack emotions, extract tangible goals, and cultivate daily clarity inside a secure, private space.
        </p>

        {/* Error Banner */}
        {error && (
          <div
            id="landing-auth-error-banner"
            className="w-full max-w-md mb-6 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm text-left"
          >
            <p className="font-semibold">Authentication Notice:</p>
            <p className="text-xs mt-1 text-rose-300">{error}</p>
          </div>
        )}

        {/* Main CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            id="landing-google-signin-hero-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-base shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Security badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Firestore Isolation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero Public Gemini Key Leaks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Non-Clinical Personal Observations</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                id={`landing-feature-card-${idx}`}
                className="p-6 rounded-2xl bg-stone-800/40 border border-stone-800 hover:border-stone-700/80 transition-colors backdrop-blur-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-stone-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-8 border-t border-stone-800/80 text-center text-xs text-stone-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>MindScribe — Production-Ready AI Journaling Platform</p>
        <p>Powered by Google Cloud Run, Cloud Firestore & Gemini API</p>
      </footer>
    </div>
  );
};
