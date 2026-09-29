/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { Navbar } from './components/Navbar';
import { BotSetupModal } from './components/BotSetupModal';
import { BulkEpisodesModal } from './components/BulkEpisodesModal';
import { DataLibraryModal } from './components/studio/DataLibraryModal';
import { WebsiteScraperBar } from './components/studio/WebsiteScraperBar';
import { MultiPostManager } from './components/studio/MultiPostManager';
import { PostEditor } from './components/studio/PostEditor';
import { TelegramPreview } from './components/studio/TelegramPreview';
import { FlowBuilder } from './components/pipeline/FlowBuilder';
import { BatchSender } from './components/batch/BatchSender';
import { HistoryList } from './components/history/HistoryList';
import { Sidebar } from './components/layout/Sidebar';
import { AutoCrawlerView } from './components/crawler/AutoCrawlerView';
import { Bot, Send, FileEdit, Flame, Layers, History } from 'lucide-react';

export default function App() {
  const { activeTab, setActiveTab, botConfig, setBotModalOpen, crawlerRunning } = useAppStore();
  const [mobileStudioTab, setMobileStudioTab] = useState<'editor' | 'preview'>('editor');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar />

      {/* Main Body with Sidebar + Workspace Layout */}
      <div className="flex-1 flex w-full">
        
        {/* Left Collapsible Sidebar (Desktop) */}
        <Sidebar />

        {/* Main Content Workspace */}
        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          
          {/* Mobile Tab Selector (Under Navbar on Mobile Screens) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crawler')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer relative ${
                activeTab === 'crawler'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto Scraper</span>
              {crawlerRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Batch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>

          {/* If Bot is not configured, show friendly prompt banner */}
          {!botConfig.botToken && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-sky-200">
                    Connect your Telegram Bot to start publishing to your channel
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Connect your bot token from @BotFather and your target channel (@channel or chat ID).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBotModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition shrink-0 cursor-pointer text-center"
              >
                Configure Bot Now
              </button>
            </div>
          )}

          {/* Auto Scraper Engine View */}
          {activeTab === 'crawler' && <AutoCrawlerView />}

          {/* Studio View */}
          {activeTab === 'studio' && (
            <div className="space-y-4 sm:space-y-6">
              <WebsiteScraperBar />

              {/* Multi-Post Catalog Suite */}
              <MultiPostManager />

              {/* Mobile Segmented Switch: Editor vs Telegram Live Simulator */}
              <div className="lg:hidden flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileStudioTab('editor')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition cursor-pointer ${
                    mobileStudioTab === 'editor'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>1. Post Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileStudioTab('preview')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition cursor-pointer ${
                    mobileStudioTab === 'preview'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                  <span>2. Telegram Preview</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Post Editor & Episodes (7 cols) */}
                <div className={`lg:col-span-7 space-y-6 ${mobileStudioTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
                  <PostEditor />
                </div>

                {/* Right Column: Telegram Live Simulator (5 cols) */}
                <div className={`lg:col-span-5 ${mobileStudioTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
                  <TelegramPreview />
                </div>
              </div>
            </div>
          )}

          {/* Visual Pipeline View */}
          {activeTab === 'flow' && (
            <div className="space-y-4">
              <FlowBuilder />
            </div>
          )}

          {/* Batch Queue View */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              <BatchSender />
            </div>
          )}

          {/* Sent History View */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <HistoryList />
            </div>
          )}

        </main>
      </div>

      {/* Modals */}
      <BotSetupModal />
      <BulkEpisodesModal />
      <DataLibraryModal />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-sky-400 -rotate-12" />
            <span className="font-semibold text-slate-400">TelePost</span>
            <span>—</span>
            <span>Website to Telegram Post Publisher</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] flex-wrap justify-center">
            <span>Inline Keyboard 2-Col Grid</span>
            <span>•</span>
            <span>HTML & Photo Support</span>
            <span>•</span>
            <span>Node.js Telegram API</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
