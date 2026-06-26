FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# -------------------------------------------------------
# Runner — next.config.ts active output:standalone sur Linux
# Le build produit .next/standalone/server.js + node_modules
# traces (pas besoin de reinstaller tous les paquets)
# -------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Création d'un utilisateur non-root dédié (uid/gid 1001)
# Docker initialise les volumes vides depuis le contenu de l'image (permissions incluses)
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

# Serveur standalone + node_modules traces par Next.js
COPY --from=builder /app/.next/standalone ./
# Fichiers statiques (CSS/JS public) a cote du standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Repertoires de donnees (volumes Docker les ecrasent au runtime)
COPY --from=builder /app/data ./data
COPY --from=builder /app/upload ./upload

# Schema Prisma + CLI pour prisma migrate deploy au demarrage
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Transfert de propriété — les volumes Docker vides héritent ces permissions au premier montage
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# && garantit que le serveur ne demarre pas si les migrations echouent
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node server.js"]
