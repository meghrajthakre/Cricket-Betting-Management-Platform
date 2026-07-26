import { test, expect } from "@playwright/test";

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

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
      await new Promise((resolve) => setTimeout(resolve, 150));
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
