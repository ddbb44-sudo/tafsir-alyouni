import { SITE } from '../data/site';

export interface SeoInput {
  title: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string | null;
}

export function buildSeo(input: SeoInput) {
  return {
    title: input.seoTitle ?? `${input.title} - ${SITE.author}`,
    description: input.seoDescription ?? input.description,
    ogImage: input.ogImage ?? SITE.ogImage,
  };
}
