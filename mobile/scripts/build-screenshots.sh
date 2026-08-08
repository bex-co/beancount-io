#!/bin/zsh
#
# Build App Store screenshots for APP_IPHONE_65 (1284x2778) from the marketing showcase captures.
#
#   ./scripts/build-screenshots.sh
#
# Source captures are 1206x2622 (iPhone 16 Pro). No current simulator renders 1284x2778
# natively — that is an iPhone 12/13 Pro Max resolution — so a resize is unavoidable no
# matter which device captures. Scale-to-fill then centre-crop: the aspect delta is
# 0.4600 -> 0.4622, i.e. ~13px of 2791 cropped (0.5%), which is imperceptible.
#
# Alpha is stripped because App Store Connect rejects screenshots with a transparency
# channel. Output filenames are the display order Apple shows; the first three appear in
# search results, so the ordering below is deliberate, not alphabetical convenience.
#
# Requires ImageMagick (`brew install imagemagick`).
set -eu
setopt NULL_GLOB

HERE=${0:A:h}
SRC=$HERE/../docs/marketing-showcase/webp
OUT=$HERE/../metadata/screenshots/en-US/APP_IPHONE_65

command -v magick >/dev/null || { echo "magick not found; brew install imagemagick" >&2; exit 1 }

mkdir -p "$OUT"
rm -f "$OUT"/*.png

# 1: legible value up front. 2: the differentiator (plain text ledger).
# 3: proof it is a real finance app, not just an editor. Then depth.
ORDER=(
  01-home
  21-file-editor
  04-reports
  22-commit-detail
  03-transactions
  02-accounts
  18-account-detail
  09-add-transaction
  05-files
  19-transaction-detail
)

i=1
for name in $ORDER; do
  magick "$SRC/$name.webp" \
    -resize 1284x2778^ \
    -gravity center -extent 1284x2778 \
    -background black -alpha remove -alpha off \
    -strip \
    "PNG24:$OUT/$(printf "%02d" $i)-$name.png"
  i=$((i + 1))
done

echo "built $((i - 1)) screenshots in $OUT"
for f in "$OUT"/*.png; do
  printf "  %-32s %s\n" "$(basename $f)" "$(magick identify -format '%wx%h' "$f")"
done
