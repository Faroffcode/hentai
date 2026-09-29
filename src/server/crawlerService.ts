import { EventEmitter } from 'events';
import { fetchPageHtml, extractFromHtml } from './apiHandler';
import { savePostToJson, findExistingPostFile, generateSlug, ensureDataDir } from './storageManager';

export interface CrawlerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'scraping' | 'saved' | 'duplicate' | 'warn' | 'error' | 'success' | 'page';
  message: string;
  details?: any;
}

export interface CrawlerConfig {
  baseUrl: string;
  startPage: number;
  endPage: number;
  delayMs: number;
  filterDuplicates: boolean;
  autoSave: boolean;
}

export interface CrawlerStatus {
  state: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  currentPage: number;
  startPage: number;
  endPage: number;
  totalPagesProcessed: number;
  totalPostsFound: number;
  totalSaved: number;
  totalSkipped: number;
  totalErrors: number;
  currentPostTitle?: string;
  currentPostUrl?: string;
  startTime?: number;
  elapsedSeconds: number;
  logs: CrawlerLogEntry[];
  config: CrawlerConfig;
}

class CrawlerService extends EventEmitter {
  private status: CrawlerStatus = {
    state: 'idle',
    currentPage: 1,
    startPage: 1,
    endPage: 5,
    totalPagesProcessed: 0,
    totalPostsFound: 0,
    totalSaved: 0,
    totalSkipped: 0,
    totalErrors: 0,
    elapsedSeconds: 0,
    logs: [],
    config: {
      baseUrl: 'https://watchhentai.net/series/',
      startPage: 1,
      endPage: 5,
      delayMs: 800,
      filterDuplicates: true,
      autoSave: true,
    },
  };

  private stopRequested = false;
  private isPaused = false;
  private timerInterval: NodeJS.Timeout | null = null;
  private maxLogs = 1000;

  constructor() {
    super();
    ensureDataDir();
  }

  public getStatus(): CrawlerStatus {
    if (this.status.startTime && (this.status.state === 'running' || this.status.state === 'paused')) {
      this.status.elapsedSeconds = Math.floor((Date.now() - this.status.startTime) / 1000);
    }
    return { ...this.status };
  }

  public addLog(level: CrawlerLogEntry['level'], message: string, details?: any) {
    const entry: CrawlerLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level,
      message,
      details,
    };

    this.status.logs.push(entry);
    if (this.status.logs.length > this.maxLogs) {
      this.status.logs.shift();
    }

    this.emit('log', entry);
    this.emit('status', this.getStatus());
  }

  public clearLogs() {
    this.status.logs = [];
    this.emit('status', this.getStatus());
  }

  public async start(config: Partial<CrawlerConfig>): Promise<CrawlerStatus> {
    if (this.status.state === 'running' || this.status.state === 'paused') {
      throw new Error('Crawler is already running. Stop the active crawler first.');
    }

    this.stopRequested = false;
    this.isPaused = false;

    const mergedConfig: CrawlerConfig = {
      baseUrl: config.baseUrl?.trim() || 'https://watchhentai.net/series/',
      startPage: Math.max(1, Number(config.startPage) || 1),
      endPage: Math.max(1, Number(config.endPage) || 5),
      delayMs: Math.max(200, Number(config.delayMs) || 800),
      filterDuplicates: config.filterDuplicates !== undefined ? Boolean(config.filterDuplicates) : true,
      autoSave: config.autoSave !== undefined ? Boolean(config.autoSave) : true,
    };

    if (mergedConfig.endPage < mergedConfig.startPage) {
      mergedConfig.endPage = mergedConfig.startPage;
    }

    this.status = {
      state: 'running',
      currentPage: mergedConfig.startPage,
      startPage: mergedConfig.startPage,
      endPage: mergedConfig.endPage,
      totalPagesProcessed: 0,
      totalPostsFound: 0,
      totalSaved: 0,
      totalSkipped: 0,
      totalErrors: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      logs: this.status.logs,
      config: mergedConfig,
    };

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.status.startTime && this.status.state === 'running') {
        this.status.elapsedSeconds = Math.floor((Date.now() - this.status.startTime) / 1000);
      }
    }, 1000);

    this.addLog('info', `🚀 Initializing Auto Scraper from Page ${mergedConfig.startPage} to ${mergedConfig.endPage}`);
    this.addLog('info', `⚙️ Config: Delay ${mergedConfig.delayMs}ms | Duplicate Filter: ${mergedConfig.filterDuplicates ? 'ON' : 'OFF'} | Auto-Save: ${mergedConfig.autoSave ? 'ON (/data/hntX)' : 'OFF'}`);

    // Run the crawling loop in background
    this.runLoop().catch(err => {
      this.status.state = 'error';
      this.addLog('error', `❌ Crawler fatal error: ${err.message}`);
    });

    return this.getStatus();
  }

  public stop(): CrawlerStatus {
    if (this.status.state === 'running' || this.status.state === 'paused') {
      this.stopRequested = true;
      this.isPaused = false;
      this.status.state = 'stopped';
      this.addLog('warn', `🛑 Auto Scraper stop requested by user.`);
    }
    if (this.timerInterval) clearInterval(this.timerInterval);
    return this.getStatus();
  }

  public pause(): CrawlerStatus {
    if (this.status.state === 'running') {
      this.isPaused = true;
      this.status.state = 'paused';
      this.addLog('warn', `⏸️ Auto Scraper paused.`);
    }
    return this.getStatus();
  }

  public resume(): CrawlerStatus {
    if (this.status.state === 'paused') {
      this.isPaused = false;
      this.status.state = 'running';
      this.addLog('info', `▶️ Auto Scraper resumed.`);
    }
    return this.getStatus();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async waitWhilePaused(): Promise<boolean> {
    while (this.isPaused && !this.stopRequested) {
      await this.sleep(300);
    }
    return !this.stopRequested;
  }

  private buildPageUrl(baseUrl: string, pageNum: number): string {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    if (pageNum === 1) {
      return `${cleanBase}/`;
    }
    // If base already has /page/, replace it
    if (cleanBase.includes('/page/')) {
      return cleanBase.replace(/\/page\/\d+/, `/page/${pageNum}/`);
    }
    return `${cleanBase}/page/${pageNum}/`;
  }

  private async runLoop(): Promise<void> {
    const { startPage, endPage, baseUrl, delayMs, filterDuplicates, autoSave } = this.status.config;

    for (let page = startPage; page <= endPage; page++) {
      if (this.stopRequested) break;
      if (!(await this.waitWhilePaused())) break;

      this.status.currentPage = page;
      const pageUrl = this.buildPageUrl(baseUrl, page);

      this.addLog('page', `════════════════════════════════════════════════════════`);
      this.addLog('page', `📄 [PAGE ${page}/${endPage}] Fetching catalog from: ${pageUrl}`);

      let catalogHtml: string;
      try {
        catalogHtml = await fetchPageHtml(pageUrl, 15000);
      } catch (err: any) {
        this.status.totalErrors++;
        this.addLog('error', `❌ Failed to fetch catalog Page ${page}: ${err.message}`);
        // Delay and proceed to next page
        await this.sleep(delayMs);
        continue;
      }

      const catalogData = extractFromHtml(catalogHtml, pageUrl);
      const catalogPosts = catalogData.catalogPosts || [];

      if (catalogPosts.length === 0) {
        this.addLog('warn', `⚠️ No series posts found on Page ${page}. End of catalog reached.`);
        break;
      }

      this.addLog('info', `📦 Found ${catalogPosts.length} series posts on Page ${page}`);

      // Loop through each series post on this catalog page
      for (let i = 0; i < catalogPosts.length; i++) {
        if (this.stopRequested) break;
        if (!(await this.waitWhilePaused())) break;

        const postMeta = catalogPosts[i];
        this.status.currentPostTitle = postMeta.title;
        this.status.currentPostUrl = postMeta.url;
        this.status.totalPostsFound++;

        const slug = generateSlug(postMeta.title, postMeta.url);

        // 1. Check Duplicate Filter
        if (filterDuplicates) {
          const existing = findExistingPostFile(slug, postMeta.url);
          if (existing) {
            this.status.totalSkipped++;
            this.addLog('duplicate', `⏭️ [DUPLICATE SKIPPED] (${i + 1}/${catalogPosts.length}) "${postMeta.title}" [found in data/${existing.folder}/${existing.filename}]`);
            continue;
          }
        }

        // 2. Fetch full series details
        this.addLog('scraping', `🔍 [SCRAPING] (${i + 1}/${catalogPosts.length}) "${postMeta.title}" from ${postMeta.url} ...`);

        try {
          const seriesHtml = await fetchPageHtml(postMeta.url, 12000);
          const seriesExtracted = extractFromHtml(seriesHtml, postMeta.url);

          const fullPostPayload = {
            slug,
            title: seriesExtracted.title || postMeta.title,
            websiteUrl: postMeta.url,
            thumbnail: seriesExtracted.thumbnail || postMeta.thumbnail,
            description: seriesExtracted.description || seriesExtracted.synopsis || postMeta.synopsis || '',
            synopsis: seriesExtracted.synopsis || seriesExtracted.description || postMeta.synopsis || '',
            siteName: 'watchhentai.net',
            galleryImages: Array.isArray(seriesExtracted.galleryImages) && seriesExtracted.galleryImages.length > 0 
              ? seriesExtracted.galleryImages 
              : (postMeta.galleryImages || []),
            episodes: Array.isArray(seriesExtracted.episodes) ? seriesExtracted.episodes : [],
          };

          // 3. Auto-save to data/hntX/
          if (autoSave) {
            const saveRes = await savePostToJson(fullPostPayload);
            this.status.totalSaved++;
            this.addLog(
              'saved',
              `💾 [SAVED] "${fullPostPayload.title}" -> data/${saveRes.folder}/${saveRes.filename} | 📸 ${fullPostPayload.galleryImages.length} backdrops | 🎬 ${fullPostPayload.episodes.length} episodes (${saveRes.totalInFolder}/10 in ${saveRes.folder})`
            );
          } else {
            this.addLog('info', `✅ [EXTRACTED] "${fullPostPayload.title}" (${fullPostPayload.episodes.length} eps, ${fullPostPayload.galleryImages.length} backdrops)`);
          }

        } catch (err: any) {
          this.status.totalErrors++;
          this.addLog('error', `❌ [ERROR] Failed to extract "${postMeta.title}": ${err.message}`);
        }

        // Delay between posts to respect rate limits
        if (delayMs > 0 && i < catalogPosts.length - 1) {
          await this.sleep(delayMs);
        }
      }

      this.status.totalPagesProcessed++;
      this.addLog('success', `✨ Finished Page ${page}/${endPage}. Processed ${catalogPosts.length} posts on this page.`);

      // Delay before advancing to next page
      if (page < endPage && !this.stopRequested) {
        await this.sleep(delayMs);
      }
    }

    if (this.timerInterval) clearInterval(this.timerInterval);

    if (this.stopRequested) {
      this.status.state = 'stopped';
      this.addLog('warn', `🛑 Auto Scraper stopped. Total Saved: ${this.status.totalSaved}, Total Skipped: ${this.status.totalSkipped}, Errors: ${this.status.totalErrors}`);
    } else {
      this.status.state = 'completed';
      this.addLog('success', `🎉 Auto Scraper COMPLETED! Total Pages: ${this.status.totalPagesProcessed} | Saved: ${this.status.totalSaved} | Duplicates Skipped: ${this.status.totalSkipped} in ${this.status.elapsedSeconds}s`);
    }

    this.emit('status', this.getStatus());
  }
}

export const crawlerService = new CrawlerService();
