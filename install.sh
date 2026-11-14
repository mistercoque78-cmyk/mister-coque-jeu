#!/usr/bin/env bash
# ============================================================
# Jeu Instant Gagnant - installation automatique (Ubuntu / Debian)
# ------------------------------------------------------------
# A lancer SUR le serveur, en root :
#   Option 1 - le code est deja sur la machine :
#       cd mister-coque-jeu && sudo bash install.sh
#   Option 2 - clonage automatique depuis GitHub :
#       sudo REPO_URL=https://github.com/VOUS/mister-coque-jeu.git bash install.sh
# ------------------------------------------------------------
# Variables optionnelles :
#   REPO_URL       depot a cloner (sinon, utilise le dossier courant)
#   APP_DIR        dossier d'installation (defaut /opt/mister-coque-jeu)
#   PORT           port HTTP (defaut 8000)
#   ADMIN_PASSWORD si vide -> genere aleatoirement
#   ADMIN_SECRET   si vide -> genere aleatoirement
# ============================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "[!] Ce script doit etre lance en root. Relance avec : sudo bash install.sh"
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/mister-coque-jeu}"
PORT="${PORT:-8000}"
SERVICE="mistercoque"
SRC_DIR="$(pwd)"

echo "=== [1/6] Paquets systeme + Node.js 20 ==="
apt-get update -y
apt-get install -y curl git ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node $(node -v)"

echo "=== [2/6] Recuperation du code ==="
if [ -n "${REPO_URL:-}" ]; then
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
elif [ -f "$SRC_DIR/server.js" ]; then
  if [ "$(readlink -f "$SRC_DIR")" != "$(readlink -f "$APP_DIR")" ]; then
    echo "Copie de $SRC_DIR vers $APP_DIR"
    mkdir -p "$APP_DIR"
    cp -r "$SRC_DIR/." "$APP_DIR/"
  fi
  cd "$APP_DIR"
else
  echo "[ERREUR] Aucun code trouve."
  echo "   Lance ce script depuis le dossier du projet, ou definis REPO_URL."
  exit 1
fi

echo "=== [3/6] Secrets admin ==="
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  ADMIN_PASSWORD="$(node -e "const c=require('crypto'); console.log(c.randomBytes(12).toString('base64url'))")"
fi
if [ -z "${ADMIN_SECRET:-}" ]; then
  ADMIN_SECRET="$(node -e "const c=require('crypto'); console.log(c.randomBytes(32).toString('hex'))")"
fi
mkdir -p "$APP_DIR/data"

cat > /etc/mistercoque.env <<EOF
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_SECRET=${ADMIN_SECRET}
EOF
chmod 600 /etc/mistercoque.env

echo "=== [4/6] Service systemd ==="
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Jeu Instant Gagnant Mister Coque
After=network.target

[Service]
WorkingDirectory=${APP_DIR}
EnvironmentFile=/etc/mistercoque.env
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=DATA_DIR=${APP_DIR}/data
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${SERVICE}"

echo "=== [5/6] Verification ==="
sleep 2
if curl -fsS "http://localhost:${PORT}/healthz" >/dev/null; then
  echo "[OK] Le jeu repond correctement (healthz OK)."
else
  echo "[!] Pas encore de reponse. Diagnostic :"
  systemctl status "${SERVICE}" --no-pager || true
fi

echo ""
echo "=== [6/6] Recapitulatif ==="
IP="$(curl -fsS -4 https://ifconfig.me 2>/dev/null || echo 'IP_DE_LA_VM')"
echo "Jeu    : http://${IP}:${PORT}/"
echo "Admin  : http://${IP}:${PORT}/admin.html"
echo "MDP    : ${ADMIN_PASSWORD}"
echo "Secret : ${ADMIN_SECRET}"
echo ""
echo "[!] Note ces identifiants. Ils sont aussi stockes dans /etc/mistercoque.env"
echo "    (accessible uniquement en root)."
