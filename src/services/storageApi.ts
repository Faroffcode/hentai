import type { PostData } from '../types';

async function readJson(res: Response, fallback: string): Promise<any> {
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || fallback);
  return json;
}

export async function savePostToLibrary(post: PostData): Promise<{folder:string; filename:string; filePath:string; isUpdate:boolean; totalInFolder:number}> {
  const json = await readJson(await fetch('/api/storage/save', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({post})}), 'Failed to save post to library');
  return json.data;
}

export async function batchSavePostsToLibrary(posts: PostData[]): Promise<Array<{slug:string;folder:string;filename:string;isUpdate:boolean}>> {
  const json = await readJson(await fetch('/api/storage/batch-save', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({posts})}), 'Failed to batch save posts');
  return json.data;
}

export async function fetchDataLibrary(): Promise<{folders:any[];totalPosts:number;totalFolders:number}> {
  const json = await readJson(await fetch('/api/storage/library'), 'Failed to fetch data library manifest');
  return json.data;
}

export async function loadPostFromFile(folder:string, filename:string): Promise<PostData> {
  const res = await fetch(`/api/storage/file?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`);
  const json = await readJson(res, 'Failed to load post file');
  const data = json.data;
  return {
    websiteUrl:data.websiteUrl||'', title:data.title||filename.replace('.json',''), thumbnail:data.thumbnail||'',
    description:data.description||'', synopsis:data.synopsis||data.description||'',
    galleryImages:Array.isArray(data.galleryImages)?data.galleryImages:[], siteName:data.siteName||'',
    episodes:Array.isArray(data.episodes)?data.episodes.map((ep:any,idx:number)=>({
      id:ep.id||`ep-file-${idx}-${Math.random().toString(36).substring(2,7)}`,
      label:ep.label||`Episode ${idx+1}`, url:ep.url||'', quality:ep.quality, number:ep.number??idx+1
    })):[], isCatalog:false, catalogPosts:[]
  };
}

export async function deleteFileFromLibrary(folder:string, filename:string): Promise<boolean> {
  const json = await readJson(await fetch('/api/storage/file',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({folder,filename})}), 'Failed to delete file');
  return Boolean(json.ok && json.success);
}

export async function deleteFolderFromLibrary(folder:string): Promise<boolean> {
  const json = await readJson(await fetch('/api/storage/folder',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({folder})}), 'Failed to delete folder');
  return Boolean(json.ok && json.success);
}

export async function clearWholeLibraryDatabase(): Promise<{deletedFolders:number;deletedFiles:number}> {
  const json = await readJson(await fetch('/api/storage/clear-all',{method:'POST',headers:{'Content-Type':'application/json'}}), 'Failed to clear database');
  return json.data;
}

export async function fetchMainIndexApi(): Promise<any> {
  const json = await readJson(await fetch('/data/index.json'), 'Failed to fetch main index.json');
  return json.data;
}

export async function reindexDatabaseApi(): Promise<any> {
  const json = await readJson(await fetch('/api/storage/reindex',{method:'POST',headers:{'Content-Type':'application/json'}}), 'Failed to re-index database');
  return json.data;
}
