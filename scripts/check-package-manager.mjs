if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
  console.error('This project uses pnpm. Run pnpm install --frozen-lockfile instead.');
  process.exitCode = 1;
}
