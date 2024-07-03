"use client";
import React, { useState } from "react";
import { Dropdown } from "semantic-ui-react";
import Link from "next/link";
import RecursiveMenuItem from "@/components/RecursiveMenuItem";
import extractEndpoints from '#utils/extractEndpoints';

const HoverableDropdown = ({ item, subItems }) => {
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => setOpen(true);
  const handleMouseLeave = () => setTimeout(() => setOpen(false), 300);
  const absoluteUrl = `${(new URL(window.location.href)).origin}/${extractEndpoints(item["@id"])}`;

  return (
    <Dropdown
      item
      text={item.title}
      open={open}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Dropdown.Menu>
        <Dropdown.Item as={Link} href={absoluteUrl}>
          {item.title}
        </Dropdown.Item>
        {subItems.map((subItem, index) => (
          <Dropdown.Item key={index}>
            <RecursiveMenuItem item={subItem} />
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default HoverableDropdown;
