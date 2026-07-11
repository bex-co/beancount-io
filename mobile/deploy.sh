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
npx eas-cli@latest update --channel production --platform "$PLATFORM" \
  --message "Production update $(date +'%Y-%m-%d %H:%M:%S')"

deploy_ios() {
  echo "Building iOS app..."
  npx eas-cli@latest build --platform ios --profile production --non-interactive --no-wait

  echo "Submitting iOS app to App Store..."
  npx eas-cli@latest submit --platform ios --latest --non-interactive
}

deploy_android() {
  echo "Building Android app..."
  npx eas-cli@latest build --platform android --profile production --non-interactive --no-wait

  echo "Submitting Android app to Play Store..."
  npx eas-cli@latest submit --platform android --latest --non-interactive
}

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
  deploy_ios
fi

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  deploy_android
fi
