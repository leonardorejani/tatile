#!/usr/bin/env bash
# Gera os ícones do PWA a partir de um PNG quadrado de 1024 px, só com o sips do macOS.
# Maskable: o símbolo ocupa 80% (zona segura) sobre o fundo, senão o Android corta.
# Uso: gerar-icones.sh <icone-1024.png> <pasta-de-saida> [cor-de-fundo-hex]
set -euo pipefail
[ $# -ge 2 ] || { echo "error: uso: gerar-icones.sh <icone-1024.png> <pasta> [FAFAFA]"; exit 2; }
ORIGEM="$1"; SAIDA="$2"; FUNDO="${3:-FAFAFA}"
command -v sips >/dev/null || { echo "error: sips não existe (só macOS); use ImageMagick: magick in.png -resize 192x192 out.png"; exit 1; }
mkdir -p "$SAIDA"
tamanho() { sips -s format png -z "$2" "$2" "$ORIGEM" --out "$SAIDA/$1.png" >/dev/null 2>&1; }
tamanho icon-192 192
tamanho icon-512 512
tamanho apple-touch-icon-180 180
tamanho favicon-32 32
for t in 192 512; do
  interno=$((t * 80 / 100))
  sips -s format png -z "$interno" "$interno" "$ORIGEM" --out "$SAIDA/.tmp.png" >/dev/null 2>&1
  sips --padToHeightWidth "$t" "$t" --padColor "$FUNDO" "$SAIDA/.tmp.png" --out "$SAIDA/icon-maskable-$t.png" >/dev/null 2>&1
done
rm -f "$SAIDA/.tmp.png"
ls -1 "$SAIDA" | sed 's/^/gerado: /'
