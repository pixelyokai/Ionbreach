import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Everything the page needs is same-origin: the font is self-hosted, the assets are
 * bundled, and nothing calls out. So the policy is a deny-list of one - 'none' - with
 * the handful of same-origin sources opened back up.
 *
 * Applied to the built HTML only; the dev server needs inline scripts and a websocket for
 * HMR, and a policy that has to be loosened for dev is not the policy being shipped.
 *
 * frame-ancestors is deliberately absent: it is ignored in a meta tag, so clickjacking
 * cover has to come from the response header (see README).
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const cspMeta = () => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html.replace(
        '<meta charset="utf-8" />',
        `<meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      ),
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), cspMeta()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
