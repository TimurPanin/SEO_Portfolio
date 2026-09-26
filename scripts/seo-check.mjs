import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';

const dist = path.resolve('dist');
const site = 'https://timurpanin.ru';
const problems = [];
const counts = { html: 0, indexable: 0, noindex: 0, jsonLd: 0 };
const uniqueValues = {
  title: new Map(),
  description: new Map(),
  canonical: new Map(),
};

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files.sort();
}

function findAll(node, predicate) {
  const found = predicate(node) ? [node] : [];
  for (const child of node.childNodes ?? []) found.push(...findAll(child, predicate));
  return found;
}

function elements(node, tagName) {
  return findAll(node, (child) => child.tagName === tagName);
}

function attribute(node, name) {
  return node?.attrs?.find((attr) => attr.name === name)?.value;
}

function textContent(node) {
  if (node.nodeName === '#text') return node.value;
  return (node.childNodes ?? []).map(textContent).join('');
}

function report(file, rule, actual) {
  problems.push(`${file}: ${rule}${actual === undefined ? '' : ` (actual: ${actual})`}`);
}

function one(file, rule, nodes) {
  if (nodes.length !== 1) report(file, rule, `count=${nodes.length}`);
  return nodes.length === 1 ? nodes[0] : undefined;
}

function remember(kind, value, file) {
  if (!value) return;
  const files = uniqueValues[kind].get(value) ?? [];
  files.push(file);
  uniqueValues[kind].set(value, files);
}

function routeFromFile(file) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function validateJsonLd(document, file) {
  const scripts = elements(document, 'script').filter(
    (node) => attribute(node, 'type')?.toLowerCase() === 'application/ld+json',
  );
  counts.jsonLd += scripts.length;
  for (const [index, script] of scripts.entries()) {
    const rule = `JSON-LD block ${index + 1}`;
    try {
      const data = JSON.parse(textContent(script));
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        report(file, `${rule} must be an object`, typeof data);
        continue;
      }
      if (Object.hasOwn(data, '@context') && data['@context'] !== 'https://schema.org') {
        report(file, `${rule} @context`, JSON.stringify(data['@context']));
      }
      if (typeof data['@type'] !== 'string' || !data['@type'].trim()) {
        report(file, `${rule} @type`, JSON.stringify(data['@type']));
      }
    } catch (error) {
      report(file, `${rule} JSON.parse`, error.message);
    }
  }
}

async function checkFile(file) {
  const label = path.relative(dist, file).split(path.sep).join('/');
  const route = routeFromFile(file);
  const document = parse(await readFile(file, 'utf8'));
  counts.html++;

  const html = one(label, 'html element', elements(document, 'html'));
  if (attribute(html, 'lang') !== 'ru') report(label, 'html lang=ru', attribute(html, 'lang'));

  const meta = (key, value) => elements(document, 'meta').filter(
    (node) => attribute(node, key)?.toLowerCase() === value,
  );
  const titleNode = one(label, 'title', elements(document, 'title'));
  const title = titleNode ? textContent(titleNode).trim() : '';
  if (titleNode && !title) report(label, 'non-empty title', JSON.stringify(title));

  const descriptionNode = one(label, 'meta description', meta('name', 'description'));
  const description = attribute(descriptionNode, 'content')?.trim() ?? '';
  if (descriptionNode && !description) report(label, 'non-empty meta description', JSON.stringify(description));

  const robotsNode = one(label, 'meta robots', meta('name', 'robots'));
  const robots = attribute(robotsNode, 'content') ?? '';
  const directives = new Set(robots.toLowerCase().split(',').map((part) => part.trim()));

  const h1Node = one(label, 'H1', elements(document, 'h1'));
  const h1 = h1Node ? textContent(h1Node).trim() : '';
  if (h1Node && !h1) report(label, 'non-empty H1', JSON.stringify(h1));
  if (meta('name', 'viewport').length === 0) report(label, 'viewport meta', 'count=0');

  const canonicals = elements(document, 'link').filter(
    (node) => attribute(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'),
  );
  const ogUrls = meta('property', 'og:url');
  const directivesValid = directives.has('follow') && directives.has('index') !== directives.has('noindex');
  if (!directivesValid) {
    report(label, 'supported robots policy (index, follow or noindex, follow)', JSON.stringify(robots));
  } else if (directives.has('noindex')) {
    counts.noindex++;
    // Current project policy for noindex pages; revisit if new technical pages need different metadata.
    if (canonicals.length) report(label, 'noindex canonical absent', `count=${canonicals.length}`);
    if (ogUrls.length) report(label, 'noindex og:url absent', `count=${ogUrls.length}`);
  } else {
    counts.indexable++;
    remember('title', title, label);
    remember('description', description, label);

    const canonicalNode = one(label, 'canonical', canonicals);
    const canonical = attribute(canonicalNode, 'href') ?? '';
    remember('canonical', canonical, label);
    if (canonicalNode) {
      try {
        const url = new URL(canonical);
        if (url.protocol !== 'https:' || url.hostname !== 'timurpanin.ru') {
          report(label, 'canonical HTTPS and hostname', canonical);
        }
        if (url.search || url.hash) report(label, 'canonical without query or fragment', canonical);
        if (!route.endsWith('/') || !url.pathname.endsWith('/')) {
          report(label, 'canonical trailing slash', canonical);
        }
        if (canonical !== new URL(route, site).href) {
          report(label, 'canonical matches HTML file URL', `expected=${new URL(route, site).href}, got=${canonical}`);
        }
      } catch {
        report(label, 'canonical absolute URL', JSON.stringify(canonical));
      }
    }

    for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale']) {
      one(label, property, meta('property', property));
    }
    const ogUrl = attribute(ogUrls.length === 1 ? ogUrls[0] : undefined, 'content');
    if (canonical && ogUrl !== undefined && ogUrl !== canonical) {
      report(label, 'og:url equals canonical', `canonical=${canonical}, og:url=${ogUrl}`);
    }

    for (const name of ['twitter:card', 'twitter:title', 'twitter:description']) {
      one(label, name, meta('name', name));
    }
    const twitterTitle = attribute(meta('name', 'twitter:title')[0], 'content');
    const twitterDescription = attribute(meta('name', 'twitter:description')[0], 'content');
    if (titleNode && twitterTitle !== undefined && twitterTitle !== title) {
      report(label, 'twitter:title equals title', `title=${title}, twitter:title=${twitterTitle}`);
    }
    if (descriptionNode && twitterDescription !== undefined && twitterDescription !== description) {
      report(label, 'twitter:description equals meta description', `description=${description}, twitter:description=${twitterDescription}`);
    }
  }

  validateJsonLd(document, label);
}

try {
  const files = await htmlFiles(dist);
  if (files.length === 0) report('dist/', 'HTML files found', 'count=0');
  for (const file of files) {
    try {
      await checkFile(file);
    } catch (error) {
      report(path.relative(dist, file), 'HTML check', error.message);
    }
  }
  for (const [kind, values] of Object.entries(uniqueValues)) {
    for (const [value, duplicates] of values) {
      if (duplicates.length > 1) report(duplicates.join(', '), `unique ${kind}`, JSON.stringify(value));
    }
  }
} catch (error) {
  report('dist/', 'read build output', error.message);
}

if (problems.length) {
  console.error(`SEO QA failed (${problems.length} issue${problems.length === 1 ? '' : 's'})`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log('SEO QA passed');
  console.log(`HTML files: ${counts.html}`);
  console.log(`Indexable: ${counts.indexable}`);
  console.log(`Noindex: ${counts.noindex}`);
  console.log(`JSON-LD blocks: ${counts.jsonLd}`);
}
