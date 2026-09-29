import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  FileEdit,
  Flame,
  Folder,
  Send,
  History,
  Bot,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Workflow,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    setDataLibraryModalOpen,
    setBotModalOpen,
    botConfig,
    crawlerRunning
  } = useAppStore();

  const navItems = [
    {
      id: 'studio' as const,
      label: 'Studio Editor',
      sublabel: 'Single Post & Live Preview',
      icon: FileEdit,
      color: 'text-sky-400',
      activeBg: 'bg-sky-500 text-white shadow-lg shadow-sky-500/20',
    },
    {
      id: 'crawler' as const,
      label: 'Auto Scraper',
      sublabel: 'Multi-Page Series Crawler',
      icon: Flame,
      color: 'text-amber-400',
      activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20',
      badge: crawlerRunning ? 'RUNNING' : undefined,
    },
    {
      id: 'batch' as const,
      label: 'Batch Sender',
      sublabel: 'Multi-URL Broadcast',
      icon: Send,
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20',
    },
    {
      id: 'history' as const,
      label: 'Post History',
      sublabel: 'Telegram Sent Log',
      icon: History,
      color: 'text-teal-400',
      activeBg: 'bg-teal-600 text-white shadow-lg shadow-teal-600/20',
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-slate-800/80 bg-slate-950/95 transition-all duration-300 select-none shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-30 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Nav Items */}
      <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
        
        {/* Navigation Section Title */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Workspaces
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group relative ${
                isActive
                  ? item.activeBg
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition ${
                  isActive ? 'text-white' : item.color
                }`}
              />

              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-400 text-slate-950 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] block truncate ${
                      isActive ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    {item.sublabel}
                  </span>
                </div>
              )}

              {/* Pulsing indicator when collapsed and active/running */}
              {sidebarCollapsed && item.badge && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </button>
          );
        })}

        {/* Data Library Modal Direct Launcher */}
        <div className="pt-3">
          {!sidebarCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Storage
            </div>
          )}

          <button
            type="button"
            onClick={() => setDataLibraryModalOpen(true)}
            title={sidebarCollapsed ? 'Data Library (data/hntX)' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer"
          >
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">Data Library</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    data/hntX
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  10 posts per folder JSON
                </span>
              </div>
            )}
          </button>
        </div>

      </div>

      {/* Bottom Bot Status & Collapse Toggle */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 space-y-2">
        
        {/* Telegram Bot Quick Card */}
        <button
          type="button"
          onClick={() => setBotModalOpen(true)}
          title={sidebarCollapsed ? 'Telegram Bot Setup' : undefined}
          className="w-full flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-left"
        >
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              botConfig.verified
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            <Bot className="w-4 h-4" />
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200 truncate">
                {botConfig.verified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">@{botConfig.botInfo?.username || 'Bot Connected'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Setup Bot</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {botConfig.chatId ? botConfig.chatId : 'No target channel'}
              </p>
            </div>
          )}
        </button>

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition cursor-pointer text-xs"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px]">Collapse Sidebar</span>
            </div>
          )}
        </button>

      </div>
    </aside>
  );
};
