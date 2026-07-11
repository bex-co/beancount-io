#! /usr/bin/env bash

# https://docs.expo.dev/build/introduction/
# Usage: yarn deploy [ios|android|all]   (default: all)

set -e # exit on error

PLATFORM="${1:-all}"

case "$PLATFORM" in
  ios | android | all) ;;
  *)
    echo "Usage: yarn deploy [ios|android|all]" >&2
    exit 1
    ;;
esac

# Install dependencies
yarn

# Install eas-cli if not already installed
yarn global add eas-cli@latest

# No need for login; EAS_TOKEN will be used automatically by the CLI if set
# export EAS_TOKEN=your-token # <-- make sure this is set in your CI or shell environment

# Send Over-the-Air Updates (scoped to the selected platform) ####
# --environment is required by eas-cli in non-interactive contexts (CI, no TTY).
npx eas-cli@latest update --channel production --platform "$PLATFORM" \
  --environment production --non-interactive \
  --message "Production update $(date +'%Y-%m-%d %H:%M:%S')"

deploy_ios() {
  # --auto-submit submits this exact build to the App Store once it finishes
  # (server-side), avoiding the `submit --latest` race with --no-wait.
  echo "Building and submitting iOS app..."
  npx eas-cli@latest build --platform ios --profile production --auto-submit --non-interactive --no-wait
}

deploy_android() {
  echo "Building and submitting Android app..."
  npx eas-cli@latest build --platform android --profile production --auto-submit --non-interactive --no-wait
}

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
  deploy_ios
fi

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  deploy_android
fi
