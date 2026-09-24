export type GuideBlock = {
  type: "text" | "image";
  heading?: string;
  text?: string;
  url?: string;
  caption?: string;
};
export type Guide = { title: string; blocks: GuideBlock[]; version: number };
export function GuideContent({ guide }: { guide: Guide }) {
  return (
    <article className="guide-article">
      <h1>{guide.title}</h1>
      {guide.blocks.map((block, index) =>
        block.type === "image" ? (
          <figure key={index}>
            <img
              src={block.url}
              alt={block.caption || "Ilustrasi panduan lelang"}
              loading="lazy"
            />
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        ) : (
          <section key={index}>
            {block.heading && <h2>{block.heading}</h2>}
            <p>{block.text}</p>
          </section>
        ),
      )}
    </article>
  );
}
