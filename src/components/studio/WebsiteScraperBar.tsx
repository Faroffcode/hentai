import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { scrapeWebsite, savePostToLibrary } from '../../services/api';
import { 
  Globe, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RotateCcw,
  Folder,
  Save,
  Check
} from 'lucide-react';

export const WebsiteScraperBar: React.FC = () => {
  const { 
    post, 
    setPost, 
    isScraping, 
    setIsScraping,
    setActiveCatalogIndex,
    autoSaveToLibrary,
    setAutoSaveToLibrary,
    setDataLibraryModalOpen,
    lastSavedLocation,
    setLastSavedLocation
  } = useAppStore();

  const [inputUrl, setInputUrl] = useState(post.websiteUrl || '');
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<string | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleScrape = async (targetUrl?: string) => {
    const urlToScrape = (targetUrl || inputUrl).trim();
    if (!urlToScrape) {
      setScrapeError('Please enter a website URL to extract (e.g. series, movie, or catalog link)');
      return;
    }

    setScrapeError(null);
    setScrapeSuccess(null);
    setSaveSuccessMsg(null);
    setIsScraping(true);

    try {
      const extracted = await scrapeWebsite(urlToScrape);
      setPost(extracted);
      setInputUrl(extracted.websiteUrl);
      setActiveCatalogIndex(0);

      if (extracted.isCatalog && extracted.catalogPosts && extracted.catalogPosts.length > 0) {
        setScrapeSuccess(
          `Extracted ${extracted.catalogPosts.length} posts from archive! Broadcast all or select any post below.`
        );
      } else {
        setScrapeSuccess(
          `Successfully extracted "${extracted.title}" with ${extracted.episodes.length} episode links!`
        );
      }
    } catch (err: any) {
      setScrapeError(
        `${err.message || 'Scrape failed'}. Tip: You can adjust fields manually or use bulk links import below.`
      );
    } finally {
      setIsScraping(false);
    }
  };

  const handleManualSave = async () => {
    if (!post.title && !post.websiteUrl) {
      setScrapeError('Please extract or enter a post title before saving to library.');
      return;
    }
    setIsManualSaving(true);
    setScrapeError(null);
    try {
      const res = await savePostToLibrary(post);
      setLastSavedLocation({ folder: res.folder, filename: res.filename });
      setSaveSuccessMsg(`Saved to /data/${res.folder}/${res.filename} (${res.totalInFolder}/10 posts)`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setScrapeError(`Failed to save to library: ${err.message}`);
    } finally {
      setIsManualSaving(false);
    }
  };

  const handleClearWorkspace = () => {
    setInputUrl('');
    setScrapeError(null);
    setScrapeSuccess(null);
    setSaveSuccessMsg(null);
    setPost({
      websiteUrl: '',
      title: '',
      thumbnail: '',
      description: '',
      siteName: '',
      episodes: [],
      isCatalog: false,
      catalogPosts: [],
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3.5 sm:space-y-4 backdrop-blur-sm">
      
      {/* Title / Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-300">
          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-semibold text-slate-200">Website URL Extractor</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            — Single posts & series pages automatically save into data/hnt1, hnt2...
          </span>
        </div>

        {/* Action Controls (Library modal launcher, Manual Save, Clear) */}
        <div className="flex items-center gap-2">
          {/* Save Current Post to Library */}
          {post.title && (
            <button
              type="button"
              onClick={handleManualSave}
              disabled={isManualSaving}
              className="flex items-center gap-1.5 text-[11px] font-medium text-sky-300 bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
              title="Save current post into /data/hntX structure"
            >
              <Save className="w-3 h-3 text-sky-400" />
              <span>{isManualSaving ? 'Saving...' : 'Save to Library'}</span>
            </button>
          )}

          {/* Open Data Library Explorer */}
          <button
            type="button"
            onClick={() => setDataLibraryModalOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg transition cursor-pointer"
            title="Browse all saved JSON files in data/hnt1, data/hnt2..."
          >
            <Folder className="w-3 h-3 text-amber-400" />
            <span>Data Library</span>
          </button>

          {/* Clear workspace button if content exists */}
          {(inputUrl || post.title || post.episodes.length > 0 || (post.catalogPosts && post.catalogPosts.length > 0)) && (
            <button
              type="button"
              onClick={handleClearWorkspace}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Group - Responsive flex */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Globe className="w-4 h-4" />
          </div>
          <input
            type="url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleScrape();
              }
            }}
            placeholder="Paste series URL or catalog link (e.g. https://watchhentai.net/series/)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 sm:py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition font-mono min-h-[42px]"
          />
          {inputUrl && (
            <button
              type="button"
              onClick={() => {
                setInputUrl('');
                setScrapeError(null);
                setScrapeSuccess(null);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleScrape()}
          disabled={isScraping || !inputUrl.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 disabled:opacity-50 transition shrink-0 cursor-pointer min-h-[42px]"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Extracting Posts...</span>
            </>
          ) : (
            <>
              <span>Extract Website</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Storage Save Notification */}
      {saveSuccessMsg && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-sky-950/60 border border-sky-500/30 text-sky-200 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate font-mono text-[11px]">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-sky-400/70 hover:text-sky-300 shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Notification */}
      {scrapeSuccess && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{scrapeSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setScrapeSuccess(null)}
            className="text-emerald-400/70 hover:text-emerald-300 shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {scrapeError && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{scrapeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setScrapeError(null)}
            className="text-rose-400/70 hover:text-rose-300 shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
