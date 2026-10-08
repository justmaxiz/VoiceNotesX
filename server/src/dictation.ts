import type { FastifyInstance, preValidationHookHandler } from 'fastify';
import WebSocket from 'ws';
import type { ServerConfig } from './config.js';
import { ApiError } from './errors.js';

export function bridgeDictation(client: WebSocket, upstream: WebSocket, language: string) {
  let ready = false;
  let finishing = false;
  let transcript = '';
  let interim = '';
  let audioBytes = 0;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const send = (value: object) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(value));
  };
  const fail = (message: string) => {
    send({ type: 'error', message });
    client.close();
    upstream.close();
  };
  const finish = () => {
    send({ type: 'done', text: [transcript, interim].filter(Boolean).join(' ').trim() });
    client.close();
  };
  const setupTimer = setTimeout(() => fail('Сервис диктовки не ответил. Повторите попытку.'), 12000);
  const lifetime = setTimeout(() => fail('Диктовка ограничена 10 минутами. Отправьте текст и продолжите.'), 600000);
  upstream.on('open', () => upstream.send(JSON.stringify({ setup: {
    model: 'models/gemini-3.5-transcribe-live',
    generationConfig: { responseModalities: ['TEXT'] },
    inputAudioTranscription: { languageCodes: language === 'auto' ? [] : [language] },
  } })));
  upstream.on('message', data => {
    try {
      const message = JSON.parse(data.toString());
      if (message.setupComplete) {
        clearTimeout(setupTimer);
        ready = true;
        send({ type: 'ready' });
      }
      if (message.error) return fail('Сервис распознавания речи отклонил запрос. Повторите попытку.');
      const content = message.serverContent;
      if (content?.interimInputTranscription) interim = content.interimInputTranscription.text || '';
      if (content?.inputTranscription) {
        transcript = [transcript, content.inputTranscription.text].filter(Boolean).join(' ').trim();
        interim = '';
      }
      if (content?.interimInputTranscription || content?.inputTranscription)
        send({ type: 'transcript', transcript, interim });
      if (finishing && (content?.generationComplete || content?.turnComplete)) finish();
    } catch { fail('Некорректный ответ сервиса распознавания речи.'); }
  });
  upstream.on('error', () => fail('Не удалось подключиться к сервису распознавания речи.'));
  upstream.on('close', (_code, reason) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const detail = reason.toString();
    if (/location is not supported/i.test(detail))
      fail('Gemini недоступен из текущего региона подключения сервера. Проверьте подключение сервера.');
    else if (/quota|resource.exhausted/i.test(detail))
      fail('Исчерпан лимит сервиса диктовки. Повторите попытку позже.');
    else fail('Соединение с сервисом диктовки прервано. Распознанный текст сохранён.');
  });
  client.on('message', (data, binary) => {
    if (!ready || finishing) return;
    if (binary) {
      const pcm = Buffer.from(data as Buffer);
      audioBytes += pcm.length;
      if (audioBytes > 32000 * 600 || pcm.length % 2) return fail('Превышен лимит или неверный формат аудио.');
      upstream.send(JSON.stringify({ realtimeInput: { audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' } } }));
    } else if (data.toString() === '{"type":"finish"}') {
      finishing = true;
      upstream.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      // Preserve visible interim words if the provider does not finalize silence.
      finishTimer = setTimeout(finish, 5000);
    } else fail('Некорректная команда диктовки.');
  });
  client.on('error', () => upstream.close());
  client.on('close', () => {
    clearTimeout(setupTimer); clearTimeout(lifetime); clearTimeout(finishTimer);
    upstream.close();
  });
}

export function registerDictation(app: FastifyInstance, config: ServerConfig, requireMediaUser: preValidationHookHandler) {
  const sessions = new Map<string, number>();
  app.get('/api/v1/dictation/live', {
    websocket: true,
    preValidation: [async request => {
      if (!request.headers.origin || !config.corsOrigins.includes(request.headers.origin))
        throw new ApiError(403, 'ORIGIN_DENIED', 'Недопустимый источник диктовки.');
      if (config.aiProvider !== 'gemini' || !config.geminiKey)
        throw new ApiError(503, 'DICTATION_UNAVAILABLE', 'Потоковая диктовка не настроена на сервере.');
    }, requireMediaUser, async request => {
      if ((sessions.get(request.ownerId) || 0) >= 2)
        throw new ApiError(429, 'BUSY', 'Уже открыта диктовка. Закройте другую запись.');
    }],
    schema: { querystring: { type: 'object', additionalProperties: false, properties: {
      language: { type: 'string', enum: ['ru-RU', 'en-US', 'auto'] },
    } } },
  }, (socket, request) => {
    const owner = request.ownerId;
    sessions.set(owner, (sessions.get(owner) || 0) + 1);
    socket.on('close', () => {
      const remaining = (sessions.get(owner) || 1) - 1;
      if (remaining) sessions.set(owner, remaining); else sessions.delete(owner);
    });
    const upstream = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(config.geminiKey!), { handshakeTimeout: 10000 });
    bridgeDictation(socket, upstream, (request.query as { language?: string }).language || 'ru-RU');
  });
}
