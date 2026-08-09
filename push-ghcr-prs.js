#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/home/user/Projects/MuxCore';
process.chdir(ROOT);

const mvp = new Set(`
core api-rest auth-local admin-ui database-sqlite secrets-file secrets-vault
encryption-aesgcm call-policy-default publish-policy-default metadata-tmdb
media-movies media-tvshows media-automation media-scanner media-root-folders
downloader-native-torrent indexer-piratebay jellyfin request-media health-monitor
`.trim().split(/\s+/));

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
}

function patchCi(s) {
  let out = s;
  out = out.replace(/\n  IMAGE_NAME: \$\{\{\s*github\.repository\s*\}\}\s*/g, '\n');
  out = out.replace(
    /\$\{\{\s*env\.REGISTRY\s*\}\}\/\$\{\{\s*github\.repository\s*\}\}/g,
    '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}'
  );
  if (/build-push-action/.test(out) && !/GITHUB_REPOSITORY,,/.test(out)) {
    const step =
      '      - name: Lowercase image name\n' +
      '        run: echo "IMAGE_NAME=${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"\n';
    if (/uses:\s*docker\/login-action/.test(out)) {
      out = out.replace(/(\n\s+- uses:\s*docker\/login-action[^\n]*\n)/, '\n' + step + '$1');
    } else if (/uses:\s*docker\/build-push-action/.test(out)) {
      out = out.replace(/(\n\s+- uses:\s*docker\/build-push-action[^\n]*\n)/, '\n' + step + '$1');
    }
  }
  return out;
}

function patchRelease(s) {
  let out = s;
  if (!/repository_owner|IMAGE_OWNER/.test(out)) return out;
  out = out.replace(
    /ghcr\.io\/\$\{\{\s*github\.repository_owner\s*\}\}\//g,
    'ghcr.io/${{ env.IMAGE_OWNER }}/'
  );
  if (!/GITHUB_REPOSITORY_OWNER,,/.test(out)) {
    const step =
      '      - name: Lowercase image name\n' +
      '        run: |\n' +
      '          echo "IMAGE_OWNER=${GITHUB_REPOSITORY_OWNER,,}" >> "$GITHUB_ENV"\n' +
      '          echo "IMAGE_NAME=${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"\n';
    if (/name: Build and push Docker image/.test(out)) {
      out = out.replace(/(\n\s+- name: Build and push Docker image\n)/, '\n' + step + '$1');
    } else if (/uses:\s*docker\/build-push-action/.test(out)) {
      out = out.replace(/(\n\s+- uses:\s*docker\/build-push-action[^\n]*\n)/, '\n' + step + '$1');
    } else if (/uses:\s*docker\/login-action/.test(out)) {
      out = out.replace(/(\n\s+- uses:\s*docker\/login-action[^\n]*\n)/, '\n' + step + '$1');
    }
  }
  return out;
}

const roots = fs
  .readdirSync('.')
  .filter((d) => fs.existsSync(path.join(d, '.github/workflows')))
  .sort((a, b) => {
    const am = mvp.has(a) ? 0 : 1;
    const bm = mvp.has(b) ? 0 : 1;
    return am - bm || a.localeCompare(b);
  });

const results = [];

for (const repo of roots) {
  const wd = path.join(repo, '.github/workflows');
  const files = fs.readdirSync(wd).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  let def;
  try {
    def = sh(
      `gh repo view Muxcore-Media/${repo} --json defaultBranchRef -q .defaultBranchRef.name`
    ).trim();
    sh(`git -C ${repo} fetch origin`);
    sh(`git -C ${repo} checkout -B fix/ghcr-lowercase-image origin/${def}`);
  } catch (e) {
    results.push({ repo, ok: false, stage: 'branch', err: String(e.message).slice(0, 160) });
    continue;
  }

  let any = false;
  for (const f of files) {
    const p = path.join(wd, f);
    const before = fs.readFileSync(p, 'utf8');
    if (!/ghcr\.io|IMAGE_NAME|build-push-action|repository_owner/.test(before)) continue;
    let after = f.includes('release') ? patchRelease(before) : patchCi(before);
    if (after !== before) {
      fs.writeFileSync(p, after);
      any = true;
    }
  }
  if (!any) {
    results.push({ repo, ok: true, skipped: true });
    continue;
  }

  try {
    sh(`git -C ${repo} add .github/workflows`);
    try {
      sh(`git -C ${repo} commit -m "fix(ci): lowercase GHCR image tags for org name"`);
    } catch (e) {
      if (!/nothing to commit/.test(String(e.stderr || e.message))) throw e;
    }
    sh(`git -C ${repo} push -u origin HEAD --force-with-lease`);

    let url = '';
    try {
      url = sh(
        `gh pr view --repo Muxcore-Media/${repo} --json number,url,headRefName -q 'select(.headRefName=="fix/ghcr-lowercase-image") | .url'`
      ).trim();
    } catch {
      /* create */
    }
    if (!url) {
      const list = sh(
        `gh pr list --repo Muxcore-Media/${repo} --head fix/ghcr-lowercase-image --json url -q '.[0].url'`
      ).trim();
      url = list;
    }
    if (!url) {
      const body = [
        '## Summary',
        '- GHCR rejects mixed-case image names (`Muxcore-Media` must be `muxcore-media`).',
        '- Set `IMAGE_NAME` / `IMAGE_OWNER` via `${GITHUB_REPOSITORY,,}` before docker push.',
        '',
      ].join('\n');
      const bodyFile = path.join('_wave1', `ghcr-pr-body-${repo}.md`);
      fs.writeFileSync(bodyFile, body);
      url = sh(
        `gh pr create --repo Muxcore-Media/${repo} --title "fix(ci): lowercase GHCR image tags" --body-file ${bodyFile}`
      ).trim();
    }
    results.push({ repo, ok: true, url, mvp: mvp.has(repo) });
    console.log('OK', repo, url);
  } catch (e) {
    results.push({
      repo,
      ok: false,
      stage: 'push',
      err: String(e.stderr || e.message).slice(0, 250),
    });
    console.log('FAIL', repo, String(e.stderr || e.message).slice(0, 200));
  }
}

fs.writeFileSync('_wave1/ghcr-pr-results.json', JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    {
      total: results.length,
      pushed: results.filter((r) => r.ok && r.url).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.ok),
    },
    null,
    2
  )
);
