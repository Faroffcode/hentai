import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../http/requestUtils';
import { callTelegramApi } from '../telegram/telegramTransport';

export async function handleTelegramSendRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
// 3. Telegram Post Sender Endpoint
  if (url.startsWith('/api/telegram/send') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        botToken,
        chatId,
        messageThreadId,
        thumbnailUrl,
        galleryImages = [],
        sendGalleryAlbum = false,
        maxGalleryImages = 5,
        caption,
        parseMode = 'HTML',
        episodes = [],
        buttonsLayout = '2-col',
        disableNotification = false,
        protectContent = false,
        pinMessage = false,
      } = body;

      if (!botToken || !chatId) {
        sendJson(res, 400, { ok: false, error: 'Both botToken and chatId are required' });
        return true;
      }

      let replyMarkup: any = undefined;
      const validEpisodes = episodes.filter((ep: any) => ep && ep.label && ep.url && (ep.url.startsWith('http://') || ep.url.startsWith('https://') || ep.url.startsWith('tg://')));

      if (buttonsLayout !== 'none' && validEpisodes.length > 0) {
        let cols = 2;
        if (buttonsLayout === '1-col') cols = 1;
        if (buttonsLayout === '3-col') cols = 3;
        if (buttonsLayout === '4-col') cols = 4;

        const keyboard: Array<Array<{ text: string; url: string }>> = [];
        for (let i = 0; i < validEpisodes.length; i += cols) {
          const row = validEpisodes.slice(i, i + cols).map((ep: any) => ({
            text: ep.label.trim(),
            url: ep.url.trim(),
          }));
          keyboard.push(row);
        }
        replyMarkup = { inline_keyboard: keyboard };
      }

      let sendResult: any;

      // Check if user wants to upload as a Photo Gallery Album (Telegram sendMediaGroup)
      const validGallery = Array.isArray(galleryImages) ? galleryImages.filter((u: string) => u && u.startsWith('http')) : [];
      const shouldSendAlbum = sendGalleryAlbum && (validGallery.length > 0 || (thumbnailUrl && validGallery.length > 0));

      if (shouldSendAlbum) {
        // Build album photos: cover first, then screenshots
        const allAlbumUrls: string[] = [];
        if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
          allAlbumUrls.push(thumbnailUrl);
        }
        for (const gUrl of validGallery) {
          if (!allAlbumUrls.includes(gUrl)) {
            allAlbumUrls.push(gUrl);
          }
        }

        const selectedPhotos = allAlbumUrls.slice(0, Math.min(10, Math.max(2, maxGalleryImages || 5)));

        if (selectedPhotos.length >= 2) {
          const mediaGroupPayload: any = {
            chat_id: chatId.trim(),
            media: selectedPhotos.map((photoUrl, idx) => ({
              type: 'photo',
              media: photoUrl,
              caption: idx === 0 ? (caption || '') : undefined,
              parse_mode: idx === 0 ? parseMode : undefined,
            })),
            disable_notification: Boolean(disableNotification),
            protect_content: Boolean(protectContent),
          };
          if (messageThreadId) {
            mediaGroupPayload.message_thread_id = Number(messageThreadId);
          }

          sendResult = await callTelegramApi(botToken.trim(), 'sendMediaGroup', mediaGroupPayload);

          // If MediaGroup succeeded and we have inline episode buttons, send buttons in follow-up message
          if (sendResult.ok && replyMarkup) {
            const btnPayload: any = {
              chat_id: chatId.trim(),
              text: `🎬 <b>Stream / Download Episodes:</b>`,
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
              disable_notification: Boolean(disableNotification),
              protect_content: Boolean(protectContent),
            };
            if (messageThreadId) btnPayload.message_thread_id = Number(messageThreadId);
            await callTelegramApi(botToken.trim(), 'sendMessage', btnPayload);
          }
        }
      }

      // If not sent as album or album failed, send as single photo cover with buttons
      if (!sendResult || !sendResult.ok) {
        if (thumbnailUrl && thumbnailUrl.trim() && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))) {
          const photoPayload: any = {
            chat_id: chatId.trim(),
            photo: thumbnailUrl.trim(),
            caption: caption || '',
            parse_mode: parseMode,
            disable_notification: Boolean(disableNotification),
            protect_content: Boolean(protectContent),
          };
          if (messageThreadId) {
            photoPayload.message_thread_id = Number(messageThreadId);
          }
          if (replyMarkup) {
            photoPayload.reply_markup = replyMarkup;
          }

          sendResult = await callTelegramApi(botToken.trim(), 'sendPhoto', photoPayload);

          // Fallback: If sendPhoto failed due to URL download restriction, send as text message
          if (!sendResult.ok && sendResult.description && (sendResult.description.includes('wrong file identifier') || sendResult.description.includes('failed to get HTTP URL content') || sendResult.description.includes('PHOTO_INVALID_DIMENSIONS'))) {
            const textPayload: any = {
              chat_id: chatId.trim(),
              text: `${caption}\n\n🖼 <b>Thumbnail:</b> <a href="${thumbnailUrl.trim()}">View Cover Image</a>`,
              parse_mode: parseMode,
              disable_notification: Boolean(disableNotification),
              protect_content: Boolean(protectContent),
            };
            if (messageThreadId) textPayload.message_thread_id = Number(messageThreadId);
            if (replyMarkup) textPayload.reply_markup = replyMarkup;

            sendResult = await callTelegramApi(botToken.trim(), 'sendMessage', textPayload);
          }
        } else {
          const textPayload: any = {
            chat_id: chatId.trim(),
            text: caption || 'Empty Post',
            parse_mode: parseMode,
            disable_notification: Boolean(disableNotification),
            protect_content: Boolean(protectContent),
          };
          if (messageThreadId) textPayload.message_thread_id = Number(messageThreadId);
          if (replyMarkup) textPayload.reply_markup = replyMarkup;

          sendResult = await callTelegramApi(botToken.trim(), 'sendMessage', textPayload);
        }
      }

      if (!sendResult.ok) {
        sendJson(res, 400, {
          ok: false,
          error: sendResult.description || 'Telegram API rejected the request',
          details: sendResult,
        });
        return true;
      }

      const messageId = sendResult.result?.message_id;

      if (pinMessage && messageId) {
        try {
          await callTelegramApi(botToken.trim(), 'pinChatMessage', {
            chat_id: chatId.trim(),
            message_id: messageId,
            disable_notification: Boolean(disableNotification),
          });
        } catch {}
      }

      let postLink: string | undefined;
      const chatUsername = sendResult.result?.chat?.username;
      if (chatUsername && messageId) {
        postLink = `https://t.me/${chatUsername}/${messageId}`;
      } else if (chatId.startsWith('@') && messageId) {
        postLink = `https://t.me/${chatId.replace('@', '')}/${messageId}`;
      }

      sendJson(res, 200, {
        ok: true,
        messageId,
        postLink,
        date: sendResult.result?.date,
        chat: sendResult.result?.chat,
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to dispatch Telegram message' });
      return true;
    }
  }
  return false;
}
