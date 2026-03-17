"use client";
import React from "react";
import { Menu as SemanticMenu } from "semantic-ui-react";
import Link from "next/link";

function NavItem({ item }) {
  const path = '/' + (item['@id'] || '').replace(/^https?:\/\/[^/]+\//, '');

  if (item.items && item.items.length > 0) {
    return (
      <SemanticMenu.Item>
        <Link href={path}>{item.title}</Link>
      </SemanticMenu.Item>
    );
  }

  return (
    <SemanticMenu.Item as={Link} href={path}>
      {item.title}
    </SemanticMenu.Item>
  );
}

export default function NavMenu({ items = [] }) {
  return (
    <SemanticMenu>
      <SemanticMenu.Item as={Link} href="/">
        Home
      </SemanticMenu.Item>
      {items.map((item, index) => (
        <NavItem key={index} item={item} />
      ))}
    </SemanticMenu>
  );
}
