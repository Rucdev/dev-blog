// @ts-check

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://blog.rucdev.com',
	adapter: cloudflare({
		// 全ページ静的生成のため、画像はビルド時に sharp で変換して静的ファイルとして出力する
		imageService: 'compile',
	}),
	integrations: [mdx(), sitemap(), svelte()],
	markdown: {
		shikiConfig: { theme: 'github-dark-dimmed' },
	},
	vite: {
		// Cloudflare アダプタ(workerd)の dev では、後から依存が見つかると再最適化が走って
		// 古いハッシュのファイルを参照して落ちるため、後追いで見つかる依存を事前に含める
		optimizeDeps: {
			include: ['@astrojs/svelte/server.js', '@astrojs/rss', 'astro/logger/console'],
		},
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'JetBrains Mono',
			cssVariable: '--font-jetbrains-mono',
			fallbacks: ['ui-monospace', 'monospace'],
			weights: [400, 500, 700],
		},
		{
			provider: fontProviders.google(),
			name: 'Noto Sans JP',
			cssVariable: '--font-noto-sans-jp',
			fallbacks: ['system-ui', 'sans-serif'],
			weights: [400, 500, 700],
		},
	],
});
