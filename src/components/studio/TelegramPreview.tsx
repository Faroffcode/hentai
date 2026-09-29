import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sendPostToTelegram, formatCaption } from '../../services/api';
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Bot,
  Hash,
  Share2,
  Pin,
  BellOff,
  MoreVertical,
  Search,
  ArrowUpRight
} from 'lucide-react';

export const TelegramPreview: React.FC = () => {
  const {
    post,
    botConfig,
    templateSettings,
    setBotModalOpen,
    isSending,
    setIsSending,
    addHistoryItem
  } = useAppStore();

  const [sendResult, setSendResult] = useState<{
    success: boolean;
    messageId?: number;
    postLink?: string;
    error?: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  // Generate formatted caption for live preview
  const formattedHtml = formatCaption(
    post,
    templateSettings.captionTemplate,
    templateSettings.includeTextLinks,
    templateSettings.includeSynopsis ?? false
  );

  // Group inline keyboard buttons based on selected layout
  const getButtonsRows = () => {
    if (templateSettings.buttonsLayout === 'none' || post.episodes.length === 0) {
      return [];
    }
    let cols = 2;
    if (templateSettings.buttonsLayout === '1-col') cols = 1;
    if (templateSettings.buttonsLayout === '3-col') cols = 3;
    if (templateSettings.buttonsLayout === '4-col') cols = 4;

    const rows: typeof post.episodes[] = [];
    for (let i = 0; i < post.episodes.length; i += cols) {
      rows.push(post.episodes.slice(i, i + cols));
    }
    return rows;
  };

  const buttonRows = getButtonsRows();

  // Send action
  const handleSend = async () => {
    setSendResult(null);

    if (!botConfig.botToken || !botConfig.chatId) {
      setBotModalOpen(true);
      return;
    }

    setIsSending(true);
    try {
      const res = await sendPostToTelegram({
        botConfig,
        templateSettings,
        postData: post,
      });

      setSendResult({
        success: true,
        messageId: res.messageId,
        postLink: res.postLink,
      });

      addHistoryItem({
        title: post.title,
        thumbnail: post.thumbnail,
        chatId: botConfig.chatId,
        chatTitle: botConfig.chatInfo?.title || botConfig.chatId,
        episodesCount: post.episodes.length,
        status: 'sent',
        messageId: res.messageId,
        telegramLink: res.postLink,
        postData: { ...post },
      });
    } catch (err: any) {
      const errMsg = err.message || 'Failed to dispatch post';
      setSendResult({
        success: false,
        error: errMsg,
      });

      addHistoryItem({
        title: post.title,
        thumbnail: post.thumbnail,
        chatId: botConfig.chatId,
        chatTitle: botConfig.chatInfo?.title || botConfig.chatId,
        episodesCount: post.episodes.length,
        status: 'failed',
        errorMessage: errMsg,
        postData: { ...post },
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = (link: string) => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).catch(() => {});
      }
    } catch {
      // ignore
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4 sticky top-20">
      
      {/* Telegram Device Mockup Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-sky-400 -rotate-12" />
          <span>Telegram Live Simulator</span>
        </div>
        <div className="flex items-center gap-2">
          {templateSettings.pinMessage && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
              <Pin className="w-3 h-3" /> Pin
            </span>
          )}
          {templateSettings.disableNotification && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              <BellOff className="w-3 h-3" /> Silent
            </span>
          )}
        </div>
      </div>

      {/* Simulated Telegram Chat Window */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Mock Telegram Channel App Bar */}
        <div className="px-4 py-2.5 bg-[#17212b] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-sky-400/40 shadow">
              {botConfig.chatInfo?.title?.[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white tracking-tight">
                  {botConfig.chatInfo?.title || (botConfig.chatId ? botConfig.chatId : 'My Series Channel')}
                </span>
                <span className="w-3 h-3 rounded-full bg-sky-500 text-white flex items-center justify-center text-[8px]">
                  ✓
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {botConfig.chatInfo?.username || '@channel_broadcast'} • 48.2k subscribers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Search className="w-4 h-4 cursor-pointer hover:text-slate-200" />
            <MoreVertical className="w-4 h-4 cursor-pointer hover:text-slate-200" />
          </div>
        </div>

        {/* Telegram Chat Wallpaper Body */}
        <div className="p-3 sm:p-4 bg-[#0e1621] min-h-[360px] flex flex-col justify-end relative">
          
          {/* Subtle Telegram geometric pattern background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          {(!post.title && !post.thumbnail && post.episodes.length === 0) ? (
            /* Empty State Placeholder in Telegram Mockup */
            <div className="my-auto py-10 px-4 text-center space-y-3 relative z-10 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                  Telegram Live Channel Simulator
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Paste any website URL in the extractor above. Your cover photo, formatted caption, and inline episode buttons will simulate here in real-time.
                </p>
              </div>
            </div>
          ) : (
            /* Message Card Bubble */
            <div className="max-w-[420px] w-full rounded-2xl bg-[#182533] border border-slate-700/60 shadow-lg overflow-hidden text-slate-100 space-y-0 relative z-10 transition-all">
              
              {/* Post Thumbnail Banner */}
              {templateSettings.sendAsPhoto && (
                <div className="w-full relative bg-slate-950 aspect-video overflow-hidden">
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt={post.title || 'Post thumbnail'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={e => {
                        const img = e.currentTarget;
                        if (!img.src.includes('/api/proxy-image')) {
                          img.src = `/api/proxy-image?url=${encodeURIComponent(post.thumbnail)}`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                      <span>No Thumbnail Provided</span>
                    </div>
                  )}
                  {/* Channel watermark stamp */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white/90">
                    {botConfig.chatId ? botConfig.chatId : '@TelePost'}
                  </div>

                  {/* Gallery Screenshots Indicator */}
                  {post.galleryImages && post.galleryImages.length > 0 && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[10px] font-medium text-white flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-pink-400" />
                      <span>{post.galleryImages.length} Gallery Photos</span>
                    </div>
                  )}
                </div>
              )}

              {/* Post Caption Body */}
              <div className="p-3 sm:p-3.5 space-y-2.5 text-[12px] leading-relaxed select-text">
                <div
                  className="prose prose-invert max-w-none break-words text-slate-200"
                  dangerouslySetInnerHTML={{ __html: formattedHtml.replace(/\n/g, '<br/>') }}
                />

                {/* Timestamp & checkmarks */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-sky-400 font-bold">✓✓</span>
                </div>
              </div>

              {/* Telegram Inline Keyboard Buttons Grid */}
              {buttonRows.length > 0 && (
                <div className="p-2 pt-0 space-y-1.5">
                  {buttonRows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
                    >
                      {row.map((ep, epIdx) => (
                        <a
                          key={ep.id || `row-btn-${rowIdx}-${epIdx}-${ep.url || ep.label || epIdx}`}
                          href={ep.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#2b5278]/60 hover:bg-[#2b5278] active:bg-[#203f5d] text-sky-200 hover:text-white border border-sky-400/20 text-center font-medium text-[11px] shadow-sm transition min-h-[36px]"
                          title={ep.url}
                        >
                          <span className="truncate">{ep.label}</span>
                          <ArrowUpRight className="w-3 h-3 text-sky-300/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Target Dispatcher Status Bar */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <Bot className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400">Target: </span>
            <span className="font-semibold text-slate-200">
              {botConfig.chatId ? botConfig.chatId : 'No Channel Configured'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBotModalOpen(true)}
          className="text-sky-400 hover:text-sky-300 font-medium text-[11px] hover:underline shrink-0"
        >
          {botConfig.verified ? 'Change Channel' : 'Configure Bot'}
        </button>
      </div>

      {/* Big Send to Telegram Button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={isSending || (!post.title && !post.thumbnail && post.episodes.length === 0)}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-sky-500/25 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer min-h-[48px]"
      >
        {isSending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Broadcasting to Telegram...</span>
          </>
        ) : (!post.title && !post.thumbnail && post.episodes.length === 0) ? (
          <>
            <Send className="w-4 h-4 opacity-50" />
            <span>Extract or Enter Post to Send</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            <span>Send Post to Telegram Channel</span>
          </>
        )}
      </button>

      {/* Dispatch Result Feedback */}
      {sendResult && (
        <div
          className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
            sendResult.success
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {sendResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-sm">
                {sendResult.success ? 'Post Successfully Published to Telegram!' : 'Failed to Publish Post'}
              </div>
              {sendResult.success ? (
                <div className="text-[11px] text-emerald-300/90">
                  Message ID: <span className="font-mono font-bold">#{sendResult.messageId}</span>
                </div>
              ) : (
                <div className="text-[11px] text-rose-300/90 leading-relaxed">
                  {sendResult.error}
                </div>
              )}
            </div>
          </div>

          {sendResult.success && sendResult.postLink && (
            <div className="flex items-center gap-2 pt-1">
              <a
                href={sendResult.postLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition"
              >
                <span>Open in Telegram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => handleCopyLink(sendResult.postLink!)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 text-xs border border-emerald-500/30 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Post Link'}</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
