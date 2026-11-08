# Gitea for bex: the stock image plus the things bex has no one-shot job for.
#
# bex has no init job and `bex ssh` is unusable, so this wrapper creates Gitea's
# own schema in the shared Postgres before Gitea starts (psql, below), and the
# admin account the backend authenticates as once Gitea is serving.
FROM docker.gitea.com/gitea:1.24

RUN apk add --no-cache postgresql-client

COPY bex-entrypoint.sh /usr/local/bin/bex-entrypoint.sh
RUN chmod +x /usr/local/bin/bex-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/bex-entrypoint.sh"]
CMD ["/usr/bin/s6-svscan", "/etc/s6"]
