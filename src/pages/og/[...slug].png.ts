import { type CollectionEntry, getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { renderOgImage } from "../../utils/og";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute<{ post: CollectionEntry<"posts"> }> = async ({
  props: { post },
}) => {
  const png = await renderOgImage({
    title: post.data.title,
    prompt: `$ cat ~/posts/${post.id}`,
    tags: post.data.tags,
    date: post.data.pubDate,
  });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
