import type { APIRoute } from "astro";
import { SITE_DESCRIPTION } from "../consts";
import { renderOgImage } from "../utils/og";

// 記事以外のページで使うサイト共通の OG 画像
export const GET: APIRoute = async () => {
  const png = await renderOgImage({
    title: SITE_DESCRIPTION,
    prompt: "$ ls -lt ~/posts",
  });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
