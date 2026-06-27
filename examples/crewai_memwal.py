#!/usr/bin/env python3
"""
Minimal CrewAI-style MCP client example (Phase 17 / optional).
Calls memwal-agent-memory via stdio MCP — remember then recall.

Requires: pip install mcp (or use any MCP stdio client)
Run from repo root after: pnpm mcp:build
"""
from __future__ import annotations

import asyncio
import json
import os
import sys

# Adjust path to your MCP CLI entry
MCP_CMD = os.environ.get("MEMWAL_MCP_CMD", "pnpm")
MCP_ARGS = os.environ.get("MEMWAL_MCP_ARGS", "exec tsx packages/mcp/src/cli.ts --transport stdio").split()


async def main() -> None:
    try:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
    except ImportError:
        print("Install MCP Python SDK: pip install mcp", file=sys.stderr)
        sys.exit(1)

    env = {
        **os.environ,
        "MEMWAL_NAMESPACE": "crewai-example",
        "MEMWAL_MCP_USE_MEMORY": "1",
        "MEMWAL_MCP_MOCK_DURABLE": "1",
    }
    server = StdioServerParameters(command=MCP_CMD, args=MCP_ARGS, env=env)

    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print(f"Tools: {[t.name for t in tools.tools]}")

            remembered = await session.call_tool(
                "remember",
                {"content": "CrewAI agent prefers Walrus hybrid memory for verifiable recall."},
            )
            text = remembered.content[0].text if remembered.content else "{}"
            print("remember:", text)

            recalled = await session.call_tool("recall", {"query": "Walrus hybrid", "limit": 3})
            print("recall:", recalled.content[0].text if recalled.content else "{}")


if __name__ == "__main__":
    asyncio.run(main())
