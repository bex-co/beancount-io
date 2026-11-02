# Gitea for bex: the stock image plus a first-boot administrator.
#
# bex has no one-shot init job and `bex ssh` is unusable, so the admin account
# the backend authenticates as is created here, once Gitea is serving.
FROM docker.gitea.com/gitea:1.24

COPY bex-entrypoint.sh /usr/local/bin/bex-entrypoint.sh
RUN chmod +x /usr/local/bin/bex-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/bex-entrypoint.sh"]
CMD ["/usr/bin/s6-svscan", "/etc/s6"]
