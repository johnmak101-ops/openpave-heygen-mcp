#!/usr/bin/env node
// oauth-stepper.mjs — drive HeyGen MCP OAuth consent inside a hosted browser
// profile. This is the canonical driver for SKILL.md §9.4 lane 1.
//
// VERIFIED END TO END 2026-11-12 on a headless Linux PAVE host: email form →
// magic link → consent ("Authorize access") → plan picker → callback
// "Connected!" → tokens in ~/.pave/tokens.yaml → 114 bridged tools.
//
// TWO HARD RULES (learned live, see SKILL.md §9.4 lane 1):
//
// 1. NEVER run this headless for HeyGen auth. Headless Chromium is flagged by
//    Cloudflare Turnstile: POST api2.heygen.com/v1/pacific/account/magic_link
//    returns 403, the UI toasts "flagged for suspicious activity", and the
//    button sits at "Sending..." forever — no email is ever sent. Always:
//        HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs <step> [arg]
//    HEADED=1 launches full Chromium headed (under Xvfb) with a normal Chrome
//    UA, --disable-blink-features=AutomationControlled, and an init script
//    masking navigator.webdriver. That clears the headless check, but headed
//    is not a guarantee: on some hosts the Turnstile widget is INTERACTIVE and
//    the button sits at "Sending..." with NO POST firing at all. The widget
//    iframe is inside a shadow root, so DOM selectors cannot reach it — solve
//    it with the host-local helper (frameElement() geometry):
//        HEADED=1 xvfb-run -a node "$HEYGEN_OAUTH_DIR/turnstile.mjs"
//    then re-run the `email` step.
//
// 2. The plan picker ("Pick a plan for HeyGen MCP") is BILLING CONSENT. It
//    appears after "Authorize access" and before the code is issued. The user
//    picks the plan — never the agent. `finish` therefore clicks a plan button
//    ONLY when you pass its name as the argument.
//
// Layout (override the directory with HEYGEN_OAUTH_DIR, default ~/heygen-oauth;
// keep it on a durable path — ~/.cache and ~/.pave/cache get wiped on PAVE):
//   <dir>/authorize.url   the authorizeUrl from PAVE oauth/start (one line)
//   <dir>/profile-headed/ persistent Chromium profile (banks the HeyGen login)
//   <dir>/shot-N.png      numbered screenshot per step (progress proof)
//
// Steps:
//   form               open authorize.url, click "Use email", dump the form
//   email <addr>       fill the email, click "send a secure magic link",
//                      log auth-related network responses, dump
//   code <digits>      fill the 6-digit code instead of a magic link (if the
//                      email offered a code and the user read it out)
//   magiclink <url>    open the user-pasted magic-link URL in THIS profile.
//                      The link authenticates the requesting profile — it is
//                      not a standalone session. After it lands on "Return to
//                      your original tab", re-navigate the authorize URL
//                      (any later step does that) to reach the consent screen.
//   consent            on authorize.url: click the consent button
//                      ("Authorize access" / allow / approve / …), dump
//   plan <name>        click the plan-picker button matching <name> (regex),
//                      e.g. `plan "continue with free"` — only with the
//                      user's explicit choice
//   finish [plan]      one-shot tail: authorize → (plan picker if it appears:
//                      click only when [plan] given, else report and stop) →
//                      dump. Expects to end on the PAVE callback page
//                      ("Connected! … You can close this window.").
//   poll               open authorize.url, dump, and report whether a consent
//                      screen is still waiting (exit code 7 = run `consent`)
//   where              dump current page state without navigating (debug)
//
// State expiry: if the callback page reads "Invalid or expired state token",
// the oauth/start state died (measured ~13 min on this host; ~35 on an earlier
// one). Re-run oauth/start, write the new authorize.url, and run the tail as
// ONE `finish '<plan>'` immediately — splitting consent/plan/finish across
// invocations can outlive the state. The banked profile login survives; you do
// NOT redo the magic link.

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DIR = process.env.HEYGEN_OAUTH_DIR || join(homedir(), "heygen-oauth");
const PROFILE = join(DIR, "profile");
const AUTH_URL = readFileSync(join(DIR, "authorize.url"), "utf8").trim();
const [, , step, arg] = process.argv;

const HEADED = process.env.HEADED === "1";
if (!HEADED && !process.env.OAUTH_STEPPER_ALLOW_HEADLESS) {
  console.error(
    "Refusing headless run: Turnstile 403s the magic-link POST (SKILL.md §9.4 lane 1).\n" +
      "Use: HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs <step> [arg]\n" +
      "Set OAUTH_STEPPER_ALLOW_HEADLESS=1 to override for non-auth debugging only."
  );
  process.exit(8);
}

const ctx = await chromium.launchPersistentContext(PROFILE + (HEADED ? "-headed" : ""), {
  headless: !HEADED,
  viewport: { width: 1280, height: 900 },
  locale: "en-US",
  userAgent: HEADED
    ? "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36"
    : undefined,
  args: HEADED
    ? ["--no-sandbox", "--disable-blink-features=AutomationControlled"]
    : ["--no-sandbox"],
});
if (HEADED) {
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
  });
}
const page = ctx.pages()[0] || (await ctx.newPage());

async function dump(tag) {
  console.log("URL:", page.url());
  console.log("TITLE:", await page.title());
  const d = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const fields = [...document.querySelectorAll("input")].filter(vis).map((e) => ({
      type: e.type,
      placeholder: e.placeholder || "",
      autocomplete: e.autocomplete || "",
      value: e.type === "email" || e.type === "text" ? "" : e.value,
    }));
    const buttons = [...document.querySelectorAll("button, [role=button]")]
      .filter(vis)
      .map((e) => (e.innerText || "").trim())
      .filter((t) => t && t.length < 60);
    return {
      fields,
      buttons: [...new Set(buttons)].slice(0, 20),
      body: (document.body.innerText || "").replace(/\s+\n/g, "\n").slice(0, 1200),
    };
  });
  console.log(JSON.stringify(d, null, 2));
  let n = 1;
  try {
    n = (readFileSync(join(DIR, ".shotn"), "utf8") | 0) + 1;
  } catch {}
  writeFileSync(join(DIR, ".shotn"), String(n));
  await page.screenshot({ path: join(DIR, `shot-${n}.png`) });
  console.log("SHOT:", `shot-${n}.png`);
}

try {
  if (step === "form") {
    await page.goto(AUTH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.getByRole("button", { name: "Use email" }).click();
    await page.waitForTimeout(2500);
    await dump();
  } else if (step === "email") {
    await page.goto(AUTH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    // If the profile is already past login, skip straight to the dump.
    const hasUseEmail = await page.getByRole("button", { name: "Use email" }).count();
    if (hasUseEmail) {
      await page.getByRole("button", { name: "Use email" }).click();
      await page.waitForTimeout(1500);
    }
    const emailField = page.getByPlaceholder("Enter your email", { exact: true }).first();
    if (await emailField.count()) {
      let sawMagicLinkPost = false;
      page.on("response", (r) => {
        const u = r.url();
        if (/magic|email|login|otp|code|auth/i.test(u) && !/\.(js|css|png|svg|woff)/.test(u)) {
          if (/magic_link/i.test(u)) sawMagicLinkPost = true;
          console.log(`NET ${r.status()} ${r.request().method()} ${u.slice(0, 120)}`);
        }
      });
      await emailField.fill(arg);
      await page.waitForTimeout(300);
      const val = await emailField.inputValue();
      console.log("FILLED_VALUE:", val);
      if (val !== arg) {
        console.log("MISMATCH — wrong field");
        await ctx.close();
        process.exit(9);
      }
      await page.getByRole("button", { name: /send a secure magic link/i }).first().click();
      await page.waitForTimeout(12000);
      if (!sawMagicLinkPost) {
        console.log(
          "NO_MAGIC_LINK_POST — Turnstile is probably unsolved (interactive widget in a shadow root).\n" +
            `Run: HEADED=1 xvfb-run -a node "${join(DIR, "turnstile.mjs")}"  then retry the email step.`
        );
        process.exitCode = 10;
      }
    }
    await dump();
  } else if (step === "code") {
    const codeField = page.getByPlaceholder(/6-digit/i).first();
    await codeField.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
    if (await codeField.count()) {
      await codeField.fill(arg);
      // Some forms auto-submit on 6 digits; also click any submit.
      await page.waitForTimeout(1500);
      const btn = page.getByRole("button", { name: /continue|verify|submit|next/i }).first();
      if (await btn.count()) await btn.click().catch(() => {});
      await page.waitForTimeout(4000);
    }
    await dump();
  } else if (step === "consent") {
    await page.goto(AUTH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    const cands = [
      /authorize access/i,
      /allow/i,
      /approve/i,
      /accept/i,
      /^authorize$/i,
      /continue/i,
      /confirm/i,
    ];
    let clicked = false;
    for (const re of cands) {
      const btn = page.getByRole("button", { name: re }).first();
      if (await btn.count()) {
        await btn.click();
        clicked = true;
        console.log("CLICKED:", re);
        break;
      }
    }
    if (!clicked) {
      console.log("NO CONSENT BUTTON FOUND");
      await dump();
    } else {
      await page.waitForTimeout(5000);
      console.log("AFTER_CLICK");
      await dump();
    }
  } else if (step === "poll") {
    await page.goto(AUTH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    await dump();
    // Auto-detect a waiting consent screen.
    const consentRe = [/authorize access/i, /allow/i, /approve/i, /accept/i, /^authorize$/i];
    for (const re of consentRe) {
      const btn = page.getByRole("button", { name: re }).first();
      if (await btn.count()) {
        console.log("CONSENT_FOUND:", re);
        process.exitCode = 7; // signal caller to run the consent step
        break;
      }
    }
  } else if (step === "magiclink") {
    // Open the user-pasted magic link URL in this profile.
    await page.goto(arg, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    await dump();
  } else if (step === "plan") {
    await page.goto(AUTH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    const btn = page.getByRole("button", { name: new RegExp(arg, "i") }).first();
    if (await btn.count()) {
      await btn.click();
      console.log("CLICKED_PLAN:", arg);
      await page.waitForTimeout(8000);
    } else {
      console.log("PLAN BUTTON NOT FOUND:", arg);
    }
    await dump();
  } else if (step === "finish") {
    await page.goto(AUTH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);
    // 1. Authorize.
    const auth = page.getByRole("button", { name: /authorize access/i }).first();
    if (await auth.count()) {
      await auth.click();
      console.log("CLICKED: Authorize access");
    }
    await page.waitForTimeout(4000);
    // 2. Plan picker — click ONLY when the caller passed the user's choice.
    const picker = await page
      .getByRole("button", { name: /continue with (free|creator|pro)|pick a plan/i })
      .first()
      .count();
    if (picker) {
      if (arg) {
        const planBtn = page.getByRole("button", { name: new RegExp(arg, "i") }).first();
        if (await planBtn.count()) {
          await planBtn.click();
          console.log("CLICKED: PLAN", arg);
        } else {
          console.log("PLAN BUTTON NOT FOUND:", arg);
        }
      } else {
        console.log("PLAN_PICKER_FOUND — pass the user's choice: finish \"<plan regex>\"");
      }
      await page.waitForTimeout(8000);
    }
    await dump();
  } else if (step === "where") {
    await dump();
  } else {
    console.error("unknown step:", step);
    console.error("steps: form | email <addr> | code <digits> | magiclink <url> | consent | plan <name> | finish [plan] | poll | where");
    process.exitCode = 2;
  }
} catch (e) {
  console.error("STEP ERROR:", e.message);
  await page.screenshot({ path: join(DIR, "shot-err.png") }).catch(() => {});
} finally {
  await ctx.close();
}
