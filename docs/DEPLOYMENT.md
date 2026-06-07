# Deployment — Docker on a DigitalOcean droplet

Stands the full ConstructIQ stack (nginx · Next.js · NestJS · MongoDB · Redis ·
MinIO) up on a **single droplet** via `docker-compose.prod.yml`, served over
**plain HTTP on the droplet IP**. TLS is a documented follow-up at the end.

```
Browser ──HTTP:80──> nginx ──/api/v1/──> backend:4000 (NestJS)
                          ├──/──────────> frontend:3000 (Next.js)
                          └──/storage/──> minio:9000 (uploaded files)
backend ──> mongo:27017 (rs0) · redis:6379 · minio:9000
```

Only nginx (port 80) is exposed to the host; everything else is internal to the
`constructiq` Docker network.

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

**Redeploy after a code change:**
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

## 6. Add HTTPS (when a domain is ready)

1. Point a DNS **A record** at the droplet IP.
2. Obtain a Let's Encrypt cert for the domain (host `certbot`, or a certbot
   container) and make `/etc/letsencrypt` available to the nginx container
   (add a volume mount in `docker-compose.prod.yml`).
3. In `deploy/nginx/constructiq.conf`, set `server_name` and uncomment the
   `listen 443 ssl` block at the bottom.
4. In `deploy/.env.prod` set:
   - `COOKIE_SECURE=true`
   - `FRONTEND_URL=https://app.example.com`
   - `S3_PUBLIC_URL=https://app.example.com/storage/constructiq`
5. `$COMPOSE up -d --build` to apply.

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
