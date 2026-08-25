#!/bin/sh
# Wildcard DNS for the harness bridge: answer host.docker.internal AND every
# subdomain (8080-<sandbox>-<token>.host.docker.internal) with the host gateway
# address, and forward everything else to Docker's embedded DNS so compose
# service names keep resolving. The gateway address is discovered at startup by
# resolving the exact name host.docker.internal via the embedded DNS — Docker
# Desktop and OrbStack both provide it.
set -eu

IP="$(getent hosts host.docker.internal | awk '{print $1; exit}')"
if [ -z "$IP" ]; then
  echo "devdns: FATAL — cannot resolve host.docker.internal via embedded DNS" >&2
  exit 1
fi
echo "devdns: *.host.docker.internal -> $IP; everything else -> 127.0.0.11"

exec dnsmasq \
  --keep-in-foreground \
  --log-facility=- \
  --no-resolv \
  --server=127.0.0.11 \
  --address=/host.docker.internal/"$IP"
