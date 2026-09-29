async function request(path:string, method:'GET'|'POST'='GET', body?:unknown): Promise<any> {
  const res = await fetch(path, {method, headers: body ? {'Content-Type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined});
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || `Crawler request failed: HTTP ${res.status}`);
  return json.data;
}
export const startCrawlerApi = (config:any) => request('/api/crawler/start','POST',config);
export const stopCrawlerApi = () => request('/api/crawler/stop','POST');
export const pauseCrawlerApi = () => request('/api/crawler/pause','POST');
export const resumeCrawlerApi = () => request('/api/crawler/resume','POST');
export const fetchCrawlerStatusApi = () => request('/api/crawler/status');
export const clearCrawlerLogsApi = async () => {
  const res = await fetch('/api/crawler/clear-logs',{method:'POST',headers:{'Content-Type':'application/json'}});
  const json = await res.json();
  return Boolean(json.ok);
};
