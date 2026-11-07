const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter((name) => name.endsWith('.html'));

function resolveLocal(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return path.join(root, 'index.html');
  const file = path.join(root, clean);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  return path.join(root, `${clean}.html`);
}

test('site has the expected pages', () => {
  for (const name of ['index', 'services', 'work', 'about', 'contact', 'privacy', '404']) {
    assert.ok(pages.includes(`${name}.html`), `${name}.html is missing`);
  }
});

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');

  test(`${page}: has language, title, description and one h1`, () => {
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1);
  });

  test(`${page}: internal links and assets exist`, () => {
    const targets = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const target of targets) {
      assert.ok(fs.existsSync(resolveLocal(target)), `${page} links to missing ${target}`);
    }
  });
}

test('contact page keeps the form field names the API expects', () => {
  const html = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
  for (const field of ['name', 'email', 'company', 'companySize', 'budget', 'timeline', 'message', 'website', 'consent']) {
    assert.match(html, new RegExp(`name="${field}"`), `form field ${field} is missing`);
  }
});

test('form dropdown options match the API validation', () => {
  const { OPTIONS } = require('../lib/validate');
  const html = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
  for (const [field, values] of Object.entries(OPTIONS)) {
    const select = html.match(new RegExp(`<select id="${field}"[\\s\\S]*?</select>`))[0];
    const options = [...select.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
    assert.deepStrictEqual(options, values, `${field} options differ from validate.js`);
  }
});
