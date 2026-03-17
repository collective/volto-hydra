"use client";
import { useState, useMemo } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import bash from "highlight.js/lib/languages/bash";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("jsx", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("bash", bash);

function highlight(tab) {
  const code = tab.code || "";
  const language = tab.language;
  if (!code) return "";
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value;
  }
  return hljs.highlightAuto(code).value;
}

export default function CodeExampleBlock({ id, block }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  // Support both formats: tabs array (Plone content) or direct code/language (doc examples)
  const tabs = block.tabs || (block.code ? [{ "@id": id + "-tab", code: block.code, language: block.language, label: block.title }] : []);

  const copyCode = async (tab) => {
    await navigator.clipboard.writeText(tab.code || "");
    setCopiedId(tab["@id"]);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div data-block-uid={id} data-block-container='{"add":"horizontal"}' style={{ margin: "1rem 0" }}>
      <div style={{ borderRadius: "0.5rem", overflow: "hidden", background: "#111827" }}>
        {/* Tab bar (only when 2+ tabs) */}
        {tabs.length > 1 && (
          <div data-tab-bar style={{ display: "flex", background: "#1f2937", borderBottom: "1px solid #374151" }}>
            {tabs.map((tab, i) => (
              <button
                key={tab["@id"]}
                data-block-uid={tab["@id"]}
                data-linkable-allow
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.15s",
                  background: activeTab === i ? "#111827" : "transparent",
                  color: activeTab === i ? "#fff" : "#9ca3af",
                  borderBottom: activeTab === i ? "2px solid #60a5fa" : "2px solid transparent",
                }}
              >
                <span data-edit-text="label">{tab.label || tab.language || `Tab ${i + 1}`}</span>
              </button>
            ))}
          </div>
        )}
        {/* Each tab is a child block */}
        {tabs.map((tab, i) => (
          <div
            key={tab["@id"]}
            data-block-uid={tab["@id"]}
            data-block-add="right"
            style={{ display: activeTab === i ? "block" : "none", position: "relative" }}
          >
            <button
              onClick={() => copyCode(tab)}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                color: "#9ca3af",
                background: "#1f2937",
                border: "none",
                borderRadius: "0.25rem",
                cursor: "pointer",
                opacity: 0.7,
                zIndex: 10,
              }}
            >
              {copiedId === tab["@id"] ? "Copied!" : "Copy"}
            </button>
            <pre
              data-edit-text="code"
              style={{
                padding: "1rem",
                overflow: "auto",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                margin: 0,
                color: "#f3f4f6",
                whiteSpace: "pre-wrap",
              }}
            >
              <code className="hljs" dangerouslySetInnerHTML={{ __html: highlight(tab) }} />
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
