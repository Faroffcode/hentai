import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../http/requestUtils';
import { callTelegramApi } from '../telegram/telegramTransport';

export async function handleTelegramVerifyRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
// 2. Telegram Bot & Chat Verification Endpoint
  if (url.startsWith('/api/telegram/verify') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { botToken, chatId } = body;

      if (!botToken || !botToken.trim()) {
        sendJson(res, 400, { ok: false, error: 'Telegram Bot Token is required' });
        return true;
      }

      const meData = await callTelegramApi(botToken.trim(), 'getMe', {});
      if (!meData.ok) {
        sendJson(res, 400, {
          ok: false,
          error: `Bot verification failed: ${meData.description || 'Invalid token'}`,
        });
        return true;
      }

      let chatInfo: any = null;
      if (chatId && chatId.trim()) {
        const chatData = await callTelegramApi(botToken.trim(), 'getChat', { chat_id: chatId.trim() });
        if (chatData.ok) {
          chatInfo = {
            id: chatData.result.id,
            title: chatData.result.title || chatData.result.username || 'Direct Chat',
            type: chatData.result.type,
            username: chatData.result.username ? `@${chatData.result.username}` : undefined,
          };
        } else {
          sendJson(res, 200, {
            ok: true,
            bot: meData.result,
            chatWarning: `Bot is valid, but could not access chat: ${chatData.description}. Ensure the bot is added as an administrator to the channel/group.`,
          });
          return true;
        }
      }

      sendJson(res, 200, {
        ok: true,
        bot: meData.result,
        chat: chatInfo,
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Telegram verification failed' });
      return true;
    }
  }
  return false;
}
