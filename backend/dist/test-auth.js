/**
 * Smoke-test auth endpoints against a running backend (default :4000).
 * Usage: npm run test --prefix backend
 */
const API = process.env.API_URL ?? "http://localhost:4000";
const email = `test-${Date.now()}@example.com`;
const password = "TestPass1";
async function req(path, init) {
    const res = await fetch(`${API}${path}`, {
        headers: { "Content-Type": "application/json", ...init?.headers },
        ...init,
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
}
function assert(cond, msg) {
    if (!cond)
        throw new Error(msg);
}
async function main() {
    console.log("Testing auth at", API);
    const health = await req("/health");
    assert(health.status === 200 && health.body.ok, "health check failed");
    const reg = await req("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name: "Test User" }),
    });
    assert(reg.status === 201 && reg.body.token, `register failed: ${JSON.stringify(reg.body)}`);
    const token = reg.body.token;
    console.log("✓ register");
    const me = await req("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert(me.status === 200 && me.body.user?.email === email, "me failed");
    console.log("✓ me");
    const badLogin = await req("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: "wrong" }),
    });
    assert(badLogin.status === 401, "bad login should 401");
    console.log("✓ bad login rejected");
    const login = await req("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    assert(login.status === 200 && login.body.token, "login failed");
    console.log("✓ login");
    const forgot = await req("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
    assert(forgot.status === 200, "forgot-password failed");
    const devLink = forgot.body.devResetLink;
    assert(devLink, "expected devResetLink in development");
    const resetToken = new URL(devLink).searchParams.get("token");
    assert(resetToken, "missing reset token in dev link");
    console.log("✓ forgot-password");
    const reset = await req("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password: "NewPass2" }),
    });
    assert(reset.status === 200 && reset.body.token, "reset-password failed");
    console.log("✓ reset-password");
    const logout = await req("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${reset.body.token}` },
    });
    assert(logout.status === 200, "logout failed");
    console.log("✓ logout");
    console.log("\nAll auth tests passed.");
}
main().catch((err) => {
    console.error("\nAuth test failed:", err.message);
    process.exit(1);
});
export {};
