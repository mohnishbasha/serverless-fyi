/** RSS / Atom / JSON Feed validity: well-formed, required elements, absolute links, no relative image src. */
import { XMLParser } from 'fast-xml-parser';
import { DIST, exists, read, Report, walk } from './lib/dist';

const r = new Report('validate-feeds');
const parser = new XMLParser({ ignoreAttributes: false });
const relSrc = /(?:src|href)=(?:"|&quot;)(?!https?:|mailto:|#)[^"&]+/;

const xmlFeeds = [
  'rss.xml',
  'feed.xml',
  'atom.xml',
  ...walk(`${DIST}/t`, (f) => f.endsWith('rss.xml')).map((f) => f.slice(DIST.length + 1)),
];
let items = 0;
for (const name of xmlFeeds) {
  const f = `${DIST}/${name}`;
  if (!exists(f)) {
    r.error(`${name} missing`);
    continue;
  }
  const xml = read(f);
  let doc;
  try {
    doc = parser.parse(xml, true); // `true` validates well-formedness and throws on errors
  } catch (e) {
    r.error(`${name}: not well-formed: ${String(e)}`);
    continue;
  }
  if (name.endsWith('atom.xml')) {
    const feed = doc.feed;
    for (const k of ['title', 'id', 'updated', 'author']) if (!feed?.[k]) r.error(`${name}: missing <${k}>`);
    const entries = [feed?.entry ?? []].flat();
    if (!entries.length) r.error(`${name}: no entries`);
    for (const e of entries) {
      items++;
      for (const k of ['title', 'id', 'updated', 'content']) if (!e[k]) r.error(`${name}: entry missing <${k}>`);
      if (!/^https:\/\//.test(e.id)) r.error(`${name}: entry id not absolute: ${e.id}`);
      if (relSrc.test(String(e.content?.['#text'] ?? e.content)))
        r.error(`${name}: relative URL in content of ${e.id}`);
    }
  } else {
    const ch = doc.rss?.channel;
    if (doc.rss?.['@_version'] !== '2.0') r.error(`${name}: not RSS 2.0`);
    for (const k of ['title', 'link', 'description']) if (!ch?.[k]) r.error(`${name}: missing <${k}>`);
    const list = [ch?.item ?? []].flat();
    if (!list.length) r.error(`${name}: no items`);
    for (const i of list) {
      items++;
      for (const k of ['title', 'link', 'guid', 'pubDate', 'description'])
        if (!i[k]) r.error(`${name}: item missing <${k}>`);
      if (!/^https:\/\//.test(i.link)) r.error(`${name}: item link not absolute: ${i.link}`);
      const html = String(i['content:encoded'] ?? '');
      if (!html) r.error(`${name}: item ${i.link} missing content:encoded`);
      if (relSrc.test(html)) r.error(`${name}: relative URL in content of ${i.link}`);
    }
  }
}

const jf = `${DIST}/feed.json`;
if (!exists(jf)) r.error('feed.json missing');
else {
  const j = JSON.parse(read(jf));
  if (j.version !== 'https://jsonfeed.org/version/1.1') r.error('feed.json: wrong version');
  for (const k of ['title', 'home_page_url', 'feed_url', 'items']) if (!j[k]) r.error(`feed.json: missing ${k}`);
  for (const i of j.items ?? []) {
    items++;
    for (const k of ['id', 'url', 'title', 'content_html', 'date_published'])
      if (!i[k]) r.error(`feed.json: item missing ${k}`);
    if (!/^https:\/\//.test(i.url)) r.error(`feed.json: item url not absolute: ${i.url}`);
    if (relSrc.test(i.content_html)) r.error(`feed.json: relative URL in ${i.url}`);
  }
}
r.finish(`${xmlFeeds.length + 1} feeds, ${items} items OK`);
