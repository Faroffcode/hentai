import { create } from 'zustand';
import type { PostData, BotConfig, TemplateSettings, HistoryItem, BatchItem, EpisodeItem, CatalogPostItem } from '../types';
import { DEFAULT_POST, DEFAULT_TEMPLATE } from './constants';
import { loadStoredConfig, saveToStorage } from './persistence';
import type { AppState } from './stateTypes';

const stored = loadStoredConfig();
const isOldDemoPost = stored?.post?.title?.includes('Solo Leveling') || stored?.post?.title?.includes('Queen of Tears');

const initialPost: PostData = (stored?.post && !isOldDemoPost) ? {
  websiteUrl: stored.post.websiteUrl || '',
  title: stored.post.title || '',
  thumbnail: stored.post.thumbnail || '',
  description: stored.post.description || '',
  synopsis: stored.post.synopsis || stored.post.description || '',
  galleryImages: Array.isArray(stored.post.galleryImages) ? stored.post.galleryImages : [],
  siteName: stored.post.siteName || '',
  episodes: Array.isArray(stored.post.episodes) ? stored.post.episodes : [],
  isCatalog: Boolean(stored.post.isCatalog),
  catalogPosts: Array.isArray(stored.post.catalogPosts) ? stored.post.catalogPosts : [],
} : DEFAULT_POST;

function getTemplateSettings(): TemplateSettings {
  const template = stored?.templateSettings;
  if (!template) return DEFAULT_TEMPLATE;
  if (template.captionTemplate && (template.captionTemplate.includes('{tags}') || template.captionTemplate.includes('Source:'))) {
    return {
      ...template,
      captionTemplate: template.captionTemplate
        .replace(/🌐\s*<b>Source:<\/b>\s*\{website_url\}/g, '🔗 <b>Post Link:</b> {post_url}')
        .replace(/Source:\s*\{website_url\}/g, 'Post Link: {post_url}')
        .replace(/\s*\{tags\}/g, '')
        .trim(),
    };
  }
  return template;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab:'studio',
  setActiveTab:tab=>set({activeTab:tab}),
  sidebarCollapsed:false,
  setSidebarCollapsed:collapsed=>set({sidebarCollapsed:collapsed}),
  crawlerRunning:false,
  setCrawlerRunning:running=>set({crawlerRunning:running}),

  post:initialPost,
  setPost:updater=>set(state=>{
    const nextPost=typeof updater==='function'?updater(state.post):{...state.post,...updater};
    saveToStorage({post:nextPost});
    return {post:nextPost};
  }),
  loadSamplePost:()=>set({post:{...DEFAULT_POST}}),
  addEpisode:ep=>set(state=>({post:{...state.post,episodes:[...state.post.episodes,{id:`ep-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,...ep}]}})),
  updateEpisode:(id,updates)=>set(state=>({post:{...state.post,episodes:state.post.episodes.map(ep=>ep.id===id?{...ep,...updates}:ep)}})),
  removeEpisode:id=>set(state=>({post:{...state.post,episodes:state.post.episodes.filter(ep=>ep.id!==id)}})),
  reorderEpisodes:episodes=>set(state=>({post:{...state.post,episodes}})),
  clearEpisodes:()=>set(state=>({post:{...state.post,episodes:[]}})),

  botConfig:{
    botToken:'',chatId:'',topicId:'',verified:false,rateLimitDelayMs:1500,autoRetryOn429:true,maxRetries:3,
    ...(stored?.botConfig||{})
  },
  setBotConfig:config=>set(state=>{
    const nextConfig={...state.botConfig,...config};
    saveToStorage({botConfig:nextConfig});
    return {botConfig:nextConfig};
  }),
  botModalOpen:false,
  setBotModalOpen:open=>set({botModalOpen:open}),
  isVerifyingBot:false,
  setIsVerifyingBot:loading=>set({isVerifyingBot:loading}),

  templateSettings:getTemplateSettings(),
  setTemplateSettings:settings=>set(state=>{
    const nextSettings={...state.templateSettings,...settings};
    saveToStorage({templateSettings:nextSettings});
    return {templateSettings:nextSettings};
  }),

  bulkEpisodesModalOpen:false,
  setBulkEpisodesModalOpen:open=>set({bulkEpisodesModalOpen:open}),
  dataLibraryModalOpen:false,
  setDataLibraryModalOpen:open=>set({dataLibraryModalOpen:open}),
  autoSaveToLibrary:stored?.autoSaveToLibrary!==undefined?Boolean(stored.autoSaveToLibrary):true,
  setAutoSaveToLibrary:enabled=>{ saveToStorage({autoSaveToLibrary:enabled}); set({autoSaveToLibrary:enabled}); },
  lastSavedLocation:null,
  setLastSavedLocation:loc=>set({lastSavedLocation:loc}),
  isScraping:false,
  setIsScraping:loading=>set({isScraping:loading}),
  isSending:false,
  setIsSending:loading=>set({isSending:loading}),

  history:stored?.history||[],
  addHistoryItem:item=>set(state=>{
    const newItem:HistoryItem={...item,id:`hist-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,timestamp:Date.now()};
    const nextHistory=[newItem,...state.history].slice(0,50);
    saveToStorage({history:nextHistory});
    return {history:nextHistory};
  }),
  clearHistory:()=>{saveToStorage({history:[]});set({history:[]});},
  removeHistoryItem:id=>set(state=>{
    const nextHistory=state.history.filter(item=>item.id!==id);
    saveToStorage({history:nextHistory});
    return {history:nextHistory};
  }),

  batchItems:[],
  setBatchItems:updater=>set(state=>({batchItems:typeof updater==='function'?updater(state.batchItems):updater})),
  addBatchUrl:url=>set(state=>({batchItems:[...state.batchItems,{id:`batch-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,url:url.trim(),status:'idle'}]})),
  clearBatch:()=>set({batchItems:[]}),

  activeCatalogIndex:0,
  setActiveCatalogIndex:index=>set({activeCatalogIndex:index}),
  updateCatalogPost:(id,updates)=>set(state=>({
    post:{...state.post,catalogPosts:(state.post.catalogPosts||[]).map(post=>post.id===id?{...post,...updates}:post)}
  })),
}));
