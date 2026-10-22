import satori from "satori";
import sharp from "sharp";
import { SITE_TITLE } from "../consts";

// OG 画像は global.css のヘッダー配色(ダーク × テラコッタ)に合わせる
const COLORS = {
  bg: "#2a2118",
  fg: "#f4f1ea",
  muted: "#a49a8c",
  accent: "#d9743f",
};

type Font = Parameters<typeof satori>[1]["fonts"][number];

/**
 * Google Fonts から、text に含まれる文字だけのサブセットを TrueType で取得する。
 * satori は woff2 を読めないので、css2 API の text= 指定で ttf を返してもらう。
 */
async function loadFont(
  family: string,
  weight: 400 | 500 | 700,
  text: string,
): Promise<Font> {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text,
  });
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?${params}`)
  ).text();
  const url = css.match(
    /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/,
  )?.[1];
  if (!url) throw new Error(`フォントを取得できませんでした: ${family}`);
  const data = await (await fetch(url)).arrayBuffer();
  return { name: family, data, weight, style: "normal" };
}

// satori に渡す JSX 相当のノードを組み立てる
type Node = { type: string; props: Record<string, unknown> };
function h(
  type: string,
  style: Record<string, unknown>,
  ...children: (Node | string)[]
): Node {
  return { type, props: { style, children } };
}

interface OgImageOptions {
  title: string;
  /** タイトル上に出すプロンプト風の 1 行 */
  prompt: string;
  tags?: string[];
  date?: Date;
}

/** 1200×630 の OG 画像(PNG)を生成する */
export async function renderOgImage({
  title,
  prompt,
  tags = [],
  date,
}: OgImageOptions): Promise<Uint8Array<ArrayBuffer>> {
  const footer = [
    tags.map((tag) => `#${tag}`).join("  "),
    date?.toISOString().slice(0, 10) ?? "",
  ];
  const monoText = [SITE_TITLE, prompt, ...footer].join("");
  const fonts = await Promise.all([
    loadFont("JetBrains Mono", 500, monoText),
    loadFont("Noto Sans JP", 700, title),
    // タグや日付に日本語が混ざったときのフォールバック
    loadFont("Noto Sans JP", 500, monoText),
  ]);

  // satori はルートの padding をサイズの外側に足してしまうので、
  // 余白は絶対配置の内枠(四辺の inset)で取る
  const svg = await satori(
    h(
      "div",
      {
        width: 1200,
        height: 630,
        display: "flex",
        background: COLORS.bg,
        fontFamily: "JetBrains Mono, Noto Sans JP",
        color: COLORS.fg,
      },
      h(
        "div",
        {
          position: "absolute",
          top: 64,
          right: 72,
          bottom: 64,
          left: 72,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
        h(
          "div",
          { display: "flex", fontSize: 30, fontWeight: 500 },
          SITE_TITLE,
        ),
        h(
          "div",
          { display: "flex", flexDirection: "column", gap: 24 },
          h(
            "div",
            { display: "flex", fontSize: 26, color: COLORS.accent },
            prompt,
          ),
          h(
            "div",
            {
              display: "flex",
              fontFamily: "Noto Sans JP",
              fontSize: title.length > 40 ? 50 : 60,
              fontWeight: 700,
              lineHeight: 1.4,
            },
            title,
          ),
        ),
        h(
          "div",
          {
            display: "flex",
            justifyContent: "space-between",
            gap: 32,
            fontSize: 26,
            fontWeight: 500,
          },
          h("div", { display: "flex", color: COLORS.accent }, footer[0]),
          h("div", { display: "flex", color: COLORS.muted }, footer[1]),
        ),
      ),
      // 下端のアクセントライン
      h("div", {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 12,
        background: COLORS.accent,
      }),
    ) as unknown as Parameters<typeof satori>[0],
    { width: 1200, height: 630, fonts },
  );

  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}
