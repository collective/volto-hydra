"use client";
import React, { useEffect, useState } from "react";
import { Menu as SemanticMenu, Dropdown } from "semantic-ui-react";
import { fetchContent } from "@/utils/api";
import { getTokenFromCookie } from "@/utils/hydra";
import Link from "next/link";
import RecursiveMenuItem from "@/components/RecursiveMenuItem";

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData(token = null) {
      try {
        const apiPath = "https://hydra.pretagov.com";
        const content = await fetchContent(apiPath, { token });
        setMenuItems(content.items || []);
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

  return (
    <SemanticMenu>
      <SemanticMenu.Item>
        <Link href="/">Home</Link>
      </SemanticMenu.Item>
      {menuItems.map(
        (item, index) =>
          item["@type"] === "Document" && (
            <RecursiveMenuItem key={index} item={item} />
          )
      )}
    </SemanticMenu>
  );
};

export default Menu;
