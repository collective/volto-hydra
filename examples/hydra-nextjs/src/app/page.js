"use client";
import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getTokenFromCookie, initBridge } from "#utils/hydra";
import { fetchContent } from "#utils/api";
import BlocksList from "@/components/BlocksList";

export default function Home() {
  const bridge = initBridge(process.env.NEXT_PUBLIC_ADMINUI_ORIGIN, {allowedBlocks: [ "slate", "image", "video", "teaser"]});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const [value, setValue] = useState(data);
  // useEffect(() => {
  //   console.log(value?.blocks["38ff6b46-4cbd-4933-a462-251c3e963b7a"]);
  // },[value]);
  useEffect(() => {
    bridge.onEditChange((updatedData) => {
      if (updatedData) {
        setValue(updatedData);
      }
    });
  }, [bridge]);

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
