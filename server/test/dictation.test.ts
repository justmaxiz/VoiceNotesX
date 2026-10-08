import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { bridgeDictation } from '../src/dictation.js';
import { registerDictation } from '../src/dictation.js';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { ServerConfig } from '../src/config.js';
import { ApiError } from '../src/errors.js';

class Socket extends EventEmitter {
  readyState = WebSocket.OPEN;
  sent: any[] = [];
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() {
    if (this.readyState !== WebSocket.OPEN) return;
    this.readyState = WebSocket.CLOSED;
    this.emit('close');
  }
}
test('live dictation sends PCM, replaces interim hypotheses and finalizes text', () => {
  const client = new Socket(), upstream = new Socket();
  bridgeDictation(client as unknown as WebSocket, upstream as unknown as WebSocket, 'ru-RU');
  upstream.emit('open');
  assert.deepEqual(upstream.sent[0].setup.inputAudioTranscription.languageCodes, ['ru-RU']);
  upstream.emit('message', Buffer.from('{"setupComplete":{}}'));
  client.emit('message', Buffer.from([1, 0, 2, 0]), true);
  assert.equal(upstream.sent[1].realtimeInput.audio.mimeType, 'audio/pcm;rate=16000');
  const providerMessage = (content: object) => upstream.emit('message', Buffer.from(JSON.stringify({ serverContent: content })));
  providerMessage({ interimInputTranscription: { text: 'При' } });
  providerMessage({ interimInputTranscription: { text: 'Привет' } });
  assert.equal(client.sent.at(-1).interim, 'Привет');
  providerMessage({ inputTranscription: { text: 'Привет.' } });
  providerMessage({ inputTranscription: { text: 'Как дела?' } });
  client.emit('message', Buffer.from('{"type":"finish"}'), false);
  assert.equal(upstream.sent.at(-1).realtimeInput.audioStreamEnd, true);
  providerMessage({ generationComplete: true });
  assert.deepEqual(client.sent.at(-1), { type: 'done', text: 'Привет. Как дела?' });
  assert.equal(upstream.readyState, WebSocket.CLOSED);
});

test('provider failures do not expose upstream errors or credentials', () => {
  const client = new Socket(), upstream = new Socket();
  bridgeDictation(client as unknown as WebSocket, upstream as unknown as WebSocket, 'auto');
  upstream.emit('error', new Error('secret provider URL'));
  assert.equal(client.sent[0].type, 'error');
  assert.equal(JSON.stringify(client.sent).includes('secret'), false);
  assert.equal(upstream.readyState, WebSocket.CLOSED);
});

test('regional provider denial is explained without leaking provider details', () => {
  const client = new Socket(), upstream = new Socket();
  bridgeDictation(client as unknown as WebSocket, upstream as unknown as WebSocket, 'auto');
  upstream.emit('close', 1007, Buffer.from('User location is not supported for the API use.'));
  assert.match(client.sent[0].message, /региона/);
});

test('dictation handshake rejects foreign origins and unauthenticated requests', async () => {
  const app = Fastify();
  await app.register(websocket);
  registerDictation(app, { corsOrigins: ['http://localhost:5173'], aiProvider: 'gemini', geminiKey: 'test' } as ServerConfig, async () => {
    throw new ApiError(401, 'UNAUTHORIZED', 'Войдите в аккаунт.');
  });
  try {
    const foreign = await app.inject({ url: '/api/v1/dictation/live', headers: { origin: 'https://foreign.invalid' } });
    assert.equal(foreign.statusCode, 403);
    const anonymous = await app.inject({ url: '/api/v1/dictation/live', headers: { origin: 'http://localhost:5173' } });
    assert.equal(anonymous.statusCode, 401);
  } finally { await app.close(); }
});
