import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GalleryEmpty } from "@/components/gallery/GalleryEmpty";
import { VideoCard } from "@/components/gallery/VideoCard";
import { SAMPLE_IDEAS } from "@/data/ideas";
import { publishedVideos } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Animações",
  description: "Animações reais criadas com prompts do CENA LAB, com o passo a passo de cada uma.",
};

export default function GalleryPage() {
  const videos = publishedVideos();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="max-w-2xl">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">Animações</p>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Feitas com o CENA LAB</h1>
        <p className="mt-4 text-lg text-muted">
          Vídeos reais criados a partir de prompts do estúdio. Em cada um, veja a ideia original, as escolhas e como foi
          produzido.
        </p>
      </header>

      <div className="mt-10">
        {videos.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v, i) => (
              <VideoCard key={v.id} video={v} eager={i === 0} />
            ))}
          </div>
        ) : (
          <GalleryEmpty />
        )}
      </div>

      <section aria-labelledby="ideias" className="mt-16">
        <h2 id="ideias" className="text-2xl font-bold">
          Ideias para começar
        </h2>
        <p className="mt-2 text-sm text-muted">Abra no estúdio com a ideia já preenchida.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_IDEAS.map((idea) => (
            <li key={idea}>
              <Link
                href={`/studio?ideia=${encodeURIComponent(idea)}`}
                className="card-hover group flex h-full items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-medium text-fg"
              >
                {idea}
                <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
