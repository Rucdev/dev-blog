import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "rucdev-blog",
		compatibilityDate: "2026-09-01",
		compatibilityFlags: ["nodejs_compat"],
		entrypoint: "@astrojs/cloudflare/entrypoints/server",
		// cf deploy 時にカスタムドメインとして紐付ける(DNS レコードも自動作成)
		domains: ["blog.rucdev.com"],
		observability: {
			enabled: true,
		},
		env: {
			ASSETS: bindings.assets(),
		},
	},
});
