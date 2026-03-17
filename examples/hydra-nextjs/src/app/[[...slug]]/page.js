import { notFound } from "next/navigation";
import { fetchContent } from "#utils/api";
import PageClient from "./PageClient";

const apiPath = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

export default async function Page({ params }) {
  const slug = (await params).slug;
  const path = slug ? slug.join('/') : '';

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
