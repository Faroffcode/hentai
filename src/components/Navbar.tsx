import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Send, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  Settings2,
  Folder
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    botConfig, 
    setBotModalOpen 
  } = useAppStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/30 shrink-0">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white -rotate-12 translate-x-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg text-slate-100 tracking-tight">TelePost</span>
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Web to Channel
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">Website to Telegram Post & Inline Button Publisher</p>
          </div>
        </div>



        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Data Library Button */}
          <button
            type="button"
            onClick={() => useAppStore.getState().setDataLibraryModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
            title="Browse saved posts in data/hnt1, data/hnt2..."
          >
            <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs hidden sm:inline">Data Library</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              data/
            </span>
          </button>

          {/* Telegram Bot Connection Pill */}
          <button
            onClick={() => setBotModalOpen(true)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              botConfig.verified && botConfig.botToken
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
            }`}
            title="Configure Telegram Bot Token & Target Channel"
          >
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            {botConfig.verified && botConfig.botInfo?.username ? (
              <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">@{botConfig.botInfo.username}</span>
                <span className="sm:hidden font-sans">Bot OK</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Bot Setup</span>
              </span>
            )}
            <Settings2 className="w-3 h-3 opacity-60 ml-0.5 hidden sm:block shrink-0" />
          </button>
        </div>

      </div>
    </header>
  );
};
