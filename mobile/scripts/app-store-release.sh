#!/bin/zsh
# Review-gated App Store metadata and screenshot orchestration.
set -eu
set -o pipefail

APP_ID=1527950512
ASC_BIN=${ASC_BIN:-asc}
HERE=${0:A:h}
cd "$HERE/.."

ACTION=${1:-}
VERSION=${2:-}
CONFIRMED_VERSION=${3:-}

if [[ -z "$ACTION" || -z "$VERSION" ]]; then
  echo "usage: $0 <create|plan|approve|apply-metadata|plan-screenshots|apply-screenshots|verify> <version> [confirmed-version]" >&2
  exit 2
fi

REVIEW_ROOT=".asc/releases/$VERSION"
METADATA_REVIEW="$REVIEW_ROOT/metadata"
SCREENSHOT_REVIEW="$REVIEW_ROOT/screenshots"

version_state() {
  "$ASC_BIN" versions list --app "$APP_ID" --platform IOS --paginate --output json |
    jq -r --arg version "$VERSION" '.data[] | select(.attributes.versionString == $version) | .attributes.appStoreState' |
    head -1
}

version_id() {
  "$ASC_BIN" versions list --app "$APP_ID" --platform IOS --paginate --output json |
    jq -r --arg version "$VERSION" '.data[] | select(.attributes.versionString == $version) | .id' |
    head -1
}

ensure_version_locales() {
  local target_version_id response created=0
  target_version_id=$(version_id)
  response=$("$ASC_BIN" localizations list \
    --version "$target_version_id" \
    --paginate \
    --output json)
  for locale in $(jq -r '.storeLocales[]' metadata/store-locales.json); do
    if ! jq -e --arg locale "$locale" \
      '.data[] | select(.attributes.locale == $locale)' \
      >/dev/null <<<"$response"; then
      "$ASC_BIN" localizations create \
        --version "$target_version_id" \
        --locale "$locale" \
        --output table
      created=$((created + 1))
    fi
  done
  echo "Version locale scaffolding complete ($created created)."
}

require_confirmation() {
  if [[ "$CONFIRMED_VERSION" != "$VERSION" ]]; then
    echo "refusing remote mutation: repeat the exact target version as the third argument" >&2
    exit 2
  fi
}

validate_screenshots_with_asc() {
  local validated=0
  for locale in $(jq -r '.storeLocales[]' metadata/store-locales.json); do
    for display in $(jq -r '.displayTypes[].name' metadata/screenshots.json); do
      "$ASC_BIN" screenshots validate \
        --path "metadata/screenshots/$locale/$display" \
        --device-type "${display#APP_}" \
        --output json >/dev/null
      validated=$((validated + 1))
    done
  done
  echo "ASC validated $validated locale/device screenshot directories."
}

case "$ACTION" in
  create)
    require_confirmation
    STATE=$(version_state)
    if [[ -n "$STATE" && "$STATE" != "PREPARE_FOR_SUBMISSION" ]]; then
      echo "version $VERSION already exists in non-editable state $STATE" >&2
      exit 1
    fi
    if [[ -z "$STATE" ]]; then
      "$ASC_BIN" versions create \
        --app "$APP_ID" \
        --version "$VERSION" \
        --platform IOS \
        --copy-metadata-from 1.20260821.44 \
        --exclude-fields whatsNew \
        --release-type AFTER_APPROVAL \
        --output table
    else
      echo "Version $VERSION already exists and is editable; resuming scaffolding."
    fi
    ensure_version_locales
    ;;
  plan)
    STATE=$(version_state)
    if [[ "$STATE" != "PREPARE_FOR_SUBMISSION" ]]; then
      echo "target $VERSION must be PREPARE_FOR_SUBMISSION; found ${STATE:-missing}" >&2
      exit 1
    fi
    npx tsx ./src/scripts/validate-store-metadata.ts
    "$ASC_BIN" metadata validate --dir ./metadata --output table
    ./scripts/build-screenshots.sh
    npx tsx ./src/scripts/validate-screenshots.ts
    validate_screenshots_with_asc
    mkdir -p "$METADATA_REVIEW" "$SCREENSHOT_REVIEW"
    "$ASC_BIN" metadata plan \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --dir ./metadata \
      --review-dir "$METADATA_REVIEW" \
      --output markdown | tee "$METADATA_REVIEW/plan.md"
    "$ASC_BIN" metadata keywords plan \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --dir ./metadata \
      --output markdown | tee "$METADATA_REVIEW/keywords-plan.md"
    "$ASC_BIN" screenshots review-generate \
      --raw-dir ./tmp/screenshots-raw \
      --framed-dir ./metadata/screenshots \
      --output-dir "$SCREENSHOT_REVIEW" \
      --output table
    npx tsx ./src/scripts/pin-screenshot-review-devices.ts "$SCREENSHOT_REVIEW"
    echo "Review the metadata plan and $SCREENSHOT_REVIEW/index.html before approve."
    ;;
  approve)
    require_confirmation
    "$ASC_BIN" metadata approve --review-dir "$METADATA_REVIEW" --all --output table
    "$ASC_BIN" screenshots review-approve \
      --output-dir "$SCREENSHOT_REVIEW" \
      --all-ready \
      --output table
    echo "Local approvals recorded. Apply metadata before planning screenshots."
    ;;
  apply-metadata)
    require_confirmation
    STATE=$(version_state)
    npx tsx ./src/scripts/check-release-gate.ts \
      metadata \
      "$VERSION" \
      "$STATE" \
      "$CONFIRMED_VERSION" \
      "$METADATA_REVIEW"
    "$ASC_BIN" metadata apply \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --dir ./metadata \
      --review-dir "$METADATA_REVIEW" \
      --confirm \
      --output table
    "$ASC_BIN" metadata keywords audit \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --strict \
      --output table
    ;;
  plan-screenshots)
    STATE=$(version_state)
    if [[ "$STATE" != "PREPARE_FOR_SUBMISSION" ]]; then
      echo "target $VERSION must be PREPARE_FOR_SUBMISSION; found ${STATE:-missing}" >&2
      exit 1
    fi
    NEXT_JSON="$SCREENSHOT_REVIEW/plan.json.next"
    NEXT_MARKDOWN="$SCREENSHOT_REVIEW/plan.md.next"
    "$ASC_BIN" screenshots plan \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --review-output-dir "$SCREENSHOT_REVIEW" \
      --replace \
      --output json \
      --pretty >"$NEXT_JSON"
    mv "$NEXT_JSON" "$SCREENSHOT_REVIEW/plan.json"
    "$ASC_BIN" screenshots plan \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --review-output-dir "$SCREENSHOT_REVIEW" \
      --replace \
      --output markdown >"$NEXT_MARKDOWN"
    mv "$NEXT_MARKDOWN" "$SCREENSHOT_REVIEW/plan.md"
    cat "$SCREENSHOT_REVIEW/plan.md"
    ;;
  apply-screenshots)
    require_confirmation
    STATE=$(version_state)
    npx tsx ./src/scripts/check-release-gate.ts \
      screenshots \
      "$VERSION" \
      "$STATE" \
      "$CONFIRMED_VERSION" \
      "$SCREENSHOT_REVIEW"
    ASC_TIMEOUT=${ASC_TIMEOUT:-600s} \
      ASC_UPLOAD_TIMEOUT=${ASC_UPLOAD_TIMEOUT:-600s} \
      "$ASC_BIN" screenshots apply \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --review-output-dir "$SCREENSHOT_REVIEW" \
      --replace \
      --confirm \
      --output table
    ;;
  verify)
    STATE=$(version_state)
    if [[ "$STATE" != "PREPARE_FOR_SUBMISSION" ]]; then
      echo "target $VERSION must still be PREPARE_FOR_SUBMISSION; found ${STATE:-missing}" >&2
      exit 1
    fi
    mkdir -p "tmp/asc-parity-$VERSION"
    "$ASC_BIN" metadata pull \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --dir "tmp/asc-parity-$VERSION" \
      --force \
      --output table
    VERSION_ID=$("$ASC_BIN" versions list --app "$APP_ID" --platform IOS --paginate --output json |
      jq -r --arg version "$VERSION" '.data[] | select(.attributes.versionString == $version) | .id')
    "$ASC_BIN" metadata keywords audit \
      --app "$APP_ID" \
      --version "$VERSION" \
      --platform IOS \
      --strict \
      --output table
    ASC_BIN="$ASC_BIN" npx tsx ./src/scripts/verify-store-parity.ts \
      "$VERSION" \
      "$VERSION_ID" \
      "tmp/asc-parity-$VERSION"
    ;;
  *)
    echo "unknown action: $ACTION" >&2
    exit 2
    ;;
esac
