"use client";
import { notFound } from "next/navigation";
import { usePathname } from "next/navigation";
import { initBridge, getTokenFromCookie } from "#utils/hydra";
import { useEffect, useState } from "react";
import BlocksList from "@/components/BlocksList";
import { fetchContent } from '#utils/api';

export default function Blog({ params }) {
  const bridge = initBridge(process.env.NEXT_PUBLIC_ADMINUI_ORIGIN, {allowedBlocks: [ "slate", "image", "video"]});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  useEffect(() => {
    async function getData(token = null) {
      try {
        const apiPath = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
        const path = pathname;
        const content = await fetchContent(apiPath, { token, path });
        setData(content);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    const url = new URL(window.location.href);
    const tokenFromUrl =
      url.searchParams.get("access_token") || getTokenFromCookie();
    getData(tokenFromUrl);
  }, [pathname]);

  const [value, setValue] = useState(data);

  useEffect(() => {
    bridge.onEditChange((updatedData) => {
      if (updatedData) {
        setValue(updatedData);
      }
    });
  },[bridge]);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (!value) {
    setValue(data);
  }
  if (data) {
    return (
      <div className="blog">
        <h1 className="blog-title">
          {value?.title ? value.title : data.title}
        </h1>
        <BlocksList data={value} />
      </div>
    );
  } else {
    return notFound();
  }

  return "";
}
