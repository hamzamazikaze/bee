# Khotwa — production image.
#
# Three stages so the thing that ships carries neither the toolchain nor the sources: the
# runtime layer is Next's standalone bundle plus static assets, and nothing else. It lands
# around 200 MB against roughly a gigabyte for a naive copy of the tree.
#
# Build this OFF the server. The box runs eight containers on one vCPU and 3.8 GB of RAM,
# and `next build` would compete with production for both. Build locally or in CI, push to
# ghcr.io/visionxartorg, and let the server only ever pull.

# ---------- deps: resolved once, cached until the lockfile moves ----------
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --frozen-lockfile: a container that quietly resolves a different tree than the one that
# was tested is not the build you verified.
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prebuild` copies MapLibre's worker into public/. It is gitignored, so without this the
# map renders blank with no markers and no error worth reading.
RUN pnpm build

# ---------- runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next binds to localhost by default, which inside a container means nothing can reach it.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Not root. The app writes nothing, so it does not need to be able to.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build /app/public ./public
# The standalone bundle carries its own minimal node_modules and server.js.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# No health check here: nginx sits in front and the compose file owns that policy.
CMD ["node", "server.js"]
