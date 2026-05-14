memwalpp
Data Flow (Quan trọng cho Demo)

1. Agent Turn → OpenClaw Hook → Local Scoring (agentmemory + memoirs) → Nếu đạt chất lượng → Push encrypted blob lên MemWal + Walrus.
2. Marketplace Listing → Tạo Sui Object (Memory NFT-like) + metadata trên Walrus.
3. Bounty Hunter Agent → Scan bounties (Sui) → Evaluate local → Mua memory → Integrate → Improve → Fork version mới (royalty cho creator gốc).
4. Verification → Judge xem cryptographic proof trên Walrus + performance metrics.





**Công nghệ Stack Chi Tiết**



|Layer|Repo/tool|Vai trò chính|
|-|-|-|
|Orchestration|NVIDIA/NemoClaw + OpenClaw|Sandbox + Agent Swarm|
|Durable Memory|MystenLabs/MemWal|Verifiable, encrypted, shareable|
|Local Cache \& Scoring|rohitg00/agentmemory + misaelzapata/memoirs|Quality gate, fast recall, curation<br />|
|Marketplace Logic<br />|Custom Move Contract (fork từ Sui examples)|Bounty, royalty, NFT-like memory<br />|
|Frontend/Dashboard<br />|Next.js / Tauri + Sui Wallet<br />|User interaction + Agent monitoring<br />|







**Cấu trúc thư mục đề xuất (Monorepo - 2026 Standard)**







memwalpp/				# Root

├── .github/                         # Workflows, issue templates

│   └── workflows/

├── apps/                            # Các ứng dụng runnable

│   ├── dashboard/                   # Frontend (Next.js / Tauri)

│   ├── agent-swarm/                 # NemoClaw / OpenClaw main runner

│   └── cli/                         # CLI tool (optional)

│

├── packages/                        # Shared libraries (internal)

│   ├── core/                        # Business logic cốt lõi

│   │   ├── src/

│   │   │   ├── memory/              # Memory operations

│   │   │   ├── marketplace/         # Listing, buying, bounty logic

│   │   │   ├── bounty/              # Bounty engine

│   │   │   ├── evolution/           # Versioning + forking

│   │   │   └── reputation/          # Scoring system

│   │   └── index.ts

│   │

│   ├── local-memory/                # Local layer

│   │   ├── src/

│   │   │   ├── agentmemory-adapter.ts

│   │   │   ├── memoirs-adapter.ts

│   │   │   └── quality-scorer.ts

│   │   └── package.json

│   │

│   ├── memwal-client/               # Wrapper cho MemWal + Walrus

│   │   ├── src/

│   │   │   ├── client.ts

│   │   │   ├── encryption.ts

│   │   │   ├── types.ts

│   │   │   └── hooks.ts

│   │   └── package.json

│   │

│   ├── sui-contracts/               # Move smart contracts

│   │   ├── sources/

│   │   │   ├── bounty.move

│   │   │   ├── memory\_nft.move

│   │   │   ├── marketplace.move

│   │   │   └── royalty.move

│   │   ├── tests/

│   │   └── Move.toml

│   │

│   ├── shared/                      # Types, utils, constants

│   │   ├── src/

│   │   │   ├── types.ts             # Global types (Memory, Bounty...)

│   │   │   ├── constants.ts

│   │   │   └── utils.ts

│   │   └── package.json

│   │

│   └── ui/                          # Shared UI components (nếu cần)

│

├── contracts/                       # (Alias hoặc symlink đến packages/sui-contracts)

├── docs/                            # Rất quan trọng cho Claude/Cursor

│   ├── architecture.md

│   ├── CLAUDE.md                    # ← Quan trọng nhất!

│   ├── AGENTS.md

│   ├── process/

│   │   └── plans/

│   └── specs/

│

├── scripts/                         # Build, deploy, test scripts

├── tools/                           # Dev tools, MCP servers

├── .claude/                         # Claude Code specific (skills, agents)

├── turbo.json                       # Turborepo config

├── pnpm-workspace.yaml

├── package.json

├── README.md

└── .env.example




Đây là danh sách repo phù hợp nhất cho kiến trúc Memory Marketplace + Bounty Agents của bạn (dành cho Sui Overflow 2026 - Walrus Track). Mình đã chọn lọc những repo thực tế, active và fit nhất với stack:



**1. Core Durable Storage (MemWal + Walrus)**

MystenLabs/MemWal → Repo chính thức, bắt buộc dùng

Link: https://github.com/MystenLabs/MemWal

Privacy-first AI memory layer trên Walrus, client-side encryption (SEAL), semantic search, verifiable. Có sẵn plugin cho OpenClaw/NemoClaw. Đây là nền tảng chính cho durable storage của bạn.



**2. Agent Orchestration Layer**

NVIDIA/NemoClaw (và các fork)

Link: https://github.com/NVIDIA/NemoClaw

Sandbox secure cho OpenClaw, rất mạnh về policy enforcement — cực hợp để chạy autonomous bounty hunter agents.

OpenClaw (core framework) — Tìm repo chính thức qua NemoClaw docs.



**3. Local Fast Cache + Quality Scoring Layer**



* **rohitg00/agentmemory** → Recommend mạnh nhất

Link: https://github.com/rohitg00/agentmemory

Persistent memory cho coding agents, MCP support, auto-capture, decay mechanism. Dùng làm local quality gate \& scoring trước khi push lên marketplace.

* **misaelzapata/memoirs** (từ các trao đổi trước)

Local SQLite + encryption + PII redaction + hybrid retrieval. Rất tốt cho curation \& offline fallback.



**4. Sui Move Smart Contract (Marketplace + Bounty + Royalty)**

* **sui-foundation/sui-move-intro-course** (Marketplace example)

Link: https://github.com/sui-foundation/sui-move-intro-course

Có full example marketplace contract (listing, buying, dynamic fields) — bạn có thể fork và mở rộng thành bounty + royalty + memory NFT.

* **gdanezis/sui-by-example**

Link: https://github.com/gdanezis/sui-by-example

Nhiều ví dụ Sui Rust SDK + Move contracts, hữu ích cho integration.



5\. Tham khảo Competitors (để differentiate)

* **zyronetdev/zyronet** (và các repo liên quan)

AI Agent Memory Marketplace trên Solana — xem để học model và tránh overlap.

* **MemoreumApp** repos — Marketplace nơi agents trade experience.



6\. Bonus Repo Hữu Ích

* **Awesome Agent Memory collections** (ví dụ: AgentMemoryWorld/Awesome-Agent-Memory) để tham khảo thêm kỹ thuật memory.
* Các repo Sui Move templates khác từ MystenLabs official examples.



#### Kiến trúc gợi ý dùng các repo này

* Frontend/Agent Runtime — NemoClaw/OpenClaw + MemWal plugin
* Durable/Verifiable — MemWal + Walrus
* Local Curation \& Scoring — agentmemory + memoirs
* Marketplace Logic — Custom Move contract (fork từ sui-foundation marketplace example) + royalty/fork mechanism
* Autonomous Agents — NemoClaw swarm agents tự scan bounty, evaluate (local), mua \& integrate memory





**Nên cài:**


 1. # Trong root project của bạn

curl -o .cursor/CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md



2\. Fission-AI/OpenSpec (Nên cài)Spec-driven development (SDD) — rất mạnh cho việc viết spec rõ ràng trước khi code.

Hữu ích cho dự án hackathon của bạn (bounty, marketplace, memory flow cần spec chặt chẽ).
Cài theo hướng dẫn trong repo (thường là copy folder hoặc dùng command của họ).



3\. midudev/autoskills (Cực kỳ recommend)Công cụ auto-detect tech stack và cài bộ skills phù hợp (Next.js, TypeScript, Sui Move, React, Turborepo…).

Rất tiện để bootstrap nhanh.

npx autoskills .



Khuyến nghị cách cài tổng thể (chuẩn Cursor 2026)



.cursor/

├── rules/              # Rules toàn cục (luôn load)

│   └── karpathy.mdc    # Convert CLAUDE.md sang .mdc nếu cần

├── skills/             # Dynamic skills

│   ├── karpathy/

│   ├── openspec/

│   └── autoskills-curated/

└── agents/             # Nếu có custom agents



Cách tốt nhất hiện nay:Chạy npx autoskills . trước (midudev).

Cài tay andrej-karpathy-skills và OpenSpec.

Nếu repo nào hỗ trợ skills.sh hoặc npx skillsadd owner/repo thì dùng luôn.















