let lastTelegramCallTimestamp = 0;

async function enforceTelegramRateLimit(minDelayMs: number = 1500) {
  const now = Date.now();
  const timeSinceLast = now - lastTelegramCallTimestamp;
  if (timeSinceLast < minDelayMs) {
    const waitMs = minDelayMs - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  lastTelegramCallTimestamp = Date.now();
}

// Telegram API Helper with Rate Limiting & 429 Auto-Retry

async function callTelegramApi(
  botToken: string,
  method: string,
  payload: any,
  options?: { rateLimitDelayMs?: number; autoRetryOn429?: boolean; maxRetries?: number }
) {
  const delayMs = options?.rateLimitDelayMs ?? 1500;
  const autoRetry = options?.autoRetryOn429 ?? true;
  const maxRetries = options?.maxRetries ?? 3;

  const url = `https://api.telegram.org/bot${botToken}/${method}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await enforceTelegramRateLimit(delayMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Handle Telegram Rate Limit 429
      if (!data.ok && data.error_code === 429 && autoRetry && attempt < maxRetries) {
        const retryAfterSec = data.parameters?.retry_after || 3;
        console.warn(`[Telegram RateLimit] 429 Limit Hit on ${method}. Waiting ${retryAfterSec}s (Attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryAfterSec * 1000 + 300));
        continue;
      }

      return data;
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { ok: false, error: 'Telegram request failed after rate limit retries' };
}

// Telegram Document Upload Helper with Rate Limiting & 429 Auto-Retry

async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  fileBuffer: Buffer,
  filename: string,
  caption?: string,
  messageThreadId?: string,
  options?: { rateLimitDelayMs?: number; autoRetryOn429?: boolean; maxRetries?: number }
) {
  const delayMs = options?.rateLimitDelayMs ?? 1500;
  const autoRetry = options?.autoRetryOn429 ?? true;
  const maxRetries = options?.maxRetries ?? 3;

  const formData = new FormData();
  formData.append('chat_id', chatId.trim());
  if (caption) formData.append('caption', caption);
  if (messageThreadId) formData.append('message_thread_id', messageThreadId);
  formData.append('parse_mode', 'HTML');

  const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/zip' });
  formData.append('document', fileBlob, filename);

  const url = `https://api.telegram.org/bot${botToken.trim()}/sendDocument`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await enforceTelegramRateLimit(delayMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok && data.error_code === 429 && autoRetry && attempt < maxRetries) {
        const retryAfterSec = data.parameters?.retry_after || 5;
        console.warn(`[Telegram RateLimit] Document upload 429 limit. Waiting ${retryAfterSec}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryAfterSec * 1000 + 500));
        continue;
      }

      return data;
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { ok: false, error: 'Telegram document upload failed after retries' };
}

// Helper to fetch HTML with realistic headers
