import { notFound } from "next/navigation";
import { fetchContent } from "#utils/api";
import { stripPagingSegments } from "#utils/paging";
import PageClient from "./PageClient";

const apiPath = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

export default async function Page({ params }) {
  // Drop the listing's paging segment before asking the API for a path (see
  // #utils/paging) — it addresses a block, not content.
  const slug = stripPagingSegments((await params).slug);
  const path = slug.length ? slug.join('/') : '';

  let data;
  try {
    data = await fetchContent(apiPath, { path });
  } catch (error) {
    console.error('Failed to fetch content:', error);
    return notFound();
  }

  if (!data) {
    return notFound();
  }

  return <PageClient initialData={data} apiUrl={apiPath} />;
}
