# syntax=docker/dockerfile:1

# Keep these runtime pins aligned with package.json and the documented Edge baseline.
ARG NODE_VERSION=24.21.0-trixie
ARG PNPM_VERSION=12.11.2
ARG CLAUDE_CODE_VERSION=2.1.220
ARG CODEX_VERSION=0.147.0
ARG OPENCODE_VERSION=1.18.16
ARG CONTAINER_UID=1000
ARG CONTAINER_GID=1000
ARG CONTAINER_USER=edge
ARG CONTAINER_GROUP=edge

FROM node:${NODE_VERSION} AS development

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG DEBIAN_FRONTEND=noninteractive
ARG PNPM_VERSION
ARG CLAUDE_CODE_VERSION
ARG CODEX_VERSION
ARG OPENCODE_VERSION
ARG CONTAINER_UID
ARG CONTAINER_GID
ARG CONTAINER_USER
ARG CONTAINER_GROUP

# Tailscale, for an interactive `tailscale up` in a shell in this container.
#
# The client is baked into the image rather than run as a sidecar: `core` itself
# joins the tailnet, in userspace-networking mode, which needs no /dev/net/tun,
# no NET_ADMIN and no root, so `cap_drop: ALL` and `no-new-privileges` hold
# unchanged. Nothing starts it automatically and no SSH server rides along --
# `tailscale up` prints a login URL and the developer signs in, the same way
# every other credential in this container is obtained.
#
# The version is pinned: keep it in step with the `tailscale` client on the host
# so the two behave the same, and bump it deliberately.
RUN curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg \
      -o /usr/share/keyrings/tailscale-archive-keyring.gpg \
  && echo 'deb [signed-by=/usr/share/keyrings/tailscale-archive-keyring.gpg] https://pkgs.tailscale.com/stable/debian trixie main' \
      > /etc/apt/sources.list.d/tailscale.list

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    bat \
    bubblewrap \
    ca-certificates \
    curl \
    dumb-init \
    entr \
    fd-find \
    fzf \
    gh \
    git \
    htop \
    jq \
    less \
    libasound2t64 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libdbus-1-3 \
    libfontconfig1 \
    libfreetype6 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    ncdu \
    openssh-client \
    python3 \
    ripgrep \
    tailscale=1.102.3 \
    tig \
    time \
    tree \
    tzdata \
    watch \
    wget \
    yq \
  && rm -rf /var/lib/apt/lists/*

# Corepack is removed, not merely unused. Node ships it only up to (not
# including) 25.0.0, and pnpm no longer lists it as an installation method, so
# it is a dependency with an expiry date. Deleting it here means a later
# `corepack enable` cannot reintroduce a second `pnpm` on PATH ahead of the
# standalone install below, and it makes "builds without Corepack" a property
# the image demonstrates rather than one the Containerfile merely refrains from
# violating.
RUN npm rm --global corepack \
  && npm install --global \
    "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    "@openai/codex@${CODEX_VERSION}" \
    "opencode-ai@${OPENCODE_VERSION}" \
  && npm cache clean --force

# The group is named after the user on purpose. Devcontainer features are
# third-party scripts, and several of them chown their state with a literal
# `${_REMOTE_USER}:${_REMOTE_USER}` — a group named
# anything else makes those installs fail with "chown: invalid group".
#
# `.ssh` is created empty, 0700, owned by the login account. No key material is
# ever placed there: an optional `compose.override.yaml` may bind the host's
# `known_hosts` read-only onto it, and an ssh-agent socket arrives separately. Creating it
# here is what makes that mount well defined — Podman would otherwise invent the
# missing parent directory itself, owned by root.
RUN set -eux; \
  base_user=node; \
  base_group=node; \
  groupmod --gid "${CONTAINER_GID}" "${base_group}"; \
  if [ "${CONTAINER_GROUP}" != "${base_group}" ]; then \
    groupmod --new-name "${CONTAINER_GROUP}" "${base_group}"; \
  fi; \
  usermod --gid "${CONTAINER_GID}" --shell /bin/bash "${base_user}"; \
  if [ "${CONTAINER_USER}" != "${base_user}" ]; then \
    usermod --login "${CONTAINER_USER}" --home "/home/${CONTAINER_USER}" --move-home "${base_user}"; \
  fi; \
  usermod --uid "${CONTAINER_UID}" --gid "${CONTAINER_GID}" "${CONTAINER_USER}"; \
  home="/home/${CONTAINER_USER}"; \
  install -d -m 0755 -o "${CONTAINER_USER}" -g "${CONTAINER_GROUP}" \
    "${home}" \
    "${home}/workspace" \
    "${home}/workspace/node_modules" \
    "${home}/.cache" \
    "${home}/.config" \
    "${home}/.config/.wrangler" \
    "${home}/.config/gh" \
    "${home}/.local" \
    "${home}/.local/bin" \
    "${home}/.local/share" \
    "${home}/.local/share/opencode" \
    "${home}/.local/share/pnpm" \
    "${home}/.local/state" \
    "${home}/.npm" \
    "${home}/.codex" \
    "${home}/.claude" \
    "${home}/.ssh" \
    "${home}/.local/state/tailscale"; \
  chmod 0700 "${home}/.ssh"; \
  chmod 0700 "${home}/.local/state/tailscale"

# `tailscale` for interactive shells, shadowing /usr/bin/tailscale on PATH.
#
# The real CLI, run bare, dials the system socket of a root tailscaled that this
# container can never run: no systemd, `cap_drop: ALL`, and `no-new-privileges`
# so no sudo either. This wrapper points every invocation at a user-space daemon
# instead -- running as the login account, `--tun=userspace-networking`, no
# capability needed -- and starts that daemon on first use, so a plain
# `tailscale up` works in a fresh shell.
#
# Written here rather than COPYed from `.devcontainer/`: this is the only thing
# the image needs from the host besides the build context itself, and a heredoc
# keeps `.devcontainer/` down to `devcontainer.json` and its lock file. It lands
# 0555 under root ownership, so the workspace bind -- which `edge` owns and any
# development shell can write -- cannot influence what a `tailscale` call runs.
RUN cat > /usr/local/bin/tailscale <<'WRAPPER' && chmod 0555 /usr/local/bin/tailscale
#!/usr/bin/env bash
set -euo pipefail

state=${HOME}/.local/state/tailscale
socket=${state}/tailscaled.sock

# `version --daemon` round-trips to the daemon and fails when the socket is
# missing OR stale -- a leftover socket file from a stopped container would make
# a bare socket test lie.
if ! /usr/bin/tailscale --socket="${socket}" version --daemon > /dev/null 2>&1; then
  mkdir -p "${state}"
  chmod 0700 "${state}"
  echo 'tailscale: starting user-space tailscaled (log: ~/.local/state/tailscale/tailscaled.log)' >&2
  # One line on purpose: a backslash continuation inside a Containerfile
  # heredoc is eaten by the Dockerfile parser before the shell ever sees it.
  nohup /usr/sbin/tailscaled --tun=userspace-networking --statedir="${state}" --socket="${socket}" >> "${state}/tailscaled.log" 2>&1 &
  for _ in $(seq 1 50); do
    /usr/bin/tailscale --socket="${socket}" version --daemon > /dev/null 2>&1 && break
    sleep 0.2
  done
  if ! /usr/bin/tailscale --socket="${socket}" version --daemon > /dev/null 2>&1; then
    echo "tailscale: tailscaled did not come up; see ${state}/tailscaled.log" >&2
    exit 69
  fi
fi

exec /usr/bin/tailscale --socket="${socket}" "$@"
WRAPPER

ENV HOME=/home/edge \
    USER=edge \
    LANG=C.UTF-8 \
    SHELL=/bin/bash \
    XDG_CONFIG_HOME=/home/edge/.config \
    XDG_CACHE_HOME=/home/edge/.cache \
    XDG_DATA_HOME=/home/edge/.local/share \
    XDG_STATE_HOME=/home/edge/.local/state \
    PNPM_HOME=/home/edge/.local/share/pnpm \
    PATH=/home/edge/.local/bin:/home/edge/.local/share/pnpm/bin:${PATH}

WORKDIR /home/edge/workspace
USER edge:edge

# Standalone install per https://pnpm.io/installation. This is the single source
# of pnpm in the image: it needs no root, so it runs after the USER switch and
# lands under $HOME rather than /usr/local.
#
# The PATH above ends in `/bin` for a reason. pnpm 11 moved every global binary
# into a `bin` subdirectory of PNPM_HOME and 12 keeps that layout — the install
# script runs `pnpm setup`,
# which installs the CLI with `pnpm add -g` and writes `pn`/`pnpx`/`pnx` there
# too, then deletes the v10-era shims that used to sit in PNPM_HOME itself.
# Pointing PATH at PNPM_HOME directly, as the v10 layout required, leaves this
# image with no pnpm at all.
#
# `pnpm setup` also has to identify the shell it is configuring, which it does
# from $SHELL — so this must stay below the ENV block that sets it. It writes a
# PATH line into ~/.bashrc as well; that is redundant here because PATH is baked
# into the image, but harmless, and suppressing it is not worth diverging from
# the documented install.
#
# PNPM_VERSION is pinned to the same version package.json declares under
# devEngines.packageManager; test/development-container-security.test.ts fails
# if the two ever drift apart.
RUN wget -qO- https://get.pnpm.io/install.sh \
  | env PNPM_VERSION="${PNPM_VERSION}" bash -

# The global install that `pnpm setup` performs is a SYMLINK into
# $PNPM_HOME/store (`store/v<major>/links/@pnpm/exe/...`) — but compose.yaml mounts
# the named volume `pnpm-store` over that store at runtime, hiding the image's
# copy behind an empty volume. The symlink then dangles and every `pn`/`pnpm`
# invocation fails with "exec: .../@pnpm/exe/pnpm: not found". Dereference it
# here so the global install is self-contained and survives the mount.
#
# The `global/v*` glob stays version-agnostic on purpose: pnpm bumps that
# directory with its major, and a hardcoded `v11` would silently match nothing
# on the next upgrade — the loop would skip, the build would still succeed, and
# only a container with the volume mounted would fail.
RUN set -eu; \
  for link in "${PNPM_HOME}"/global/v*/*/node_modules/@pnpm/exe; do \
    [ -L "${link}" ] || continue; \
    real="$(readlink -f "${link}")"; \
    rm "${link}"; \
    cp -a "${real}" "${link}"; \
  done; \
  pnpm --version

CMD ["sleep", "infinity"]
