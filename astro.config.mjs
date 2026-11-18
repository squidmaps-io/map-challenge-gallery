import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.SITE_URL || 'https://30daymap.squidmaps.io',
  base: process.env.BASE_PATH || '/',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
