import { Suspense } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import type { HeaderViewer } from "@/components/site/SiteHeader";
import { publishedVideos } from "@/lib/gallery";
import { getSalesConfig } from "@/lib/sales";
import { getViewer } from "@/lib/viewer";

async function ViewerHeader({ hasVideos }: { hasVideos: boolean }) {
  const { status } = await getViewer();
  const viewer: HeaderViewer = status === "active" ? "licensed" : status === "no_license" || status === "revoked" ? "member" : "guest";
  return <SiteHeader hasVideos={hasVideos} viewer={viewer} salesOpen={getSalesConfig().canSell} />;
}

/** Site público. O cabeçalho estático é o de visitante; a sessão é lida no servidor e o substitui. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  const hasVideos = publishedVideos().length > 0;
  return (
    <>
      <Suspense fallback={<SiteHeader hasVideos={hasVideos} />}>
        <ViewerHeader hasVideos={hasVideos} />
      </Suspense>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter hasVideos={hasVideos} />
    </>
  );
}
