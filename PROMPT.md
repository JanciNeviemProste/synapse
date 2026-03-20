You are about to build a complete production system called "Synapse System". 

Read the file SYNAPSE-SYSTEM-FINAL.md in this directory. It is a comprehensive implementation brief written in Slovak — you must understand every section before writing any code.

Your mission:
1. Read the ENTIRE brief first. Do not skip any section.
2. Start with STEP 0: audit the existing AI Coder code in ./aicoder/ directory. Write a short audit summary.
3. Then proceed step by step (KROK 1 through KROK 7) exactly as defined in the brief.
4. Each module must be fully functional before moving to the next one.
5. Write production-ready TypeScript code — no placeholders, no TODO comments, no dummy implementations.
6. Use NestJS Logger for all logging. Use class-validator for all DTOs. Use proper try/catch error handling everywhere.
7. After completing each step, write a short summary of what was implemented and what is ready to test.
8. At the very end, verify the project compiles and list any environment variables that need to be configured.

Critical constraints:
- No Docker, no Redis, no Python, no monorepo
- No emoji icons on generated websites — use Lucide Icons and Unsplash photos
- Telegram inline keyboards (grammy InlineKeyboard) for all lead-related messages
- All AI text generation uses Anthropic API with model claude-sonnet-4-20250514
- The existing AI Coder in ./aicoder/ must be preserved and integrated, not rewritten from scratch
- PostgreSQL with Prisma ORM — follow the exact schema from the brief
- EJS templates with Tailwind CSS CDN for all web frontend views
- Environment is Windows with PowerShell — ensure all file paths and commands are compatible

Begin now. Start by reading SYNAPSE-SYSTEM-FINAL.md, then audit ./aicoder/.
