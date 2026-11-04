import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    // Só anuncia o sitemap quando há uma URL pública configurada (nunca localhost).
    ...(SITE.publicUrl ? { sitemap: `${SITE.publicUrl}/sitemap.xml`, host: SITE.publicUrl } : {}),
  };
}
