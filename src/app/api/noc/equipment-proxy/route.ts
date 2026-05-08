import { NextRequest, NextResponse } from 'next/server';

const PORT = 2021;
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

const ATTR_RE = /((?:src|href|action|data-src|poster)=["'])(?!https?:\/\/|\/\/|#|data:|javascript:|mailto:)([^"']*)(["'])/gi;
const CSS_URL_RE = /url\(["']?(?!https?:\/\/|\/\/|data:)([^"')]+)["']?\)/gi;
const FETCH_RE = /(fetch\s*\(\s*["'])(\/[^"']*)(["'])/gi;
const JQ_RE = /(\$\.(?:get|post)\s*\(\s*["'])(\/[^"']*)(["'])/gi;
const LOCATION_RE = /((?:window\.|document\.)?location(?:\.href)?\s*=\s*["'])(\/[^"']*)(["'])/gi;
const LOCATION_ASSIGN_RE = /((?:window\.|document\.)?location\.(?:assign|replace)\s*\(\s*["'])(\/[^"']*)(["'])/gi;
const FORM_ACTION_RE = /((?:\.action\s*=\s*["']))(\/[^"']*)(["'])/gi;

const DEFAULT_LOGIN = 'admin';
const DEFAULT_PASSWORD = '@19Connect#';

function buildProxyUrl(ip: string, resourcePath: string, search: string): string {
  const qp = new URLSearchParams();
  qp.set('ip', ip);
  qp.set('path', resourcePath);
  if (search) {
    qp.set('q', search.replace(/^\?/, ''));
  }
  return `/api/noc/equipment-proxy?${qp.toString()}`;
}

function toAbsolutePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath;
  const baseDir = basePath.endsWith('/')
    ? basePath
    : `${basePath.slice(0, Math.max(0, basePath.lastIndexOf('/')) + 1)}`;
  const cleanBase = baseDir || '/';
  const parts = cleanBase.split('/').filter(Boolean);
  for (const seg of relativePath.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return `/${parts.join('/')}`;
}

function rewriteHtml(html: string, ip: string, basePath: string): string {
  const baseProxy = buildProxyUrl(ip, basePath, '');
  const toProxyLiteral = (raw: string) => {
    const [pathPart, queryPart = ''] = String(raw || '').split('?');
    const absolutePath = toAbsolutePath(basePath, pathPart);
    return buildProxyUrl(ip, absolutePath, queryPart);
  };
  const autoLoginScript = `<script>
(function(){
  var USER = ${JSON.stringify(DEFAULT_LOGIN)};
  var PASS = ${JSON.stringify(DEFAULT_PASSWORD)};
  var IP = ${JSON.stringify(ip)};
  var BASE_PATH = ${JSON.stringify(basePath)};

  function primeWebfigAutoLogin(){
    try {
      var isWebfigPath = String(BASE_PATH || '').toLowerCase().startsWith('/webfig');
      if(!isWebfigPath) return;
      if(!sessionStorage.getItem('name')) sessionStorage.setItem('name', USER);
      if(!sessionStorage.getItem('password')) sessionStorage.setItem('password', PASS);
      if(!window.name) window.name = 'autologin=' + USER + '|' + PASS;
    } catch(_e) {}
  }

  function bySelectors(selectors){
    for(var i=0;i<selectors.length;i++){
      var el = document.querySelector(selectors[i]);
      if(el) return el;
    }
    return null;
  }

  function fillAndMaybeSubmit(){
    primeWebfigAutoLogin();

    var userInput = bySelectors([
      'input[name="username"]',
      'input[name="user"]',
      'input[name="login"]',
      'input[id*="user" i]',
      'input[id*="login" i]',
      'input[type="text"]'
    ]);

    var passInput = bySelectors([
      'input[name="password"]',
      'input[name="pass"]',
      'input[id*="pass" i]',
      'input[type="password"]'
    ]);

    if(userInput){
      userInput.value = USER;
      userInput.dispatchEvent(new Event('input', {bubbles:true}));
      userInput.dispatchEvent(new Event('change', {bubbles:true}));
    }

    if(passInput){
      passInput.value = PASS;
      passInput.dispatchEvent(new Event('input', {bubbles:true}));
      passInput.dispatchEvent(new Event('change', {bubbles:true}));
    }

    var loginForm = document.getElementById('login') || (passInput && passInput.form) || (userInput && userInput.form);
    if(loginForm && userInput && passInput){
      try {
        sessionStorage.setItem('name', String(userInput.value || USER));
        sessionStorage.setItem('password', String(passInput.value || PASS));
        if(!window.name) window.name = 'autologin=' + USER + '|' + PASS;
      } catch(_e) {}

      setTimeout(function(){
        try {
          var hash = String(window.location.hash || '');
          window.location.replace(toProxy('/webfig/' + hash));
        } catch(_e) {}
      }, 120);
    }
  }

  function toProxy(u){
    try {
      if(!u) return u;
      if(typeof u === 'object' && u && 'toString' in u) {
        u = u.toString();
      }
      if(/^https?:\\/\\//i.test(u) || /^\\/\\//.test(u) || /^data:/i.test(u) || /^javascript:/i.test(u) || /^mailto:/i.test(u)) {
        // Convert direct device absolute URLs back through proxy.
        var s = String(u);
        var devicePrefix = 'http://' + IP + ':${PORT}';
        if(s.toLowerCase().startsWith(devicePrefix.toLowerCase())){
          var rest = s.slice(devicePrefix.length);
          var idx = rest.indexOf('?');
          var rp = idx >= 0 ? rest.slice(0, idx) : rest;
          var rq = idx >= 0 ? rest.slice(idx + 1) : '';
          if(!rp.startsWith('/')) rp = '/' + rp;
          return '/api/noc/equipment-proxy?ip=' + encodeURIComponent(IP) + '&path=' + encodeURIComponent(rp || '/') + (rq ? '&q=' + encodeURIComponent(rq) : '');
        }
        return u;
      }
      var parts = String(u).split('?');
      var p = parts[0] || '/';
      var q = parts.length > 1 ? parts.slice(1).join('?') : '';
      if(!p.startsWith('/')) {
        // keep browser resolution for relative paths and let <base> do the work
        return u;
      }
      return '/api/noc/equipment-proxy?ip=' + encodeURIComponent(IP) + '&path=' + encodeURIComponent(p) + (q ? '&q=' + encodeURIComponent(q) : '');
    } catch(_e) {
      return u;
    }
  }

  // Intercept runtime navigations/APIs that often cause 404 after login.
  try {
    var _fetch = window.fetch;
    window.fetch = function(input, init){
      try {
        if(typeof input === 'string' || input instanceof URL) {
          input = toProxy(input);
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
          var mapped = toProxy(input.url);
          if(typeof mapped === 'string' && mapped !== input.url) {
            input = new Request(mapped, input);
          }
        }
      } catch(_e) {}
      return _fetch.call(this, input, init);
    };
  } catch(_e) {}

  try {
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url){
      if(typeof url === 'string' || (typeof URL !== 'undefined' && url instanceof URL)) {
        arguments[1] = toProxy(url);
      }
      return _open.apply(this, arguments);
    };
  } catch(_e) {}

  try {
    var _windowOpen = window.open;
    window.open = function(url, target, features){
      if(typeof url === 'string' || (typeof URL !== 'undefined' && url instanceof URL)) {
        url = toProxy(url);
      }
      return _windowOpen.call(window, url, target, features);
    };
  } catch(_e) {}

  try {
    var _pushState = history.pushState.bind(history);
    history.pushState = function(state, title, url){
      if(typeof url === 'string' || (typeof URL !== 'undefined' && url instanceof URL)) {
        url = toProxy(url);
      }
      return _pushState(state, title, url);
    };
    var _replaceState = history.replaceState.bind(history);
    history.replaceState = function(state, title, url){
      if(typeof url === 'string' || (typeof URL !== 'undefined' && url instanceof URL)) {
        url = toProxy(url);
      }
      return _replaceState(state, title, url);
    };
  } catch(_e) {}

  try {
    var _assign = window.location.assign.bind(window.location);
    window.location.assign = function(url){ _assign(toProxy(url)); };
    var _replace = window.location.replace.bind(window.location);
    window.location.replace = function(url){ _replace(toProxy(url)); };
  } catch(_e) {}

  try {
    document.addEventListener('submit', function(ev){
      var form = ev.target;
      if(!form || !form.getAttribute) return;
      var formId = String(form.id || '').toLowerCase();
      // RouterOS login page redirects to /webfig using location.replace(),
      // which can escape proxying in some browsers. Force proxied redirect here.
      if(formId === 'login'){
        try {
          var userEl = document.getElementById('name');
          var passEl = document.getElementById('password');
          if(userEl && 'value' in userEl) sessionStorage.setItem('name', String(userEl.value || ''));
          if(passEl && 'value' in passEl) sessionStorage.setItem('password', String(passEl.value || ''));
          ev.preventDefault();
          ev.stopImmediatePropagation();
          var hash = String(window.location.hash || '');
          var webfigTarget = '/webfig/' + hash;
          window.location.href = toProxy(webfigTarget);
          return;
        } catch(_e) {}
      }
      var action = form.getAttribute('action');
      if(action) form.setAttribute('action', toProxy(action));
    }, true);
  } catch(_e) {}

  try {
    document.addEventListener('click', function(ev){
      var el = ev.target;
      while(el && el.tagName !== 'A') el = el.parentElement;
      if(!el) return;
      var href = el.getAttribute && el.getAttribute('href');
      if(!href) return;
      if(href.startsWith('/')) {
        ev.preventDefault();
        window.location.href = toProxy(href);
      }
    }, true);
  } catch(_e) {}

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fillAndMaybeSubmit, {once:true});
  } else {
    fillAndMaybeSubmit();
  }
})();
</script>`;

  let rewritten = html
    .replace(ATTR_RE, (_m, prefix, rawUrl, suffix) => {
      const url = String(rawUrl || '');
      if (!url) return `${prefix}${url}${suffix}`;
      const [pathPart, queryPart = ''] = url.split('?');
      const absolutePath = toAbsolutePath(basePath, pathPart);
      return `${prefix}${buildProxyUrl(ip, absolutePath, queryPart)}${suffix}`;
    })
    .replace(FETCH_RE, (_m, prefix, rawUrl, suffix) => `${prefix}${toProxyLiteral(rawUrl)}${suffix}`)
    .replace(JQ_RE, (_m, prefix, rawUrl, suffix) => `${prefix}${toProxyLiteral(rawUrl)}${suffix}`)
    .replace(LOCATION_RE, (_m, prefix, rawUrl, suffix) => `${prefix}${toProxyLiteral(rawUrl)}${suffix}`)
    .replace(LOCATION_ASSIGN_RE, (_m, prefix, rawUrl, suffix) => `${prefix}${toProxyLiteral(rawUrl)}${suffix}`)
    .replace(FORM_ACTION_RE, (_m, prefix, rawUrl, suffix) => `${prefix}${toProxyLiteral(rawUrl)}${suffix}`);

  if (/<head[^>]*>/i.test(rewritten)) {
    rewritten = rewritten.replace(/<head([^>]*)>/i, `<head$1><base href="${baseProxy}">${autoLoginScript}`);
  } else if (/<html[^>]*>/i.test(rewritten)) {
    rewritten = rewritten.replace(/<html([^>]*)>/i, `<html$1><head><base href="${baseProxy}">${autoLoginScript}</head>`);
  } else {
    // Fallback for malformed HTML fragments.
    rewritten = `<head><base href="${baseProxy}">${autoLoginScript}</head>${rewritten}`;
  }

  return rewritten;
}

function rewriteCss(css: string, ip: string, basePath: string): string {
  return css.replace(CSS_URL_RE, (match, rawUrl: string) => {
    const url = String(rawUrl || '');
    if (!url) return match;
    const [pathPart, queryPart = ''] = url.split('?');
    const absolutePath = toAbsolutePath(basePath, pathPart);
    return `url('${buildProxyUrl(ip, absolutePath, queryPart)}')`;
  });
}

function parseTarget(request: NextRequest): { ip: string; resourcePath: string; passthroughQuery: string } | null {
  const ip = (request.nextUrl.searchParams.get('ip') ?? '').trim();
  if (!IP_RE.test(ip)) return null;

  const resourcePathRaw = (request.nextUrl.searchParams.get('path') ?? '/').trim();
  const resourcePath = resourcePathRaw.startsWith('/') ? resourcePathRaw : `/${resourcePathRaw}`;
  const passthroughQuery = request.nextUrl.searchParams.get('q') ?? '';

  return { ip, resourcePath, passthroughQuery };
}

function copySetCookieHeaders(from: Response, to: Headers) {
  const anyHeaders = from.headers as unknown as { getSetCookie?: () => string[] };
  const multi = anyHeaders.getSetCookie?.() ?? [];
  if (multi.length > 0) {
    for (const cookie of multi) {
      to.append('Set-Cookie', cookie);
    }
    return;
  }

  const single = from.headers.get('set-cookie');
  if (single) {
    to.append('Set-Cookie', single);
  }
}

export async function GET(request: NextRequest) {
  const target = parseTarget(request);
  if (!target) {
    return NextResponse.json({ error: 'Paramètre ip invalide.' }, { status: 400 });
  }

  const targetUrl = `http://${target.ip}:${PORT}${target.resourcePath}${target.passthroughQuery ? `?${target.passthroughQuery}` : ''}`;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NOC-EquipmentProxy/1.0',
        Accept: request.headers.get('accept') ?? '*/*',
        Cookie: request.headers.get('cookie') ?? '',
      },
      redirect: 'follow',
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Équipement injoignable',
        target: `${target.ip}:${PORT}`,
        details: err instanceof Error ? err.message : 'Erreur réseau',
      },
      { status: 502 }
    );
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-cache, no-store');
  copySetCookieHeaders(response, headers);

  if (contentType.includes('text/html')) {
    const html = await response.text();
    return new NextResponse(rewriteHtml(html, target.ip, target.resourcePath), {
      status: response.status,
      headers,
    });
  }

  if (contentType.includes('text/css')) {
    const css = await response.text();
    return new NextResponse(rewriteCss(css, target.ip, target.resourcePath), {
      status: response.status,
      headers,
    });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, { status: response.status, headers });
}

export async function POST(request: NextRequest) {
  const target = parseTarget(request);
  if (!target) {
    return NextResponse.json({ error: 'Paramètre ip invalide.' }, { status: 400 });
  }

  const targetUrl = `http://${target.ip}:${PORT}${target.resourcePath}${target.passthroughQuery ? `?${target.passthroughQuery}` : ''}`;
  const body = await request.arrayBuffer();

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'NOC-EquipmentProxy/1.0',
        'Content-Type': request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
        Cookie: request.headers.get('cookie') ?? '',
      },
      body,
      redirect: 'follow',
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Équipement injoignable', details: err instanceof Error ? err.message : 'Erreur réseau' },
      { status: 502 }
    );
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-cache, no-store');
  copySetCookieHeaders(response, headers);

  if (contentType.includes('text/html')) {
    const html = await response.text();
    return new NextResponse(rewriteHtml(html, target.ip, target.resourcePath), {
      status: response.status,
      headers,
    });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, { status: response.status, headers });
}
