import data from './works.json';
import type { ArtCollection, Artwork } from '@/components/art/ArtGallery';

export const artCollections: ArtCollection[] = data.collections;
export const artworks: Artwork[] = data.works;
export const portfolioCover = data.portfolioCover;
