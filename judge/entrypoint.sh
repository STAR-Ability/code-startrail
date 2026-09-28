#!/bin/sh
set -eu
# Docker's private cgroup v2 namespace exposes the container as "/".
# go-judge v1.13.0 rejects an empty current prefix. Delegate a child within
# this container's own hierarchy; never mount or alter the host hierarchy.
if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
  available=" $(cat /sys/fs/cgroup/cgroup.controllers) "
  for controller in cpu memory pids; do
    case "$available" in
      *" $controller "*) ;;
      *) echo "Required cgroup controller unavailable: $controller" >&2; exit 1 ;;
    esac
  done
  if [ "$(cat /proc/self/cgroup)" != "0::/" ]; then
    echo "Expected a private cgroup namespace; refusing host hierarchy access" >&2
    exit 1
  fi
  mkdir -p /sys/fs/cgroup/judge
  echo $$ > /sys/fs/cgroup/judge/cgroup.procs
  echo '+cpu +memory +pids' > /sys/fs/cgroup/cgroup.subtree_control
elif [ ! -d /sys/fs/cgroup/memory ] || [ ! -d /sys/fs/cgroup/pids ]; then
  echo "Memory and PID cgroups are required" >&2
  exit 1
fi
exec /usr/local/bin/go-judge "$@"
