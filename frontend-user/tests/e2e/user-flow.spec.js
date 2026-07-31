import { test, expect } from "@playwright/test";

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const authenticatedUser = {
  _id: "user-1",
  username: "demo",
  firstName: "Demo",
  role: "user",
  coins: 1000,
};

async function seedAuthenticatedUser(page) {
  await page.addInitScript((user) => {
    if (sessionStorage.getItem("e2e-auth-seeded")) return;
    sessionStorage.setItem("e2e-auth-seeded", "true");
    localStorage.setItem("userAccessToken", "e2e-user-token");
    localStorage.setItem("auth-store", JSON.stringify({
      state: { user, isLoggedIn: true },
      version: 0,
    }));
    localStorage.setItem("coin-store", JSON.stringify({
      state: { coins: user.coins },
      version: 0,
    }));
  }, authenticatedUser);
}

async function mockMatchApis(page, {
  runners = [
    { runnerId: "a", runnerName: "Team A", lagai: 90, khai: 91, status: "open" },
    { runnerId: "b", runnerName: "Team B", lagai: 92, khai: 93, status: "open" },
  ],
  sessions = [],
  onPlaceBet,
  expireOnMyBets = false,
} = {}) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();

    if (path.endsWith("/manual/events")) return route.abort();
    if (path.endsWith("/manual/state/e2e-match")) {
      return json(route, { success: true, data: runners });
    }
    if (path.endsWith("/manual/settings/e2e-match")) {
      return json(route, {
        success: true,
        data: {
          betLock: false,
          sessionLock: false,
          marketStatus: "OPEN",
          rateDiff: 1,
        },
      });
    }
    if (path.endsWith("/manual/score/e2e-match")) {
      return json(route, {
        success: true,
        data: { status: "", runs: 0, wickets: 0, overs: 0 },
      });
    }
    if (path.endsWith("/session/e2e-match")) {
      return json(route, { success: true, data: { sessions } });
    }
    if (path.endsWith("/manual/options/e2e-match")) {
      return json(route, {
        success: true,
        data: {
          matchDelay: 1,
          matchMaxBet: 10000,
          sessionMaxBet: 10000,
        },
      });
    }
    if (path.endsWith("/matches/saved/e2e-match")) {
      return json(route, {
        success: true,
        data: { homeTeam: "Team A", awayTeam: "Team B" },
      });
    }
    if (path.endsWith("/bet/mine")) {
      return expireOnMyBets
        ? json(route, {
            success: false,
            error: "Session expired. Please log in again.",
          }, 401)
        : json(route, { success: true, data: [] });
    }
    if (path.endsWith("/wallet/user-1/balance")) {
      return json(route, { success: true, data: { balance: 1000 } });
    }
    if (path.endsWith("/bet/place") && onPlaceBet) {
      return onPlaceBet(route, request);
    }
    return json(route, { success: true, data: {} });
  });
}

test("user logs in and the explicit Bearer token is persisted", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (path.endsWith("/auth/login")) {
      return json(route, {
        success: true,
        data: {
          accessToken: "e2e-user-token",
          user: {
            _id: "user-1",
            username: "demo",
            firstName: "Demo",
            role: "user",
            coins: 1000,
            isActive: true,
          },
        },
      });
    }
    return json(route, { success: true, data: {} });
  });

  await page.goto("/login");
  const captcha = (await page.getByTestId("captcha-code").innerText()).replace(/\s/g, "");
  await page.getByPlaceholder("Username").fill("demo");
  await page.getByPlaceholder("Password").fill("password");
  await page.getByPlaceholder("Enter code").fill(captcha);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("userAccessToken")))
    .toBe("e2e-user-token");
});

test("authenticated user opens match odds and places a bet", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("userAccessToken", "e2e-user-token");
    localStorage.setItem("auth-store", JSON.stringify({
      state: {
        user: {
          _id: "user-1",
          username: "demo",
          firstName: "Demo",
          role: "user",
          coins: 1000,
        },
        isLoggedIn: true,
      },
      version: 0,
    }));
    localStorage.setItem("coin-store", JSON.stringify({
      state: { coins: 1000 },
      version: 0,
    }));
  });

  let placedBody;
  let releaseBetResponse;
  const betResponseGate = new Promise((resolve) => {
    releaseBetResponse = resolve;
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();

    if (path.endsWith("/manual/events")) return route.abort();
    if (path.endsWith("/manual/state/e2e-match")) {
      return json(route, { success: true, data: [
        { runnerId: "a", runnerName: "Team A", lagai: 90, khai: 91, status: "open" },
        { runnerId: "b", runnerName: "Team B", lagai: 92, khai: 93, status: "open" },
      ] });
    }
    if (path.endsWith("/manual/settings/e2e-match")) {
      return json(route, { success: true, data: {
        betLock: false, sessionLock: false, marketStatus: "OPEN", rateDiff: 1,
      } });
    }
    if (path.endsWith("/manual/score/e2e-match")) {
      return json(route, { success: true, data: { status: "", runs: 0, wickets: 0, overs: 0 } });
    }
    if (path.endsWith("/session/e2e-match")) {
      return json(route, { success: true, data: { sessions: [] } });
    }
    if (path.endsWith("/manual/options/e2e-match")) {
      return json(route, { success: true, data: {
        matchDelay: 1, matchMaxBet: 10000, sessionMaxBet: 10000,
      } });
    }
    if (path.endsWith("/matches/saved/e2e-match")) {
      return json(route, { success: true, data: { homeTeam: "Team A", awayTeam: "Team B" } });
    }
    if (path.endsWith("/bet/mine")) return json(route, { success: true, data: [] });
    if (path.endsWith("/wallet/user-1/balance")) {
      return json(route, { success: true, data: { balance: 1000 } });
    }
    if (path.endsWith("/bet/place")) {
      placedBody = request.postDataJSON();
      await betResponseGate;
      return json(route, {
        success: true,
        data: {
          _id: "bet-1",
          ...placedBody,
          profit: 90,
          loss: 100,
          status: "pending",
        },
        balance: 900,
      }, 201);
    }
    return json(route, { success: true, data: {} });
  });

  await page.goto("/match/e2e-match");
  await page.getByRole("button", { name: "90" }).click();
  await page.getByPlaceholder("Enter Coins").fill("100");
  await page.getByRole("button", { name: "DONE" }).click();

  await expect(page.getByText("BET PLACE HO RAHI HAI")).toBeVisible();
  releaseBetResponse();
  await expect(page.getByRole("heading", { name: "Bet Successfully Placed" })).toBeVisible();
  expect(placedBody).toMatchObject({
    matchId: "e2e-match",
    amount: 100,
    rate: 90,
    type: "yes",
    marketType: "match",
    marketId: "a",
  });
});

test("expired API session clears auth state and redirects to login", async ({ page }) => {
  await seedAuthenticatedUser(page);
  await mockMatchApis(page, { expireOnMyBets: true });

  await page.goto("/match/e2e-match");

  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(() =>
    page.evaluate(() => ({
      token: localStorage.getItem("userAccessToken"),
      auth: localStorage.getItem("auth-store"),
      coins: localStorage.getItem("coin-store"),
    }))
  ).toEqual({ token: null, auth: null, coins: null });
});

test("authenticated user places a YES session bet with run and session rate", async ({ page }) => {
  await seedAuthenticatedUser(page);

  let placedBody;
  await mockMatchApis(page, {
    sessions: [
      {
        id: "session-1",
        sessionName: "10 Over Runs",
        noRun: 50,
        noRate: 1,
        yesRun: 51,
        yesRate: 0.9,
        status: "open",
        isVisible: true,
      },
    ],
    onPlaceBet: (route, request) => {
      placedBody = request.postDataJSON();
      return json(route, {
        success: true,
        data: {
          _id: "session-bet-1",
          ...placedBody,
          profit: 90,
          loss: 100,
          status: "pending",
        },
        balance: 900,
      }, 201);
    },
  });

  await page.goto("/match/e2e-match");
  const sessionRow = page.getByRole("row").filter({ hasText: "10 Over Runs" });
  await sessionRow.getByRole("button").nth(1).click();
  await page.getByPlaceholder("Enter Coins").fill("100");
  await page.getByRole("button", { name: "DONE" }).click();

  await expect(
    page.getByRole("heading", { name: "Bet Successfully Placed" })
  ).toBeVisible();
  expect(placedBody).toMatchObject({
    matchId: "e2e-match",
    amount: 100,
    rate: 51,
    sessionRate: 0.9,
    type: "yes",
    marketType: "session",
    marketId: "session-1",
  });
});

test("suspended session displays zero rates and cannot open the bet slip", async ({ page }) => {
  await seedAuthenticatedUser(page);
  await mockMatchApis(page, {
    sessions: [
      {
        id: "session-1",
        sessionName: "10 Over Runs",
        noRun: 50,
        noRate: 1,
        yesRun: 51,
        yesRate: 0.9,
        status: "suspend",
        isVisible: true,
      },
    ],
  });

  await page.goto("/match/e2e-match");
  const sessionRow = page.getByRole("row").filter({ hasText: "10 Over Runs" });
  const noButton = sessionRow.getByRole("button").nth(0);
  const yesButton = sessionRow.getByRole("button").nth(1);

  await expect(noButton).toBeDisabled();
  await expect(yesButton).toBeDisabled();
  await expect(noButton).toContainText("0");
  await expect(yesButton).toContainText("0.0");
  await expect(page.getByPlaceholder("Enter Coins")).toHaveCount(0);
});
