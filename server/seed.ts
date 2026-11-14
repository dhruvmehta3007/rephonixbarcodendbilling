import { resetToCleanDatabase } from './reset-clean-db';

async function main() {
  await resetToCleanDatabase();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
