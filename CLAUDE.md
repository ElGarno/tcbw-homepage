# TC-BW-Attendorn Homepage

## Project Overview
Modernization of the TC-BW-Attendorn tennis club homepage.
Current site: http://www.tc-bw-attendorn.de/

## Key Requirements
- Modern, responsive design
- 2-3 fixed users can add/modify content
- Social media integration (Instagram, Facebook)
- Team reports and images
- Complete rebuild (no migration of old content needed)

## Tech Stack
- Hugo (Static Site Generator)
- Cloudflare Pages (Hosting)
- GitHub: ElGarno/tcbw-homepage

## Automation
- **nuliga-sync** — n8n Cron (06:00 Berlin) scraped täglich liga.nu, erstellt Draft-PRs bei Änderungen. Logic in `tools/nuliga-sync/`. Spec: `doc/specs/2026-04-20-nuliga-sync-workflow.md`.
- **Mail-to-Homepage** — n8n liest GMX-Postfach, Claude API erzeugt Draft-PRs aus Mails. Spec: `doc/specs/2026-03-23-mail-to-homepage-workflow.md`.
- **Daily Deploy** — n8n triggert Cloudflare-Rebuild um 06:30 Berlin. Spec: `doc/specs/2026-03-23-daily-deploy-cronjob.md`.

## Development Rules
- Follow user's global CLAUDE.md preferences (uv, ruff, pytest)
- Conversation in German, code in English
- No commits without explicit request
- Bei Änderungen an `content/termine/_index.md` beachten: `medenspiel`-Einträge mit `team` + `opponent` Feldern werden von nuliga-sync auto-gemanaged, Events ohne diese Felder (Sommerfest, JHV) sind manuell