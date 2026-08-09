#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = '/home/user/Projects/MuxCore';
const map = JSON.parse(fs.readFileSync(path.join(root,'_wave1/ci-siblings.json'),'utf8'));
const moduleName = process.argv[2];
if (!moduleName) { console.error('usage: gen-ci.js <module>'); process.exit(1); }
const info = map[moduleName] || { siblings: [] };

const sibs = [...new Set(info.siblings.filter(s => s && s !== moduleName))];
// core first
sibs.sort((a,b) => (a === 'core' ? -1 : b === 'core' ? 1 : a.localeCompare(b)));

function checkouts() {
  const lines = [];
  for (const s of sibs) {
    lines.push(`      - uses: actions/checkout@v7
        with:
          path: ${s}
          repository: Muxcore-Media/${s}
          token: \${{ secrets.MUXCORE_CI_TOKEN }}`);
  }
  lines.push(`      - uses: actions/checkout@v7
        with:
          path: ${moduleName}`);
  return lines.join('\n');
}

const hasDocker = fs.existsSync(path.join(root, moduleName, 'Dockerfile'));
const hasCmdModule = fs.existsSync(path.join(root, moduleName, 'cmd/module'));
const buildCmd = hasCmdModule
  ? 'go build -o /dev/null ./cmd/module'
  : 'go build -o /dev/null ./...';

const co = checkouts();
const lintStep = sibs.length
  ? `      - working-directory: ./${moduleName}
        run: go vet ./...`
  : `      - run: go vet ./...`;

// For modules without siblings, simpler single-checkout CI
let yml;
if (sibs.length === 0) {
  yml = `name: CI
on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-go@v6
        with:
          go-version: "1.26"
          cache: true
${lintStep}

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-go@v6
        with:
          go-version: "1.26"
          cache: true
      - run: go test -race -count=1 -timeout 10m ./...

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-go@v6
        with:
          go-version: "1.26"
          cache: true
      - run: ${buildCmd}
      - run: go vet ./...
`;
} else {
  yml = `name: CI
on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
${co}
      - uses: actions/setup-go@v6
        with:
          go-version: "1.26"
          cache: true
${lintStep}

  test:
    runs-on: ubuntu-latest
    steps:
${co}
      - uses: actions/setup-go@v6
        with:
          go-version: "1.26"
          cache: true
      - working-directory: ./${moduleName}
        run: go test -race -count=1 -timeout 10m ./...

  build:
    runs-on: ubuntu-latest
    steps:
${co}
      - uses: actions/setup-go@v6
        with:
          go-version: "1.26"
          cache: true
      - working-directory: ./${moduleName}
        run: |
          ${buildCmd}
          go vet ./...
`;
  if (hasDocker) {
    yml += `
  docker:
    if: (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main')
    runs-on: ubuntu-latest
    needs: [lint, test, build]
    steps:
${co}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v4
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v7
        with:
          context: .
          file: ./${moduleName}/Dockerfile
          push: true
          tags: \${{ env.REGISTRY }}/\${{ github.repository }}:\${{ github.sha }}
`;
  }
}

const out = path.join(root, moduleName, '.github/workflows/ci.yml');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, yml.endsWith('\n') ? yml : yml + '\n');
console.log('wrote', out, 'siblings=', sibs.join(',') || '(none)');
