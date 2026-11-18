// Runs on EAS before installing dependencies (package.json "eas-build-pre-install").
// A production build must know where the API is, over HTTPS — otherwise testers
// would get an app that can't connect, which is much harder to spot than a
// failed build.
const profile = process.env.EAS_BUILD_PROFILE;
const url = process.env.EXPO_PUBLIC_API_URL ?? '';

if (profile === 'production' || profile === 'preview') {
  if (!url.startsWith('https://')) {
    console.error(
      `\n✖ EXPO_PUBLIC_API_URL must be an https:// URL for the "${profile}" build (got "${url || 'nothing'}").\n` +
        `  Set it with: eas env:create --environment ${profile} --name EXPO_PUBLIC_API_URL --value https://…/api/v1 --visibility plaintext\n`,
    );
    process.exit(1);
  }
  console.log(`✓ API for this build: ${url}`);
}
