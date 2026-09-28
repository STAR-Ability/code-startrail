# syntax=docker/dockerfile:1
ARG DEBIAN_IMAGE=debian:bookworm-slim
FROM ${DEBIAN_IMAGE} AS fetcher
ARG TARGETARCH
ARG DEBIAN_MIRROR=deb.debian.org
RUN sed -i "s/deb.debian.org/${DEBIAN_MIRROR}/g" /etc/apt/sources.list.d/debian.sources && apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN arch="${TARGETARCH:-$(dpkg --print-architecture)}"; \
    case "$arch" in \
      amd64) checksum=700d0ba6a6c02cce777e8761a5851b3d8d3e198e120887cda8e9134eb62efbce ;; \
      arm64) checksum=ce76a5d295e8fc65d0f621c465839e5f56016b402c593a7b2942eaa6f6da435a ;; \
      *) exit 1 ;; \
    esac; \
    curl -fsSL --retry 3 --connect-timeout 20 --max-time 300 "https://github.com/criyle/go-judge/releases/download/v1.13.0/go-judge_1.13.0_linux_${arch}" -o /go-judge && \
    echo "$checksum  /go-judge" | sha256sum -c - && chmod 755 /go-judge
FROM ${DEBIAN_IMAGE}
ARG DEBIAN_MIRROR=deb.debian.org
RUN sed -i "s/deb.debian.org/${DEBIAN_MIRROR}/g" /etc/apt/sources.list.d/debian.sources && apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends g++ curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=fetcher /go-judge /usr/local/bin/go-judge
COPY judge/entrypoint.sh /usr/local/bin/judge-entrypoint
RUN chmod 755 /usr/local/bin/judge-entrypoint
WORKDIR /opt/judge
EXPOSE 5050
# Controller needs namespace/cgroup privileges. Compilers and submissions execute as UID 1000 inside sandbox.
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s CMD curl -fsS http://127.0.0.1:5050/version || exit 1
ENTRYPOINT ["/usr/local/bin/judge-entrypoint"]
CMD ["-http-addr=:5050", "-parallelism=2", "-pre-fork=2", "-container-cred-start=10000", "-no-fallback", "-file-timeout=2m", "-output-limit=8388608", "-copy-out-limit=8388608", "-tmp-fs-param=size=128m,nr_inodes=4k"]
