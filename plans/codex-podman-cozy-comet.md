# Codex App → SSH over Tailscale → `core` container

## Context

Codex App should be able to open a Remote SSH session whose shell runs **inside the `core`
dev container**, so the workspace at `/home/edge/workspace` and the Node/pnpm toolchain are
directly usable — not `podman exec` wrapped, and not a shell in a sidecar.

Today `umaxica-apps-edge` has no path in. There is no sshd (only `openssh-client`), and
Tailscale is actively being _removed_ from this repo in the current working tree
(`.devcontainer/devcontainer.json`, `devcontainer-lock.json`, `Containerfile`, and the staged
deletions of `docs/development/tailscale-development-container.md` and
`scripts/check-tailscale-phase1`). Per your decision those deletions stay; this is a fresh
design, not a revival of the phase-1 work.

### Findings that shaped the design

1. **No Ruby, bundler, or bun exist here.** `Containerfile` is Node 24 + pnpm only, and
   AGENTS.md forbids bun outright. Your completion criteria drop to `git`, `node`, `pnpm`.
2. **`core` runs `cap_drop: ALL` + `no-new-privileges:true` + `userns_mode: keep-id` as
   non-root `edge`**, and `test/development-container-security.test.ts` asserts no `cap_add:`.
   sshd therefore **cannot bind port 22 and cannot do privilege separation**. It runs
   unprivileged as `edge` on **2222**; Tailscale still exposes only tailnet **tcp/22**.
3. **Serve's localhost-only rule is a CLI validation, not a ServeConfig limit.** The
   `TCPForward` field in the JSON that `TS_SERVE_CONFIG` loads is a raw dial string;
   umaxica-apps-global used `"TCPForward": "core:22"` over a plain bridge network. This
   removes the need for `network_mode: service:core` and with it three podman-compose
   pitfalls: `networks:`/`network_mode:` mutual exclusion, the `depends_on` → `--requires`
   hazard that makes `core` un-removable and breaks `devcontainer up
   --remove-existing-container`, and port-publication ownership.
   _Caveat: the sibling repo never exercised that forward (its OpenSSH was disabled), so this
   is the one assumption that must be proven live — see Verification gate A._
4. **`TS_USERSPACE` defaults to `true`.** Userspace networking needs no `/dev/net/tun`, no
   `NET_ADMIN`, no privileged mode. Nothing extra to request.
5. **podman-compose 1.6.0 is the pinned provider** via `PODMAN_COMPOSE_PROVIDER`; a bare
   `podman compose` would otherwise pick the installed `docker-compose` 5.5.0.

### Accepted policy override

You chose to mount the host's authorized_keys despite `docs/development/container-security-policy.md`
forbidding host `.ssh`. I will scope it to the **single file, read-only**
(`${HOME}/.ssh/authorized_keys`), never the directory, and amend the policy and the invariant
test with an explicit, narrow carve-out rather than deleting the assertion. Public keys carry
no secret material, but this is still the first host-identity path into `core` — recorded as a
residual risk.

---

## Architecture

```
Codex App
  │ ssh edge@umaxica-edge-core.<tailnet>.ts.net   (tailnet tcp/22)
  ▼
tailscale sidecar          userspace networking, no caps, no tun
  │ ServeConfig TCP 22 → TCPForward "core:2222"
  ▼ (bridge network `remote-access`, compose DNS)
core:2222                  sshd as `edge`, unprivileged, pubkey only
  └─ /home/edge/workspace, git, node, pnpm
```

---

## Changes

### 1. `Containerfile` — add the SSH server (3 edits)

- Add `openssh-server \` to the existing apt block (alphabetically beside `openssh-client`).
- While still `USER root`, create the two directories sshd needs with `edge` ownership:
  `/run/sshd` (privilege-separation dir; a named volume will be mounted over it, and Podman
  seeds volume ownership from the image path) and `/home/edge/authorized_keys.d`.
- `COPY` two new files, `chmod 0555` / `0444`, so PID 1's behaviour is not read from the
  writable workspace bind (the pattern umaxica-apps-global settled on):
  - `.devcontainer/edge-sshd-entrypoint.sh` → `/usr/local/bin/edge-sshd-entrypoint`
  - `.devcontainer/edge-sshd_config` → `/etc/ssh/edge-sshd_config`

Do **not** add `ARG`/`ENV` names containing TOKEN/SECRET/PASSWORD/API_KEY, and do not `COPY`
any path matching `.ssh`/`.secrets` — both are asserted against.

### 2. `.devcontainer/edge-sshd_config` (new)

```
Port 2222
HostKey /home/edge/sshd-host-keys/ssh_host_ed25519_key
PidFile /home/edge/sshd-host-keys/sshd.pid
AuthorizedKeysFile /home/edge/authorized_keys.d/authorized_keys
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
UsePAM no
AllowUsers edge
AllowTcpForwarding yes
AllowAgentForwarding no
X11Forwarding no
PrintMotd no
Subsystem sftp internal-sftp
```

`AllowTcpForwarding yes` is deliberate — Codex/VS Code Remote SSH tunnels its own ports over
the session. `UsePAM no` is required because a non-root sshd cannot run the PAM stack.
Note the paths avoid the substring `/.ssh`, which the invariant test scans for.

### 3. `.devcontainer/edge-sshd-entrypoint.sh` (new)

`set -euo pipefail`. Generates the ed25519 host key into the persistent
`/home/edge/sshd-host-keys` volume **only if absent** (`ssh-keygen -t ed25519 -N '' -f …`), so
the host key survives recreate and Codex never sees a changed-fingerprint warning. Fails
loudly with a clear message if `/home/edge/authorized_keys.d/authorized_keys` is missing or
empty — a silently keyless sshd is a lockout, not a warning. Then
`exec /usr/sbin/sshd -D -e -f /etc/ssh/edge-sshd_config`.

`-D` (foreground) + `-e` (log to stderr) makes sshd PID 1's child under `init: true`, so
`podman logs` shows auth failures and compose restart policy applies. The script never echoes
key material.

### 4. `.devcontainer/tailscale-serve.json` (new)

```json
{
  "TCP": {
    "22": {
      "TCPForward": "core:2222"
    }
  }
}
```

Only `TCP.22`. No `HTTPS`, no `Web`, no `AllowFunnel` — nothing but SSH is reachable from the
tailnet, and Funnel (public internet) is never configured.

### 5. `compose.remote-access.yaml` (new, opt-in overlay)

Mirrors the existing `compose.custom.yaml` overlay idiom. Declares **no** `name:` (inherits
`umaxica-apps-edge`).

`core` gains only: the `command:` override pointing at `/usr/local/bin/edge-sshd-entrypoint`,
the `remote-access` + `default` networks (both must be listed — an explicit `networks:` key
suppresses the implicit default attachment), and three mounts:

| Mount                                                                                                   | Purpose                                   |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| volume `sshd-host-keys` → `/home/edge/sshd-host-keys`                                                   | stable host key + pidfile across recreate |
| volume `sshd-run` → `/run/sshd`                                                                         | writable privsep dir under a tmpfs `/run` |
| bind `${HOME}/.ssh/authorized_keys` → `/home/edge/authorized_keys.d/authorized_keys`, `read_only: true` | the accepted override                     |

New `tailscale` service:

```yaml
  tailscale:
    image: docker.io/tailscale/tailscale:v1.102.3
    environment:
      TS_USERSPACE: 'true'
      TS_AUTH_ONCE: 'true'
      TS_STATE_DIR: /var/lib/tailscale
      TS_HOSTNAME: umaxica-edge-core
      TS_EXTRA_ARGS: '--advertise-tags=tag:umaxica-edge --accept-dns=false'
      TS_SERVE_CONFIG: /etc/tailscale/serve/serve.json
      TS_AUTHKEY: '${TS_AUTHKEY:-}'
    volumes: [ tailscale-state → /var/lib/tailscale, ./.devcontainer/tailscale-serve.json → …:ro ]
    networks: [ remote-access ]
    restart: on-failure:3
    security_opt: [ 'no-new-privileges:true' ]
    cap_drop: [ ALL ]
    cpus / mem_limit / pids_limit + json-file log caps   # matching cloudflare-tunnel
```

Deliberate absences, each load-bearing: no `privileged`, no `network_mode`, no `cap_add`, no
`devices`, no `ports`, no `depends_on` (the `--requires` hazard), no `tty`/`stdin_open` (the
test asserts exactly one of each repo-wide). `TS_AUTHKEY` uses `:-` not `:?` precisely so the
sidecar keeps starting after you delete the key. `TS_AUTH_ONCE: 'true'` stops it re-logging in
on every start. `--accept-dns=false` keeps the sidecar off tailnet DNS it has no use for.

Networks block pins the rationale in a comment: `remote-access: {}`, a plain bridge (not
`internal: true`, because it is the sidecar's only network and must carry its control-plane /
DERP egress).

Version pin `v1.102.3` matches your host `tailscale` client — record any drift.

### 6. `scripts/dev-start` — add `--remote-access`

Mirror the existing `--rails` / `--tunnel` flags: parse the flag, append
`-f compose.remote-access.yaml` to the `compose` array and `tailscale` to `services`. Guard
before starting, in the style of the `--tunnel` token check:

- `${HOME}/.ssh/authorized_keys` exists and is non-empty → else refuse with the reason.
- On **first** run only, `TS_AUTHKEY` must be resolvable (env or `.env`); if
  `podman volume exists umaxica-apps-edge_tailscale-state` is already true, do **not** require
  it. This is what makes "restart without re-supplying the key" a checked property rather than
  a hope.

Update the usage string.

### 7. `test/development-container-security.test.ts` — extend, don't weaken

- Add `compose.remote-access.yaml` to the `composeFiles` array (its comment explicitly says a
  third file must be added here to be covered) and update that comment.
- Replace the blanket `'/.ssh'` entry in `forbidden` with a scoped rule: `/.ssh` stays banned
  in `devcontainer.json` and in `compose.yaml`/`compose.custom.yaml`; in
  `compose.remote-access.yaml` the **only** permitted occurrence is
  `${HOME}/.ssh/authorized_keys`, and a new assertion requires that line to carry
  `read_only: true`.
- New assertions worth having, since the file is open anyway:
  - the sidecar publishes no ports and adds no capabilities;
  - `tailscale-serve.json` contains `TCP`/`22` and **not** `AllowFunnel`/`Funnel`;
  - `edge-sshd_config` contains `PasswordAuthentication no`, `PermitRootLogin no`,
    `PubkeyAuthentication yes`.

The existing `tty`/`stdin_open` count, loopback-port, and literal-credential assertions must
all still pass unmodified against the enlarged `compose` string.

### 8. Docs

- **New** `docs/development/tailscale-remote-ssh.md` — the operational doc: tailnet ACL/tag
  prerequisites, bootstrap, key-deletion timing, `~/.ssh/config`, troubleshooting, and the
  explicit statement that this is _OpenSSH over Tailscale Serve_, **not** Tailscale SSH
  (`--ssh` is never set, because it would land the session in the sidecar, not `core`).
- `docs/development/container-security-policy.md` — record the authorized_keys carve-out and
  the unprivileged-sshd-on-2222 rationale.
- `docs/development/edge-development-container.md` — one pointer to the new doc.
- `.cspell/project-words.txt` — `tailscale`, `tailscaled`, `authkey`, `tskey`, `TCPForward`,
  `magicdns`, `sshd`, `keygen`, `netavark` as needed; `pnpm run check:spelling` is part of
  `check`.

`.gitignore` needs **no** change: `.env` is already ignored, and no new secret-bearing file is
introduced.

---

## Bootstrap (one-off, operator-run)

1. In the tailnet policy file, define `tag:umaxica-edge` with your user as `tagOwners`, and a
   grant allowing your devices → `tag:umaxica-edge` on `tcp:22`. Without the tagOwner entry,
   `--advertise-tags` is rejected at login.
2. Mint an auth key in the admin console: **one-off (single-use), tagged `tag:umaxica-edge`,
   pre-approved if device approval is on, and NOT ephemeral** (ephemeral would delete the node
   on every container stop, defeating state persistence).
3. `echo 'TS_AUTHKEY=tskey-auth-…' >> .env` — `.env` is gitignored, and
   `.devcontainer/write-host-ids.sh` only rewrites `UID`/`GID`, so appending is safe.
4. `pnpm run build:devcontainer`-equivalent rebuild, then
   `scripts/dev-start --remote-access` (or `devcontainer up` with the overlay added to
   `dockerComposeFile`).
5. Confirm registration: `podman logs umaxica-apps-edge_tailscale_1` and the admin console.
6. **Delete the key now**: remove the `TS_AUTHKEY` line from `.env` _and_ revoke the key in the
   admin console. Revocation is the one that matters — deleting the local line alone leaves a
   live credential. From here the node runs off the `tailscale-state` volume alone.

State lives in the named volume `umaxica-apps-edge_tailscale-state` at `/var/lib/tailscale`.
It survives `podman compose down` but **not** `down -v` — call that out in the doc.

### `~/.ssh/config` for Codex App

```
Host umaxica-edge-core
  HostName umaxica-edge-core.<your-tailnet>.ts.net
  User edge
  Port 22
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  ServerAliveInterval 30
```

Port 22 is the _tailnet_ side; Serve forwards it to `core:2222`.

---

## Verification

**Gate A — the load-bearing assumption (do this first, before writing anything else).**
Prove `TCPForward` accepts a non-localhost target. Start the sidecar and a throwaway listener
on the `remote-access` network, then from a second tailnet machine
`nc -vz umaxica-edge-core.<tailnet>.ts.net 22`. If tailscaled rejects the target or silently
refuses to dial it, stop and report — the agreed fallback is `network_mode: service:core`
(supported by podman-compose 1.6.0, maps to `--network=container:<name>`) with the
`depends_on`/`--requires` cost accepted, **not** a silent switch to `TS_DEST_IP`, which would
forward every port.

**Gate B — unprivileged sshd actually starts.** `podman logs` must show sshd listening on
2222 with no "Missing privilege separation directory". The `sshd-run` volume exists to fix
exactly that; if it does not, report rather than adding `tmpfs` or a capability.

**Gate C — end to end.**

```bash
podman ps                       # core + tailscale up
podman exec umaxica-apps-edge_tailscale_1 tailscale status
ssh umaxica-edge-core           # from another tailnet machine
```

then inside the session, confirming it is `core` and not the sidecar:

```bash
hostname; cat /etc/hostname
id                              # uid=1000(edge)
pwd; cd ~/workspace && git status
node --version && pnpm --version
ls /home/edge/workspace/compose.yaml   # proves the workspace bind, not the sidecar FS
```

`ruby`/`bundle`/`bun` are **not** checked — they do not exist in this image, per your decision.

**Gate D — restart survives without the key.** With `TS_AUTHKEY` already removed from `.env`:
`scripts/dev-stop` → `scripts/dev-start --remote-access` → `tailscale status` shows the **same
node ID** → `ssh umaxica-edge-core` succeeds and the host-key fingerprint is unchanged.

**Gate E — repo checks.** `pnpm run check` (includes the amended
`test/development-container-security.test.ts` and `check:spelling`). No bundle change, so
`check:size` and `test:api` are not implicated.

---

## Residual risks to report on completion

- **Host authorized_keys is now mounted into `core`** — the first host-identity path in,
  accepted by explicit decision. Read-only, single file, public keys only.
- **sshd listens on 0.0.0.0:2222 inside the container**, so anything on the compose `default`
  network (today: `cloudflare-tunnel`) can reach it. Pubkey-only auth is the control. Binding
  to the `remote-access` interface only is not practical — the address is assigned at runtime.
- **Tailnet ACLs are the real perimeter.** The sidecar exposes tcp/22 to whatever the grants
  allow; a permissive default policy exposes it tailnet-wide.
- **Rootless Podman restart policies** are honoured only while your user session lives, unless
  `systemctl --user enable --now podman-restart.service`.
- **Overlay composition is unverified** — `--rails` and `--remote-access` both add `networks:`
  to `core`, and podman-compose's cross-file list merge is not something I would trust
  untested. Document as "use one at a time until proven".
- **Version drift**: sidecar pinned to `v1.102.3` to match the host client; docs describe
  current Tailscale behaviour as of this work.
