import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const dist = path.resolve('dist');
const site = 'https://timurpanin.ru';
const hostname = new URL(site).hostname;
const issues = [];
const routes = new Map();
const sitemapUrls = new Map();
let internalLinks = 0;
let sitemapFiles = 0;

function report(file, rule, value) {
  issues.push({ file, rule, value: String(value) });
}

async function filesWithin(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files.sort();
}

function label(file) {
  return `dist/${path.relative(dist, file).split(path.sep).join('/')}`;
}

function routeFor(file) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function findAll(node, predicate) {
  const found = predicate(node) ? [node] : [];
  for (const child of node.childNodes ?? []) found.push(...findAll(child, predicate));
  return found;
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value;
}

function meta(document, key, value) {
  return findAll(document, (node) => node.tagName === 'meta' && attribute(node, key)?.toLowerCase() === value);
}

function pageMetadata(document, file) {
  const robotsNodes = meta(document, 'name', 'robots');
  if (robotsNodes.length !== 1) report(file, 'robots-count', robotsNodes.length);
  const robots = attribute(robotsNodes[0], 'content') ?? '';
  const directives = new Set(robots.toLowerCase().split(',').map((part) => part.trim()));
  const indexable = directives.has('index') && directives.has('follow') && !directives.has('noindex');
  const noindex = directives.has('noindex') && directives.has('follow') && !directives.has('index');
  if (!indexable && !noindex) report(file, 'robots-policy', robots || '(missing)');

  const canonicalNodes = findAll(document, (node) =>
    node.tagName === 'link' && attribute(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'),
  );
  if (indexable && canonicalNodes.length !== 1) report(file, 'canonical-count', canonicalNodes.length);
  return { indexable, noindex, canonical: attribute(canonicalNodes[0], 'href') };
}

function checkLinks(document, sourceRoute, file) {
  const base = new URL(sourceRoute, site);
  const anchors = findAll(document, (node) => node.tagName === 'a');
  for (const anchor of anchors) {
    const href = attribute(anchor, 'href');
    if (href === undefined) continue;
    const value = href.trim();
    if (!value) {
      report(file, 'internal-link-empty', JSON.stringify(href));
      continue;
    }
    if (value.startsWith('#')) continue;
    let target;
    try {
      target = new URL(value, base);
    } catch {
      report(file, 'internal-link-invalid-url', value);
      continue;
    }
    if (target.protocol === 'javascript:') {
      report(file, 'internal-link-javascript', value);
      continue;
    }
    if (target.protocol === 'mailto:' || target.protocol === 'tel:') continue;
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      report(file, 'internal-link-unsupported-scheme', value);
      continue;
    }
    if (target.hostname !== hostname) continue;
    internalLinks++;
    if (target.protocol !== 'https:') report(file, 'internal-link-https', value);
    if (routes.has(target.pathname)) {
      if (!target.pathname.endsWith('/') && target.pathname !== '/404.html') {
        report(file, 'internal-link-trailing-slash', value);
      }
    } else if (routes.has(`${target.pathname}/`)) {
      report(file, 'internal-link-trailing-slash', value);
    } else {
      report(file, 'internal-link-target', value);
    }
  }
}

function parseXml(xml, file) {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) {
    report(file, 'xml-syntax', valid.err?.msg ?? JSON.stringify(valid));
    return undefined;
  }
  try {
    return new XMLParser({ removeNSPrefix: true, parseTagValue: false }).parse(xml);
  } catch (error) {
    report(file, 'xml-parse', error.message);
    return undefined;
  }
}

function entries(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function siteUrl(value, file, rule) {
  if (typeof value !== 'string' || !value.trim()) {
    report(file, rule, JSON.stringify(value));
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== hostname || url.search || url.hash || url.port) {
      report(file, rule, value);
      return undefined;
    }
    return url;
  } catch {
    report(file, rule, value);
    return undefined;
  }
}

function fileForUrl(url, source, rule) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    report(source, rule, url.href);
    return undefined;
  }
  const file = path.resolve(dist, `.${pathname}`);
  const relative = path.relative(dist, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    report(source, rule, url.href);
    return undefined;
  }
  return file;
}

async function checkSitemaps(allFiles) {
  const xmlFiles = allFiles.filter((file) => path.dirname(file) === dist && file.endsWith('.xml'));
  const indexes = [];
  for (const file of xmlFiles) {
    const parsed = parseXml(await readFile(file, 'utf8'), label(file));
    if (parsed?.sitemapindex) indexes.push({ file, parsed });
  }
  if (indexes.length !== 1) {
    report('dist/', 'sitemap-index-count', indexes.length);
    return undefined;
  }
  const { file: indexFile, parsed: index } = indexes[0];
  const children = entries(index.sitemapindex.sitemap);
  if (children.length === 0) report(label(indexFile), 'sitemap-index-empty', 0);
  const seenChildren = new Set();
  for (const child of children) {
    const url = siteUrl(child?.loc, label(indexFile), 'sitemap-file-url');
    if (!url) continue;
    if (seenChildren.has(url.href)) report(label(indexFile), 'sitemap-file-duplicate', url.href);
    seenChildren.add(url.href);
    const childFile = fileForUrl(url, label(indexFile), 'sitemap-file-path');
    if (!childFile) continue;
    let xml;
    try {
      xml = await readFile(childFile, 'utf8');
    } catch {
      report(label(indexFile), 'sitemap-file-missing', url.href);
      continue;
    }
    const parsed = parseXml(xml, label(childFile));
    if (!parsed) continue;
    if (!parsed.urlset) {
      report(label(childFile), 'sitemap-urlset', Object.keys(parsed).join(','));
      continue;
    }
    sitemapFiles++;
    for (const entry of entries(parsed.urlset.url)) {
      const pageUrl = siteUrl(entry?.loc, label(childFile), 'sitemap-url');
      if (!pageUrl) continue;
      if (!pageUrl.pathname.endsWith('/')) report(label(childFile), 'sitemap-trailing-slash', pageUrl.href);
      const count = (sitemapUrls.get(pageUrl.href) ?? 0) + 1;
      sitemapUrls.set(pageUrl.href, count);
      if (count > 1) report(label(childFile), 'sitemap-url-duplicate', pageUrl.href);
      const page = routes.get(pageUrl.pathname);
      if (!page) {
        report(label(childFile), 'sitemap-target', pageUrl.href);
      } else {
        if (!page.indexable) report(label(childFile), 'sitemap-noindex', pageUrl.href);
        if (page.canonical !== pageUrl.href) {
          report(label(childFile), 'sitemap-canonical', `${pageUrl.href} -> ${page.canonical ?? '(missing)'}`);
        }
      }
    }
  }
  return indexFile;
}

async function checkRobots(indexFile) {
  const robotsFile = path.join(dist, 'robots.txt');
  let robots;
  try {
    robots = await readFile(robotsFile, 'utf8');
  } catch {
    report(label(robotsFile), 'robots-file-missing', '(missing)');
    return;
  }
  const directives = robots.split(/\r?\n/).map((line) => /^Sitemap\s*:\s*(.*)$/i.exec(line.trim())).filter(Boolean);
  if (directives.length !== 1) report(label(robotsFile), 'robots-sitemap-count', directives.length);
  for (const match of directives) {
    const url = siteUrl(match[1].trim(), label(robotsFile), 'robots-sitemap-url');
    if (!url) continue;
    const target = fileForUrl(url, label(robotsFile), 'robots-sitemap-path');
    if (target && target !== indexFile) report(label(robotsFile), 'robots-sitemap-index', url.href);
    if (target && !await readFile(target).then(() => true, () => false)) {
      report(label(robotsFile), 'robots-sitemap-missing', url.href);
    }
  }
}

try {
  const allFiles = await filesWithin(dist);
  const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
  if (htmlFiles.length === 0) report('dist/', 'html-files', 0);
  for (const file of htmlFiles) {
    const route = routeFor(file);
    const document = parse(await readFile(file, 'utf8'));
    if (routes.has(route)) report(label(file), 'generated-route-duplicate', route);
    routes.set(route, { file, document, ...pageMetadata(document, label(file)) });
  }
  for (const [route, page] of routes) checkLinks(page.document, route, label(page.file));
  const indexFile = await checkSitemaps(allFiles);
  await checkRobots(indexFile);
  for (const [route, page] of routes) {
    const canonicalUrl = page.canonical;
    if (page.indexable) {
      if (!canonicalUrl) report(label(page.file), 'indexable-canonical-missing', route);
      else if (sitemapUrls.get(canonicalUrl) !== 1) {
        report(label(page.file), 'indexable-sitemap-membership', `${canonicalUrl} count=${sitemapUrls.get(canonicalUrl) ?? 0}`);
      }
    } else if (page.noindex && sitemapUrls.has(new URL(route, site).href)) {
      report(label(page.file), 'noindex-in-sitemap', route);
    }
  }
} catch (error) {
  report('dist/', 'read-generated-output', error.message);
}

if (issues.length) {
  console.error(`SEO link QA failed (${issues.length} issues)`);
  for (const issue of issues) {
    console.error(`File: ${issue.file}\nRule: ${issue.rule}\nValue: ${issue.value}`);
  }
  process.exitCode = 1;
} else {
  console.log('SEO link QA passed');
  console.log(`HTML files: ${routes.size}`);
  console.log(`Internal links checked: ${internalLinks}`);
  console.log(`Indexable pages: ${[...routes.values()].filter((page) => page.indexable).length}`);
  console.log(`Noindex pages: ${[...routes.values()].filter((page) => page.noindex).length}`);
  console.log(`Sitemap URLs: ${sitemapUrls.size}`);
  console.log(`Sitemap files: ${sitemapFiles}`);
}
