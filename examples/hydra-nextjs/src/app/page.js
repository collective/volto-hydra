"use client";
import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getTokenFromCookie, initBridge } from "#utils/hydra";
import { fetchContent } from "#utils/api";
import BlocksList from "@/components/BlocksList";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(data);

  const bridge = initBridge({
    page: {
      schema: {
        properties: {
          blocks_layout: { title: 'Content', allowedBlocks: ['slate', 'image', 'video', 'teaser'] },
        },
      },
    },
    onEditChange: (updatedData) => {
      if (updatedData) {
        setValue(updatedData);
      }
    },
  });

  useEffect(() => {
    async function getData(token = null) {
      try {
        const apiPath = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
        const path = "";
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
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!value) {
    setValue(data);
  }

  if (!data) {
    return notFound();
  }

  return (
    <div className="home">
      <h1 className="home-title">{value?.title ? value.title : data.title}</h1>
      <BlocksList data={value} />
    </div>
  );
}
