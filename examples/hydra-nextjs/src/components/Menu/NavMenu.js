"use client";
import React from "react";
import { Dropdown, Menu as SemanticMenu } from "semantic-ui-react";
import Link from "next/link";

function getPath(item) {
  return '/' + (item['@id'] || '').replace(/^https?:\/\/[^/]+\//, '');
}

function NavItem({ item }) {
  const path = getPath(item);

  if (item.items && item.items.length > 0) {
    return (
      <Dropdown item text={item.title}>
        <Dropdown.Menu>
          {item.items.map((child, i) => (
            <Dropdown.Item key={i} as={Link} href={getPath(child)}>
              {child.title}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
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
