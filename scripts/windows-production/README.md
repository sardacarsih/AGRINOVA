# Windows Production Auto Deploy (Split Backend/Web)

This runbook uses a fully split release and deploy model:

- Backend release tags: `backend/vX.Y.Z`
- Web release tags: `web/vX.Y.Z`
- Backend deploy script: `deploy-backend.ps1`
- Web deploy script: `deploy-web.ps1`

There is no combined backend+web release flow.

## End-to-end flow

1. Push backend tag or web tag.
2. GitHub Actions creates a release for that component.
3. Windows server runs component deploy script (manual or scheduled).
4. Script downloads latest component release asset, deploys, restarts only related service, and runs health check.
5. If health check fails, script rolls back that component only.

## 1) Tag and release conventions

- Backend:
  - Tag: `backend/v1.2.3`
  - Workflow: `.github/workflows/backend-release.yml`
  - Asset: `agrinova-backend-1.2.3.zip`

- Web:
  - Tag: `web/v1.2.3`
  - Workflow: `.github/workflows/web-release.yml`
  - Asset: `agrinova-web-standalone-1.2.3.zip`

## 2) Server folder layout

- `D:\agrinova\backend\config`
- `D:\agrinova\backend\current`
- `D:\agrinova\backend\releases`
- `D:\agrinova\web\config`
- `D:\agrinova\web\current`
- `D:\agrinova\web\releases`
- `D:\agrinova\deploy\logs`
- `D:\agrinova\deploy\state`
- `D:\agrinova\deploy\temp`

## 3) Required files on server

Copy these files from repository:

- `scripts/windows-production/deploy-backend.ps1` -> `D:\agrinova\deploy\deploy-backend.ps1`
- `scripts/windows-production/deploy-web.ps1` -> `D:\agrinova\deploy\deploy-web.ps1`
- `scripts/windows-production/run-backend.ps1` -> `D:\agrinova\backend\config\run-backend.ps1`
- `scripts/windows-production/run-web.ps1` -> `D:\agrinova\web\config\run-web.ps1`
- `scripts/windows-production/manual-deploy.bat` -> `D:\agrinova\deploy\manual-deploy.bat`

Set environment files:

- `D:\agrinova\backend\config\.env`
- `D:\agrinova\web\config\.env`

Set GitHub token:

```powershell
[Environment]::SetEnvironmentVariable("AGRINOVA_GH_TOKEN", "<YOUR_GITHUB_TOKEN>", "Machine")
```

## 4) Service setup (NSSM example)

Backend service:

```powershell
nssm install agrinova-backend powershell.exe "-ExecutionPolicy Bypass -File D:\agrinova\backend\config\run-backend.ps1"
nssm set agrinova-backend AppDirectory D:\agrinova\backend\current
```

Web service:

```powershell
nssm install agrinova-web powershell.exe "-ExecutionPolicy Bypass -File D:\agrinova\web\config\run-web.ps1"
nssm set agrinova-web AppDirectory D:\agrinova\web\current
```

## 5) Manual deploy commands

Backend:

```powershell
powershell -ExecutionPolicy Bypass -File D:\agrinova\deploy\deploy-backend.ps1 `
  -RepoOwner "<GITHUB_OWNER>" `
  -RepoName "<GITHUB_REPO>"
```

Web:

```powershell
powershell -ExecutionPolicy Bypass -File D:\agrinova\deploy\deploy-web.ps1 `
  -RepoOwner "<GITHUB_OWNER>" `
  -RepoName "<GITHUB_REPO>"
```

Specific version examples:

```powershell
.\deploy-backend.ps1 -RepoOwner sardacarsih -RepoName AGRINOVA -ReleaseTag backend/v1.2.3
.\deploy-web.ps1 -RepoOwner sardacarsih -RepoName AGRINOVA -ReleaseTag web/v1.2.3
```

## 6) Scheduler setup

Create separate tasks so each component can deploy independently.

Backend task:

```powershell
schtasks /Create /SC MINUTE /MO 5 /TN "AgrinovaAutoDeployBackend" /TR "powershell -ExecutionPolicy Bypass -File D:\agrinova\deploy\deploy-backend.ps1 -RepoOwner <GITHUB_OWNER> -RepoName <GITHUB_REPO>" /RU SYSTEM
```

Web task:

```powershell
schtasks /Create /SC MINUTE /MO 5 /TN "AgrinovaAutoDeployWeb" /TR "powershell -ExecutionPolicy Bypass -File D:\agrinova\deploy\deploy-web.ps1 -RepoOwner <GITHUB_OWNER> -RepoName <GITHUB_REPO>" /RU SYSTEM
```

## 7) State and logs

- Backend deployed version: `D:\agrinova\deploy\state\backend-deployed-version.txt`
- Web deployed version: `D:\agrinova\deploy\state\web-deployed-version.txt`
- Logs:
  - `D:\agrinova\deploy\logs\deploy_backend_*.log`
  - `D:\agrinova\deploy\logs\deploy_web_*.log`

## 8) Troubleshooting

1. `AGRINOVA_GH_TOKEN is not set`
- Set machine environment variable and restart task host/service host.

2. Release not found
- Ensure tag prefix is correct:
  - `backend/v...` for backend
  - `web/v...` for web

3. Asset not found
- Backend expects `agrinova-backend-*.zip`
- Web expects `agrinova-web-standalone-*.zip`

4. Backend health check fails
- Check `http://127.0.0.1:8080/health`
- Check service `agrinova-backend` logs.

5. Web health check fails
- Check `http://127.0.0.1:3000`
- Check service `agrinova-web` logs.
