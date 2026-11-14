# ============================================================
# Jeu Instant Gagnant — image de production (zéro dépendance)
# ============================================================
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=8000 \
    DATA_DIR=/app/data

WORKDIR /app

# Copie du projet (voir .dockerignore)
COPY . .

# Répertoire des données (monter un volume persistant sur /app/data)
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/healthz >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
