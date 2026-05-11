#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

let version = "1.4.0";
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    version = pkg.version;
} catch (e) {
    // Fallback to default version if package.json not found in cwd
}

console.log(`
[AgentPay] v${version} Initializer
─────────────────────────────────────────────
`);

const ENV_TEMPLATE = `AGENT_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
RPC_URL=https://sepolia.base.org
`;

const GITIGNORE_TEMPLATE = `node_modules
dist
.env
.agentpay-state-*.json
`;

const SAMPLE_CODE = `import "dotenv/config";
import { AgentWallet, policy } from "@starrohan/agentpay";

async function main() {
  const agent = new AgentWallet({
    privateKey: process.env.AGENT_PRIVATE_KEY as \`0x\${string}\`,
    agentId: "my-first-agent",
    policy: policy().maxTx(0.001).dailyLimit(0.01).build()
  });

  await agent.init();

  const bal = await agent.balance();
  console.log("Agent balance:", bal, "ETH");

  await agent.summary();
}

main().catch(console.error);
`;

function writeIfMissing(filename, content) {
    const fullPath = path.join(process.cwd(), filename);
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Created ${filename}`);
    } else {
        console.log(`ℹ️  ${filename} already exists, skipping.`);
    }
}

async function initProject() {
    try {
        writeIfMissing('.env', ENV_TEMPLATE);
        writeIfMissing('.gitignore', GITIGNORE_TEMPLATE);
        writeIfMissing('agent.ts', SAMPLE_CODE);

        console.log(`
─────────────────────────────────────────────
🚀 Setup complete!

Next steps:
1. Add your private key to .env
2. Run 'npx tsx agent.ts'

Build the future of autonomous agents.
`);
    } catch (err) {
        console.error('❌ Setup failed:', err.message);
    }
}

const command = process.argv[2];

if (command === 'mcp') {
    // Dynamically import the MCP server to avoid loading it during project init
    import('../dist/mcp/server.js').catch(err => {
        console.error('❌ Failed to start MCP server. Have you run "npm run build"?');
        console.error(err.message);
        process.exit(1);
    });
} else {
    initProject();
}
