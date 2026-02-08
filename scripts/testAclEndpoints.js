// Test ACL endpoints with a real login token
// Usage (PowerShell):
//   $env:API_URL="http://localhost:5001/api"; $env:TEST_EMAIL="admin@example.com"; $env:TEST_PASSWORD="AdminPass123!"; node scripts/testAclEndpoints.js
// Or set env vars in your shell/profile.

const BASE = process.env.API_URL || "http://localhost:5001/api";
const EMAIL = process.env.TEST_EMAIL || "";
const PASSWORD = process.env.TEST_PASSWORD || "";

async function main() {
  try {
    if (!EMAIL || !PASSWORD) {
      console.log("Please set TEST_EMAIL and TEST_PASSWORD env vars.");
      console.log("Example (PowerShell):");
      console.log(
        '$env:API_URL="http://localhost:5002/api"; $env:TEST_EMAIL="KommanderYassiradmin@gmail.com"; $env:TEST_PASSWORD="Manager123!"; node scripts/testAclEndpoints.js'
      );
      process.exit(1);
    }

    console.log("API base:", BASE);

    // 1) Login
    console.log("\n➡️  Logging in...");
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok || !loginJson?.success) {
      console.error("Login failed:", loginJson);
      process.exit(1);
    }
    const token = loginJson?.data?.token;
    if (!token) {
      console.error("No token in login response:", loginJson);
      process.exit(1);
    }
    console.log("✅ Logged in. User:", loginJson?.data?.user?.email);

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 2) GET job titles
    console.log("\n➡️  GET /acl/job-titles");
    const jtRes = await fetch(`${BASE}/acl/job-titles`, {
      headers: authHeaders,
    });
    const jtJson = await jtRes.json();
    console.log(
      "Status:",
      jtRes.status,
      "Count:",
      jtJson?.data?.jobTitles?.length || 0
    );

    // 3) GET job title bundles
    console.log("\n➡️  GET /acl/job-title-bundles");
    const jtbRes = await fetch(`${BASE}/acl/job-title-bundles`, {
      headers: authHeaders,
    });
    const jtbJson = await jtbRes.json();
    const jobTitles = jtbJson?.data?.jobTitles || [];
    console.log("Status:", jtbRes.status, "Titles:", jobTitles.length);

    // 4) GET permissions grouped
    console.log("\n➡️  GET /acl/permissions-grouped");
    const pgRes = await fetch(`${BASE}/acl/permissions-grouped`, {
      headers: authHeaders,
    });
    const pgJson = await pgRes.json();
    const domains = Object.keys(pgJson?.data?.grouped || {});
    console.log("Status:", pgRes.status, "Domains:", domains.length);

    // 5) POST compute with first job title (if any)
    if (jobTitles.length > 0) {
      console.log("\n➡️  POST /acl/compute");
      const computeRes = await fetch(`${BASE}/acl/compute`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ jobTitle: jobTitles[0], permissions: [] }),
      });
      const computeJson = await computeRes.json();
      console.log(
        "Status:",
        computeRes.status,
        "Base:",
        computeJson?.data?.base?.length || 0,
        "Effective:",
        computeJson?.data?.effective?.length || 0
      );
    } else {
      console.log("\nℹ️  No job titles available to test /acl/compute.");
    }

    console.log("\n✅ ACL endpoint smoke test completed.");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

// Node 18+ has global fetch
main();
