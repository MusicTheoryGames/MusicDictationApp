// Rebuild the vendored, self-contained browser bundle of @supabase/supabase-js.
// Run:  npm run vendor:supabase   (after `npm install`).
// The bundle (vendor/supabase.js) is committed; node_modules is not — this script
// is how the committed artifact is reproduced from the devDependencies.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(readFileSync(root + 'node_modules/@supabase/supabase-js/package.json', 'utf8'));

await build({
  stdin: { contents: "export * from '@supabase/supabase-js';", resolveDir: root, loader: 'js' },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, legalComments: 'none',
  banner: { js: `/*! Vendored @supabase/supabase-js v${version} — self-contained browser ESM bundle, built by scripts/vendor-supabase.mjs (esbuild). Do not hand-edit; run \`npm run vendor:supabase\`. */` },
  outfile: root + 'vendor/supabase.js',
});
console.log(`vendored @supabase/supabase-js v${version} -> vendor/supabase.js`);
