Install Paddle agent skills and MCP servers
Install the Paddle agent skills, then add the Paddle MCP servers in your AI editor.

Install Paddle agent skills
Agent skills are a standardized way to give AI agents instructions on how to integrate Paddle. They improve AI code accuracy by over 10% on average, and especially help smaller models write working code. Install our suite of agent skills using the skills CLI:

bash

npx skills add https://developer.paddle.com/
Install Paddle MCP servers
The Paddle MCP servers let AI agents interact with your Paddle account. It's critical to the integration process because it means the agent can create data and verify that your account is working properly. The Paddle docs MCP gives your agent full access to the Paddle developer documentation, so it doesn't rely on stale training data and can troubleshoot issues effectively. To install our MCP servers, open your AI editor's MCP settings and add:

Environment	Name	Type	URL
Sandbox	paddle-sandbox	http	https://sandbox-mcp.paddle.com/mcp
Live	paddle-live	http	https://mcp.paddle.com/mcp
Docs	paddle-docs	http	https://paddlehq.mcp.kapa.ai
For full setup instructions for Cursor, VS Code, Mistral Vibe, and others, see: 
https://developer.paddle.com/sdks/ai/paddle-mcp/