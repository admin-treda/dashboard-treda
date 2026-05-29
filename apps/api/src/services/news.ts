import { prisma } from '../index';

interface FeedSource { url: string; category: string; name: string; }

const sources: FeedSource[] = [
  { url: 'https://feeds.feedburner.com/TheAIBlog', category: 'IA', name: 'OpenAI Blog' },
  { url: 'https://blog.google/technology/ai/rss', category: 'IA', name: 'Google AI' },
  { url: 'https://www.artificialintelligence-news.com/feed/', category: 'IA', name: 'AI News' },
  { url: 'https://venturebeat.com/category/ai/feed/', category: 'IA', name: 'VentureBeat AI' },
  { url: 'https://www.anthropic.com/feed.xml', category: 'Agentes', name: 'Anthropic' },
  { url: 'https://blog.langchain.dev/rss/', category: 'Agentes', name: 'LangChain Blog' },
  { url: 'https://azure.microsoft.com/en-us/blog/feed/', category: 'Agentes', name: 'Microsoft AI Blog' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'IT', name: 'Ars Technica' },
  { url: 'https://techcrunch.com/feed/', category: 'IT', name: 'TechCrunch' },
  { url: 'https://www.infoworld.com/index.rss', category: 'IT', name: 'InfoWorld' },
  { url: 'https://sdtimes.com/feed/', category: 'IT', name: 'SD Times' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', category: 'Seguridad', name: 'The Hacker News' },
  { url: 'https://krebsonsecurity.com/feed/', category: 'Seguridad', name: 'Krebs on Security' },
  { url: 'https://www.bleepingcomputer.com/feed/', category: 'Seguridad', name: 'Bleeping Computer' },
  { url: 'https://cybersecuritynews.com/feed/', category: 'Seguridad', name: 'Cyber Security News' },
];

const criticalKeywords = [
  /cve-\d{4}/i, /zero.day/i, /zero-day/i, /ransomware/i, /data breach/i, /breach/i,
  /exploit/i, /remote code/i, /rce/i, /supply chain/i, /backdoor/i, /malware/i,
  /worm/i, /cisa/i, /emergency patch/i, /0day/i, /critical.*vuln/i,
  /sql injection/i, /auth bypass/i, /privilege escalation/i,
];

export function isCritical(title: string, description: string): boolean {
  return criticalKeywords.some(kw => kw.test(`${title} ${description}`));
}

function extractSummary(raw: string, fallback: string = ''): string {
  if (!raw) return fallback;
  let t = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c));
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, ' ');
  t = t.replace(/<\/p>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/\b\d+x\d+\b/g, '');
  t = t.replace(/\.(jpg|jpeg|png|gif|svg|webp)\b/gi, '');
  t = t.replace(/\s+/g, ' ').trim().slice(0, 400).trim();
  return t || fallback;
}

function parseRSS(xml: string): { title: string; description: string; url: string; publishedAt: Date }[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    try {
      const c = m[1];
      const title = (c.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
      const link = (c.match(/<link[^>]*>([^<]*)<\/link>/i) || [])[1]?.trim() ||
                   (c.match(/<link[^>]*href="([^"]*)"[^>]*\/>/i) || [])[1]?.trim() || '';
      const content = (c.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) || [])[1] || '';
      const rawDesc = (c.match(/<description[^>]*>([^<]*)<\/description>/i) || [])[1] ||
                      (c.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i) || [])[1] || '';
      const desc = extractSummary(content) || extractSummary(rawDesc) || '';
      const pubStr = (c.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/i) || [])[1]?.trim();
      const pubDate = pubStr ? new Date(pubStr) : new Date();
      if (title && link) items.push({ title, description: desc, url: link, publishedAt: pubDate });
    } catch { /* skip */ }
  }
  return items;
}

let _lastUpdate: Date | null = null;

export function getLastNewsUpdate(): Date | null { return _lastUpdate; }
export function setLastNewsUpdate(d: Date) { _lastUpdate = d; }

export async function fetchAllNews(): Promise<number> {
  let total = 0;
  for (const source of sources) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(source.url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(t);
      if (!res.ok) continue;
      const articles = parseRSS(await res.text());
      for (const a of articles) {
        const existing = await prisma.news.findFirst({ where: { url: a.url } });
        if (existing) continue;
        await prisma.news.create({
          data: {
            title: a.title,
            description: a.description || `Artículo de ${source.name}: ${a.title}`,
            url: a.url,
            source: source.name,
            category: isCritical(a.title, a.description) ? 'Crítico' : source.category,
            publishedAt: a.publishedAt,
          },
        });
        total++;
      }
    } catch { /* skip */ }
  }
  _lastUpdate = new Date();
  return total;
}

export async function cleanupCriticalNews(): Promise<number> {
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const r = await prisma.news.deleteMany({ where: { category: 'Crítico', publishedAt: { lt: cutoff } } });
  return r.count;
}
