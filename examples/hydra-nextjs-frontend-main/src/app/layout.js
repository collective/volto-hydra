"use client";
import "../styles.css";
import "semantic-ui-css/semantic.min.css";
import { useEffect } from "react";
import { initBridge } from "@/utils/hydra";
import TranstackProviders from "@/providers/TranstackProviders";
import { Container } from "semantic-ui-react";
import Menu from "@/components/Menu";

export default function RootLayout({ children }) {
  useEffect(() => {
    initBridge("https://hydra.pretagov.com");
  });

  return (
    <>
      <html lang="en">
        <head>
          <title>Volto Hydra Nextjs Example Frontend </title>
        </head>
        <body>
          <Container>
            <header>
              <Menu />
            </header>
            <TranstackProviders>
              <div className="container">{children}</div>
            </TranstackProviders>
          </Container>
        </body>
      </html>
    </>
  );
}
