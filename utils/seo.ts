const SITE_URL = 'https://ceecc.vercel.app';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_IMAGE_ALT = 'Focus Space 大考倒數：學測、會考、統測、分科測驗讀書計時助手';

type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
};

const toAbsoluteUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

export const updateSeoMetadata = ({
  title,
  description,
  canonicalPath = '/',
  image = DEFAULT_IMAGE,
  imageAlt = DEFAULT_IMAGE_ALT,
}: SeoMetadata) => {
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const imageUrl = toAbsoluteUrl(image);

  document.title = title;
  upsertCanonical(canonicalUrl);

  upsertMeta('name', 'title', title);
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'image', imageUrl);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', 'Focus Space 大考倒數');
  upsertMeta('property', 'og:locale', 'zh_TW');
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', imageUrl);
  upsertMeta('property', 'og:image:secure_url', imageUrl);
  upsertMeta('property', 'og:image:type', 'image/png');
  upsertMeta('property', 'og:image:width', '1200');
  upsertMeta('property', 'og:image:height', '630');
  upsertMeta('property', 'og:image:alt', imageAlt);

  upsertMeta('property', 'twitter:card', 'summary_large_image');
  upsertMeta('property', 'twitter:url', canonicalUrl);
  upsertMeta('property', 'twitter:title', title);
  upsertMeta('property', 'twitter:description', description);
  upsertMeta('property', 'twitter:image', imageUrl);
  upsertMeta('property', 'twitter:image:alt', imageAlt);
};
