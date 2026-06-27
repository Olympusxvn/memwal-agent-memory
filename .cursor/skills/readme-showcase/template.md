# README template skeleton

Copy and replace `{{PLACEHOLDERS}}`.

```markdown
<div align="center">

# 🧠 {{PROJECT_NAME}}

### *{{TAGLINE_ITALIC}}*

**{{SUBTITLE_MIDDLE_DOT}}**

<br />

[![Event](https://img.shields.io/badge/{{EVENT}}-{{YEAR}}-COLOR?style=for-the-badge)]({{EVENT_URL}})
[![Track](https://img.shields.io/badge/{{TRACK}}-LABEL-COLOR?style=for-the-badge)]({{TRACK_URL}})
[![Status](https://img.shields.io/badge/Submission-Ready-brightgreen?style=for-the-badge)](SUBMISSION.md)

<br />

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Host-000?style=for-the-badge&logo=vercel&logoColor=white)]({{LIVE_URL}})
[![Doc Hub](https://img.shields.io/badge/📚_Doc_Hub-Judges-00f5ff?style=for-the-badge)]({{DOC_HUB_URL}})
[![Judge Guide](https://img.shields.io/badge/⚖️_Judge_Guide-5--10_min-4ade80?style=for-the-badge)](JUDGE_GUIDE.md)
[![GitHub](https://img.shields.io/badge/GitHub-{{REPO_SLUG}}-181717?style=for-the-badge&logo=github)]({{GITHUB_URL}})

<br />

[![TypeScript](https://img.shields.io/badge/TypeScript-{{TS_VER}}-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

<br />

> **New here?** {{ONE_LINE_POINTER}}

<br />

```
{{ASCII_FLOW_BOX}}
```

</div>

---

## 📑 Contents

| | |
|:---|:---|
| ⚖️ | [For judges](#-for-judges--5-min-verify) |
| 🏗️ | [Overview](#-overview) |
| ⚡ | [Quick start](#-quick-start) |
| 📚 | [Documentation](#-documentation) |

---

<div align="center">

## ⚖️ For judges — 5 min verify

**{{NO_SECRETS_LINE}}**

</div>

```bash
{{VERIFY_COMMANDS}}
```

| 🔗 Resource | 📍 Link |
|:------------|:--------|
| **📚 Doc hub** | {{DOC_HUB_LINKS}} |
| **⚖️ Runbook** | [JUDGE_GUIDE.md](JUDGE_GUIDE.md) |

<details>
<summary><strong>📖 Open locally (Windows / macOS)</strong></summary>

| Platform | Command |
|:---------|:--------|
| **🌐 Live** | {{LIVE_DOC_HUB_URL}} |
| **🪟 Windows** | `start docs\doc-map.html` |
| **🍎 macOS** | `open docs/doc-map.html` |

</details>

---

## 🏗️ Overview

{{ONE_PARAGRAPH_VALUE_PROP}}

| Layer | Responsibility |
|:------|:---------------|
| **🖥️ Experience** | … |
| **🤖 Orchestration** | … |
| **💾 Hybrid memory** | … |
| **⛓️ Chain + storage** | … |

```mermaid
flowchart TB
  subgraph L1 [Experience]
    UI[Dashboard]
  end
  subgraph L2 [Orchestration]
    AG[Agents_MCP]
  end
  UI --> AG
```

---

## ⚡ Quick start

```bash
{{DEV_COMMANDS}}
```

---

## 📚 Documentation

| 📄 Document | 🎯 Purpose |
|:------------|:-----------|
| [JUDGE_GUIDE.md](JUDGE_GUIDE.md) | Runbook |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture |

---

<details>
<summary><strong>🔗 References</strong></summary>

| Resource | URL |
|:---------|:----|
| … | … |

</details>

---

<div align="center">

**{{PROJECT_NAME}}**

*{{TAGLINE_ITALIC}}*

[![Star on GitHub](https://img.shields.io/github/stars/{{ORG}}/{{REPO}}?style=social)](https://github.com/{{ORG}}/{{REPO}}/stargazers)

</div>
```
