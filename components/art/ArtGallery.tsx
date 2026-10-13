import Media from '@/components/work/Media';
import styles from './art-gallery.module.css';

export interface ArtCollection {
  id: string;
  title: string;
  description?: string;
}

export interface ArtImage {
  src: string;
  previewSrc?: string;
  alt: string;
  width: number;
  height: number;
}

export interface Artwork {
  id: string;
  title: string;
  description: string;
  statement?: string;
  collectionId: string;
  sourcePage: number;
  medium?: string;
  dimensions?: string;
  image: ArtImage;
  detailImages?: Array<ArtImage & { caption?: string; sourcePage?: number }>;
}

export default function ArtGallery({ collections, works }: { collections: ArtCollection[]; works: Artwork[] }) {
  const groups = collections
    .map((collection) => ({ collection, works: works.filter((work) => work.collectionId === collection.id) }))
    .filter((group) => group.works.length > 0);

  if (groups.length === 0) return null;

  return (
    <div id="artworks" className={styles.gallery}>
      <nav className={styles.index} aria-label="Paintings">
        {works.map((work) => <a key={work.id} href={`#${work.id}`}>{work.title}</a>)}
        {groups.length > 1 && groups.map(({ collection }) => (
          <a key={collection.id} href={`#collection-${collection.id}`}>{collection.title}</a>
        ))}
      </nav>

      {groups.map(({ collection, works: groupWorks }) => (
        <section key={collection.id} id={`collection-${collection.id}`} className={styles.collection} aria-labelledby={`collection-title-${collection.id}`}>
          <header className={styles.collectionHeader}>
            <div>
              <h2 id={`collection-title-${collection.id}`}>{collection.title}</h2>
              {collection.description && <p>{collection.description}</p>}
            </div>
            <p className={styles.count}>{groupWorks.length} {groupWorks.length === 1 ? 'painting' : 'paintings'}</p>
          </header>

          <div className={styles.works}>
            {groupWorks.map((work) => (
              <article id={work.id} key={work.id} className={styles.work} aria-labelledby={`artwork-title-${work.id}`}>
                <div className={styles.painting}>
                  <Media priority={work.id === works[0]?.id} previewSrc={work.image.previewSrc} media={{ id: work.id, kind: 'image', src: work.image.src, alt: work.image.alt, width: work.image.width, height: work.image.height, caption: '' }} />
                </div>
                <div className={styles.caption}>
                  <h3 id={`artwork-title-${work.id}`}>{work.title}</h3>
                  {(work.medium || work.dimensions) && <p className={styles.metadata}>{[work.medium, work.dimensions].filter(Boolean).join(' · ')}</p>}
                  {work.description && <p className={styles.description}>{work.description}</p>}
                </div>
                {(work.statement || Boolean(work.detailImages?.length)) && (
                  <div className={styles.notes}>
                    {work.statement && <div className={styles.statement}><h4>Artist’s note</h4>{work.statement.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
                    {work.detailImages && work.detailImages.length > 0 && <div className={styles.detailImages}>
                      {work.detailImages.map((detail, index) => (
                        <Media key={detail.src} previewSrc={detail.previewSrc} media={{ id: `${work.id}-detail-${index + 1}`, kind: 'image', src: detail.src, alt: detail.alt, width: detail.width, height: detail.height, caption: detail.caption || '' }} />
                      ))}
                    </div>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
