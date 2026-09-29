export interface SavedPostFileMeta {
  filename: string;
  slug: string;
  title: string;
  thumbnail: string;
  synopsis?: string;
  description?: string;
  websiteUrl?: string;
  episodeCount: number;
  galleryCount: number;
  savedAt: string;
  sizeBytes: number;
}

export interface FolderMeta {
  name: string;
  number: number;
  count: number;
  max: number;
  isFull: boolean;
  files: SavedPostFileMeta[];
}

export interface LibraryManifest {
  folders: FolderMeta[];
  totalPosts: number;
  totalFolders: number;
}
