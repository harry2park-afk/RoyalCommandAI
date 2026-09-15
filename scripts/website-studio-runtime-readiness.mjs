// Only presence flags, never values. No service calls or customer data access.
const diagnosticBranches = new Set([
  "studio-work/runtime-20260914-7438370",
  "studio-work/runtime-tracing-20260914-7438370",
]);
if (process.env.VERCEL_ENV === "preview" && diagnosticBranches.has(process.env.VERCEL_GIT_COMMIT_REF)) {
  const names = ["OPENAI_API_KEY", "GITHUB_TOKEN", "VERCEL_OIDC_TOKEN", "VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_ORG_ID",
    "VERCEL_AUTOMATION_BYPASS_SECRET", "STUDIO_TEST_DATABASE_URL", "STUDIO_ARTIFACT_ENCRYPTION_KEY", "STUDIO_TEST_AUTOMATION_BYPASS_SECRET", "STUDIO_V2_ENABLED"];
  console.log("STUDIO_RUNTIME_CONFIG " + JSON.stringify(Object.fromEntries(names.map(name => [name, Boolean(process.env[name])]))));
}
