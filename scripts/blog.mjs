#!/usr/bin/env node
// Public entrypoint; implementation is loaded read-only from the private source checkout.
const privateModule = new URL('../.private-engine/scripts/macca_engine/blog.mjs', import.meta.url);
try {
  await import(privateModule.href);
} catch (error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND' && String(error?.message || '').includes('macca_engine')) {
    console.error('Private editorial engine unavailable. Configure MACCA_ENGINE_DEPLOY_KEY and its checkout step.');
    process.exitCode = 1;
  } else {
    throw error;
  }
}
