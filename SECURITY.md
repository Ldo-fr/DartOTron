# Security Policy

## Supported Versions

Security updates are applied to the latest release on the `main` branch:

| Version | Supported |
| :--- | :--- |
| `1.0.x` | ✅ Supported |
| `< 1.0.0` | ❌ Not supported |

---

## Reporting a Vulnerability

If you discover a security vulnerability in **DartOTron**, please **do not open a public GitHub issue**.

Instead, please report it privately using **GitHub Private Vulnerability Reporting**:

1. Navigate to the **Security** tab of this repository (`https://github.com/Ldo-fr/DartOTron/security`).
2. Click **Report a vulnerability** to open a private security advisory.
3. Include a clear description of the issue, reproduction steps, affected files or endpoints, and potential impact.

We will acknowledge receipt as soon as possible and work with you on a fix before any public disclosure.

---

## Network & Deployment Security Notes

DartOTron is designed to operate on a **trusted local area network (LAN)** for home or club arcade cabinets:

- The HTTP/WebSocket server binds by default to port `8180` (`0.0.0.0`) so smartphones on the local Wi-Fi can connect to `/companion`.
- **Do not expose port `8180` directly to the public Internet** without placing it behind an authenticated reverse proxy with TLS.
- On Raspberry Pi deployments, run the systemd service as a dedicated non-root user belonging to the `dialout` group (as configured by `scripts/install-raspberry.sh`), and keep `data/scores.db` and `data/dartotron.json` writable only by that service user.
