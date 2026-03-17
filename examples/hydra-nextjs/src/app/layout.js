import "../styles.css";
import "semantic-ui-css/semantic.min.css";
import TranstackProviders from "@/providers/TranstackProviders";
import { Container } from "semantic-ui-react";
import NavMenu from "@/components/Menu/NavMenu";

const apiPath = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

async function getNavItems() {
  try {
    const response = await fetch(`${apiPath}/++api++/?expand=navigation&expand.navigation.depth=2`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data?.["@components"]?.navigation?.items || data?.items || [];
  } catch {
    return [];
  }
}

export const metadata = {
  title: "Volto Hydra Next.js Example Frontend",
};

export default async function RootLayout({ children }) {
  const navItems = await getNavItems();

  return (
    <html lang="en">
      <body>
        <Container>
          <header>
            <NavMenu items={navItems} />
          </header>
          <TranstackProviders>
            <div className="container">{children}</div>
          </TranstackProviders>
        </Container>
      </body>
    </html>
  );
}
