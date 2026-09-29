import type { PostData } from '../types';

export const SAMPLE_POSTS: Array<{ name: string; url: string; data: PostData }> = [
  {
    name: 'Anime: Solo Leveling Season 2 (Batch & Weekly)',
    url: 'https://example-anime.net/series/solo-leveling-arise-s2',
    data: {
      websiteUrl: 'https://example-anime.net/series/solo-leveling-arise-s2',
      title: 'Solo Leveling: Arise from the Shadow [Season 2]',
      thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80',
      description: 'Sung Jinwoo faces off against monarch monarchs as the Hunter Association mobilizes S-Rank guilds worldwide. Subbed & Dubbed in 1080p Ultra HD.',
      siteName: 'AnimeStreamHub',
      episodes: Array.from({length:8}, (_,i) => ({ id:`ep-${i+1}`, label:`Episode ${String(i+1).padStart(2,'0')} [1080p]`, url:`https://t.me/example_channel/${101+i}`, quality:'1080p', number:i+1 })),
    },
  },
  {
    name: 'K-Drama: Queen of Tears (Complete Series)',
    url: 'https://kdramaworld.org/drama/queen-of-tears-full',
    data: {
      websiteUrl: 'https://kdramaworld.org/drama/queen-of-tears-full',
      title: 'Queen of Tears (눈물의 여왕) - Complete Series',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
      description: 'The queen of department stores and her small-town husband weather a marital crisis until love miraculously begins to bloom again.',
      siteName: 'KDramaWorld',
      episodes: Array.from({length:6}, (_,i) => ({ id:`ep-${i+1}`, label:`Ep ${String(i+1).padStart(2,'0')} [720p]`, url:`https://example.com/stream/ep${i+1}`, quality:'720p', number:i+1 })),
    },
  },
  {
    name: 'Tech Masterclass: Full-Stack React & Node Course',
    url: 'https://codetutorials.io/courses/industrial-react-telegram-bot',
    data: {
      websiteUrl: 'https://codetutorials.io/courses/industrial-react-telegram-bot',
      title: 'Building Automated Media Bots with Node.js & React',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80',
      description: 'Comprehensive 6-part video course covering Telegram Bot API webhooks, inline keyboards, web scrapers, and cloud deployment.',
      siteName: 'CodeTutorials Hub',
      episodes: [
        { id:'ep-1', label:'Part 1: BotFather & Setup', url:'https://youtu.be/sample1', quality:'HD', number:1 },
        { id:'ep-2', label:'Part 2: Express Scraper Engine', url:'https://youtu.be/sample2', quality:'HD', number:2 },
        { id:'ep-3', label:'Part 3: Inline Keyboard Grids', url:'https://youtu.be/sample3', quality:'HD', number:3 },
        { id:'ep-4', label:'Part 4: Channel Publishing & Pin', url:'https://youtu.be/sample4', quality:'HD', number:4 },
      ],
    },
  },
];
