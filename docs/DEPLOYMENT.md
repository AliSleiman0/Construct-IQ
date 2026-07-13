# Deployment — Docker on a DigitalOcean droplet

Stands the full ConstructIQ stack (nginx · Next.js · NestJS · MongoDB · Redis ·
MinIO) up on a **single droplet** via `docker-compose.prod.yml`, served over
**HTTPS at https://constructiq.site** (Let's Encrypt).

```
Browser ──HTTPS:443──> nginx ──/api/v1/──> backend:4000 (NestJS)
                            ├──/──────────> frontend:3000 (Next.js)
                            └──/storage/──> minio:9000 (uploaded files)
backend ──> mongo:27017 (rs0) · redis:6379 · minio:9000
```

Only nginx (ports 80/443) is exposed to the host; everything else is internal
to the `constructiq` Docker network.

## 0. CI/CD (how deploys happen now)

Deploys are automated via GitHub Actions (`.github/workflows/`):

- **`ci.yml`** — every PR: backend eslint + `nest build` + jest; frontend
  `next lint` + `tsc --noEmit` + vitest + `next build`.
- **`deploy.yml`** — every push/merge to `main` (or manually via *Run
  workflow*): re-runs CI, builds the `backend`, `frontend`, and `backend-seed`
  images, pushes them to GHCR (`ghcr.io/ayman-sbeity/construct-iq/*`, tagged
  `sha-<shortsha>` + `latest`), then SSHes into the droplet, copies
  `docker-compose.prod.yml` + the nginx conf to `/opt/constructiq/`, pulls the
  new images, `up -d`, and health-checks `https://constructiq.site/api/v1/health`.

The droplet **never builds images** (it's a small box) — it only pulls.
Registry auth on the droplet uses the run's ephemeral `GITHUB_TOKEN`; no PAT is
stored on the server.

Required repo secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a
dedicated CI keypair — public half in the droplet's `authorized_keys`).

**Rollback** (sha tags are immutable):
```bash
cd /opt/constructiq
IMAGE_TAG=sha-<previous> docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d
```

The sections below document the underlying setup — needed once per server, and
as the manual fallback path.

---

## 1. Provision the droplet

- Create an Ubuntu 22.04+ droplet (2 vCPU / 4 GB RAM is a sane minimum — Mongo +
  Next build want headroom).
- Add an SSH key, then SSH in as a sudo user.
- Install Docker Engine + the compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER && newgrp docker
  docker compose version   # verify the plugin is present
  ```
- Open the firewall to SSH + HTTP:
  ```bash
  sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw enable
  ```

## 2. Get the code + configure secrets

```bash
git clone <repo-url> constructiq && cd constructiq
cp deploy/.env.prod.example deploy/.env.prod
```

Edit `deploy/.env.prod`:
- Generate the two JWT secrets: `openssl rand -hex 32` (once each).
- Set `REDIS_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `SUPER_ADMIN_*` to strong values.
- Replace `<DROPLET_IP>` in `FRONTEND_URL` and `S3_PUBLIC_URL` with the droplet's public IPv4.
- Set a **rotated** `OPENAI_API_KEY` (the backend crash-loops without a valid key).
- Leave `COOKIE_SECURE=false` (we're on HTTP) and the internal hostnames as-is.

> `deploy/.env.prod` is gitignored — never commit it.

## 3. Build + start

```bash
COMPOSE="docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod"

$COMPOSE up -d --build          # build images, start mongo/redis/minio/backend/frontend/nginx
$COMPOSE --profile init up minio-init   # create the bucket + anonymous download policy
$COMPOSE --profile seed run --rm backend-seed   # FIRST BOOT ONLY: seed super admin + roles + demo data
```

The seed step is one-off — skip it on subsequent deploys.

## 4. Verify

```bash
curl -i http://localhost/api/v1/health      # → 200 {"status":"ok","mongo":"up",...}
$COMPOSE ps                                  # all services Up / healthy
```

Then open `http://<DROPLET_IP>` in a browser and log in with the seeded
`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`. A successful login + a protected
page loading confirms cookies and the API proxy. Upload an avatar/document and
confirm it renders (served via `/storage/...`).

## 5. Operate

```bash
$COMPOSE logs -f backend        # tail a service
$COMPOSE logs -f nginx
$COMPOSE ps                     # status
$COMPOSE restart backend        # restart one service
```

**Redeploy after a code change:** merge to `main` — `deploy.yml` does the rest
(see §0). Manual fallback on the droplet:
```bash
git pull
$COMPOSE up -d --build          # rebuilds changed images, recreates containers
```
Volumes (`mongo_data`, `redis_data`, `minio_data`) persist across redeploys.

**Backups (do this — single-node Mongo has no HA):**
```bash
$COMPOSE exec mongo mongodump --archive=/data/db/backup-$(date +%F).gz --gzip
# copy the archive off the droplet (scp / DO Spaces) on a schedule
```

---

## 6. HTTPS (implemented for constructiq.site)

TLS is live: `deploy/nginx/constructiq.conf` serves
`constructiq.site` + `www.constructiq.site` on :443 (www → apex redirect,
HTTP → HTTPS redirect), and `docker-compose.prod.yml` mounts `/etc/letsencrypt`
(read-only) plus the ACME webroot into nginx.

One-time setup on a fresh server (certs must exist **before** nginx first starts,
or nginx exits on the missing cert files):

```bash
# DNS A records for @ and www must already point at the droplet
apt install -y certbot
certbot certonly --standalone -d constructiq.site -d www.constructiq.site   # port 80 must be free
```

Renewals run via certbot's systemd timer in **webroot** mode (no downtime) —
`/opt/constructiq/certbot-www` is served by nginx at `/.well-known/acme-challenge/`,
and a deploy hook reloads nginx. Verify with `certbot renew --dry-run`.

`deploy/.env.prod` on the server uses the HTTPS origin:
- `COOKIE_SECURE=true`
- `FRONTEND_URL=https://constructiq.site`
- `S3_PUBLIC_URL=https://constructiq.site/storage/constructiq`

---

## Notes / known constraints

- **OpenAI key is required at boot** (the AI module initialises its client
  eagerly). Provide a rotated key, or address the lazy-init follow-up first.
- **Single-node Mongo** — fine for a pilot; no automatic failover. Take backups.
- **Secrets** live in `deploy/.env.prod` on the droplet. For anything beyond a
  pilot, move them into a managed secret store.
- The separate **leaked-key cleanup** (rotate + purge `backend/env` from git
  history) is tracked in `docs/PRODUCTION-READINESS-ASSESSMENT.md` (P0) and is
  not part of this deploy setup.
