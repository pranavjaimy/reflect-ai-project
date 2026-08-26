import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Calendar,
  Target,
  Sparkles,
  ShieldCheck,
  Plus,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewReflection: () => void;
  streakCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewReflection,
  streakCount,
}) => {
  const { currentUser, logout } = useAuth();

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'daily', label: 'Daily Review', icon: Calendar },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'settings', label: 'Privacy & Export', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="navbar-brand-logo"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/30 transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif text-lg font-bold tracking-tight text-stone-100 flex items-center gap-1.5">
                  MindScribe
                  <span className="text-[10px] uppercase font-sans font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    AI Journal
                  </span>
                </span>
              </div>
            </button>

            {/* Streak Badge */}
            {streakCount > 0 && (
              <div
                id="navbar-streak-badge"
                title={`${streakCount} day journaling streak`}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-950/60 border border-orange-700/50 text-orange-300 text-xs font-medium"
              >
                <span>🔥</span>
                <span>{streakCount}d streak</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-stone-800 text-amber-400 font-semibold'
                      : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            <button
              id="navbar-new-reflection-btn"
              onClick={onNewReflection}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Reflection</span>
            </button>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-800">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-stone-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 text-stone-300 flex items-center justify-center text-xs font-semibold">
                  {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              <button
                id="navbar-logout-btn"
                onClick={logout}
                title="Sign out of your journal"
                className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Row */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-stone-800/60 scrollbar-none gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-link-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'bg-stone-800 text-amber-400 font-semibold'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
