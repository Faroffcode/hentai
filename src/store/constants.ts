import type { PostData, TemplateSettings } from '../types';

export const DEFAULT_POST: PostData = {
  websiteUrl:'', title:'', thumbnail:'', description:'', synopsis:'', galleryImages:[],
  siteName:'', episodes:[], isCatalog:false, catalogPosts:[]
};

export const DEFAULT_TEMPLATE: TemplateSettings = {
  captionTemplate:'🍿 <b>{title}</b>\n\n🎬 <b>Episodes:</b>\n{episodes_list}\n\n🔗 <b>Post Link:</b> {post_url}',
  buttonsLayout:'2-col', includeTextLinks:true, includeSynopsis:false, sendAsPhoto:true,
  sendGalleryAlbum:true, maxGalleryImages:5, disableNotification:false,
  protectContent:false, pinMessage:false, parseMode:'HTML'
};

export const STORAGE_KEY = 'telepost_config_v1';
