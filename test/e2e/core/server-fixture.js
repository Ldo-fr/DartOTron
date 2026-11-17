import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDartOTronServer } from '../../../server/index.js';

/**
 * Server fixture for E2E tests.
 * Spins up a real in-process instance of the DartOTron HTTP server on port 0 (ephemeral),
 * connects mock serial hardware, and provides helpers to test network requests,
 * asset serving, and MIME types.
 */
export async function startTestServer() {
  const dummySerial = {
    connect: async () => {},
    disconnect: () => {},
    on: () => {},
    removeListener: () => {}
  };

  const app = createDartOTronServer({
    serial: dummySerial,
    isDev: true
  });

  await app.start(0, '127.0.0.1');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    app,
    port,
    baseUrl,
    /**
     * Fetch a path from the test server.
     * @param {string} path - URL path (e.g. '/index.html')
     * @param {RequestInit} [options]
     */
    async fetch(urlPath, options = {}) {
      const url = `${baseUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
      return fetch(url, options);
    },
    /**
     * Fetches an asset and verifies HTTP 200 and expected Content-Type prefix.
     */
    async verifyAsset(urlPath, expectedContentTypePrefix) {
      const res = await this.fetch(urlPath);
      const ok = res.status === 200;
      const contentType = res.headers.get('content-type') || '';
      const typeOk = !expectedContentTypePrefix || contentType.startsWith(expectedContentTypePrefix);
      const text = await res.text();
      return {
        ok,
        status: res.status,
        contentType,
        typeOk,
        bodyLength: text.length,
        text
      };
    },
    /**
     * Stop test server.
     */
    async stop() {
      await app.stop();
    }
  };
}
