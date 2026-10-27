/** Paths are relative (no leading slash) so they resolve under baseURL, including a staging base path. */
export const POST = 'p/understanding-the-dns-header/';
export const LONG_POST = 'p/current2024-austin-texas/';
export const TEMPLATES = {
  home: '',
  post: POST,
  tag: 't/distributed-systems/',
  archive: 'archive/',
  authors: 'authors/',
  subscribe: 'subscribe/',
  tags: 'tags/',
  about: 'about/',
  search: 'search/',
  notFound: 'this-page-does-not-exist/',
} as const;
