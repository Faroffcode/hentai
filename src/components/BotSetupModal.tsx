import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { verifyTelegramBot } from '../services/api';
import {
  X,
  Bot,
  KeyRound,
  Hash,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  SendHorizontal
} from 'lucide-react';

export const BotSetupModal: React.FC = () => {
  const { botConfig, setBotConfig, botModalOpen, setBotModalOpen, isVerifyingBot, setIsVerifyingBot } = useAppStore();

  const [tokenInput, setTokenInput] = useState(botConfig.botToken || '');
  const [chatIdInput, setChatIdInput] = useState(botConfig.chatId || '');
  const [topicIdInput, setTopicIdInput] = useState(botConfig.topicId || '');
  const [rateLimitDelayInput, setRateLimitDelayInput] = useState(botConfig.rateLimitDelayMs || 1500);
  const [autoRetryInput, setAutoRetryInput] = useState(botConfig.autoRetryOn429 !== false);
  const [maxRetriesInput, setMaxRetriesInput] = useState(botConfig.maxRetries || 3);
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!botModalOpen) return null;

  const handleVerify = async () => {
    setErrorMsg(null);
    setSuccessInfo(null);

    const token = tokenInput.trim();
    const chat = chatIdInput.trim();

    if (!token) {
      setErrorMsg('Please paste your Telegram Bot Token from @BotFather');
      return;
    }

    setIsVerifyingBot(true);
    try {
      const res = await verifyTelegramBot(token, chat || undefined);
      
      setBotConfig({
        botToken: token,
        chatId: chat,
        topicId: topicIdInput.trim(),
        verified: true,
        botInfo: {
          id: res.bot?.id,
          username: res.bot?.username,
          firstName: res.bot?.first_name,
        },
        chatInfo: res.chat
          ? {
              id: res.chat.id,
              title: res.chat.title,
              type: res.chat.type,
              username: res.chat.username,
            }
          : undefined,
        warning: res.warning,
      });

      if (res.warning) {
        setSuccessInfo(`Bot connected as @${res.bot?.username}! Note: ${res.warning}`);
      } else {
        setSuccessInfo(
          `Successfully connected to @${res.bot?.username}${
            res.chat ? ` & target chat "${res.chat.title || res.chat.username}"` : ''
          }!`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check token & channel ID.');
      setBotConfig({
        verified: false,
      });
    } finally {
      setIsVerifyingBot(false);
    }
  };

  const handleSaveAndClose = () => {
    setBotConfig({
      botToken: tokenInput.trim(),
      chatId: chatIdInput.trim(),
      topicId: topicIdInput.trim(),
      rateLimitDelayMs: Number(rateLimitDelayInput) || 1500,
      autoRetryOn429: autoRetryInput,
      maxRetries: Number(maxRetriesInput) || 3,
    });
    setBotModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Telegram Bot Configuration</h2>
              <p className="text-xs text-slate-400">Connect your bot to send posts & episode buttons to channels</p>
            </div>
          </div>
          <button
            onClick={() => setBotModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Status Banner */}
          {botConfig.verified && botConfig.botInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-300">
                  Bot Connected: @{botConfig.botInfo.username} ({botConfig.botInfo.firstName})
                </div>
                {botConfig.chatInfo ? (
                  <div className="text-emerald-400/90 mt-0.5">
                    Target: <b>{botConfig.chatInfo.title}</b> ({botConfig.chatInfo.type})
                  </div>
                ) : (
                  <div className="text-slate-400 mt-0.5">
                    No target channel verified yet. Provide your channel username or ID below.
                  </div>
                )}
                {botConfig.warning && (
                  <div className="text-amber-300 mt-1 font-medium bg-amber-950/60 p-2 rounded border border-amber-500/30">
                    ⚠️ {botConfig.warning}
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Bot Token Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                Telegram Bot Token <span className="text-rose-400">*</span>
              </span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300 text-[11px] flex items-center gap-1 hover:underline"
              >
                Get from @BotFather <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Your token is stored locally in your browser and used only to communicate with Telegram API.
            </p>
          </div>

          {/* Chat ID Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-sky-400" />
                Target Channel or Group ID <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-slate-500">e.g. @your_channel or -100123456789</span>
            </label>
            <input
              type="text"
              value={chatIdInput}
              onChange={e => setChatIdInput(e.target.value)}
              placeholder="@animedrama_hub or -1001987654321"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              <b>Important:</b> You must add your bot as an <b>Administrator</b> with "Post Messages" permission in your channel!
            </p>
          </div>

          {/* Optional Message Thread / Topic ID */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
              <span>Forum Topic / Thread ID (Optional)</span>
              <span className="text-[11px] text-slate-500">Leave blank for regular channels</span>
            </label>
            <input
              type="text"
              value={topicIdInput}
              onChange={e => setTopicIdInput(e.target.value)}
              placeholder="e.g. 42 (Only for supergroups with topics)"
              className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Telegram Rate Limit & Anti-Flood Safeguards */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Telegram API Rate Limit & Delay Controls
              </span>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Anti-429 Protection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              {/* Delay Selector */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Consecutive Upload Delay</label>
                <select
                  value={rateLimitDelayInput}
                  onChange={e => setRateLimitDelayInput(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value={1000}>1000ms (1.0s - Fast)</option>
                  <option value={1500}>1500ms (1.5s - Recommended)</option>
                  <option value={2000}>2000ms (2.0s - Safe)</option>
                  <option value={3000}>3000ms (3.0s - High Traffic)</option>
                  <option value={5000}>5000ms (5.0s - Maximum Spacing)</option>
                </select>
                <p className="text-[10px] text-slate-500">Minimum spacing between posts & ZIP uploads</p>
              </div>

              {/* Max Retries */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Max Retries on Rate Limit</label>
                <select
                  value={maxRetriesInput}
                  onChange={e => setMaxRetriesInput(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value={1}>1 Attempt (No Retry)</option>
                  <option value={2}>2 Retries</option>
                  <option value={3}>3 Retries (Default)</option>
                  <option value={5}>5 Retries (Maximum)</option>
                </select>
                <p className="text-[10px] text-slate-500">Number of automatic retry attempts</p>
              </div>
            </div>

            {/* Auto-Retry Toggle */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <span className="font-medium">Auto-Wait on Telegram 429 Limit (<code className="text-sky-300 font-mono">retry_after</code>)</span>
              <input
                type="checkbox"
                checked={autoRetryInput}
                onChange={e => setAutoRetryInput(e.target.checked)}
                className="w-4 h-4 text-sky-500 rounded bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Quick Setup Guide Checklist */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              Quick 30-Second Setup Guide:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">@BotFather</a> in Telegram and send <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded font-mono">/newbot</code>.</li>
              <li>Give your bot a name and username, then copy the <b>HTTP API Token</b> into the field above.</li>
              <li>Create or open your Telegram Channel ➡️ <b>Channel Settings</b> ➡️ <b>Administrators</b> ➡️ Add your bot as Admin.</li>
              <li>Enter your channel public username (e.g. <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded font-mono">@mychannel</code>) or private channel ID.</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifyingBot}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingBot ? 'animate-spin text-sky-400' : ''}`} />
            {isVerifyingBot ? 'Verifying...' : 'Verify Connection'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBotModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition"
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
