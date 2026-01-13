import { test, expect, Page } from "@playwright/test";

// Helper to create authenticated session
async function authenticateUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(workspace|w)\//);
}

test.describe("Realtime Messages", () => {
  test.describe.configure({ mode: "serial" });

  test("two users can see each other's messages in real-time", async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const userAPage = await userAContext.newPage();
    const userBPage = await userBContext.newPage();

    try {
      // Login both users
      await authenticateUser(userAPage, "user-a@test.com", "password123");
      await authenticateUser(userBPage, "user-b@test.com", "password123");

      // Both users navigate to the same channel
      const channelUrl = "/w/test-workspace-id/test-channel-id";
      await userAPage.goto(channelUrl);
      await userBPage.goto(channelUrl);

      // Wait for both pages to load
      await userAPage.waitForSelector('[data-testid="message-input"]');
      await userBPage.waitForSelector('[data-testid="message-input"]');

      // User A sends a message
      const testMessage = `Test message ${Date.now()}`;
      await userAPage.fill('[data-testid="message-input"] input', testMessage);
      await userAPage.click('[data-testid="message-input"] button[type="submit"]');

      // Verify message appears in User A's view (optimistic)
      await expect(userAPage.getByText(testMessage)).toBeVisible();

      // Verify message appears in User B's view within 2 seconds (realtime)
      await expect(userBPage.getByText(testMessage)).toBeVisible({
        timeout: 2000,
      });
    } finally {
      await userAContext.close();
      await userBContext.close();
    }
  });

  test("optimistic message rolls back on network failure", async ({ page }) => {
    await authenticateUser(page, "user-a@test.com", "password123");
    await page.goto("/w/test-workspace-id/test-channel-id");
    await page.waitForSelector('[data-testid="message-input"]');

    // Intercept and fail the message send request
    await page.route("**/rest/v1/messages*", (route) => {
      route.abort("failed");
    });

    // Send a message
    const testMessage = `Failing message ${Date.now()}`;
    await page.fill('[data-testid="message-input"] input', testMessage);
    await page.click('[data-testid="message-input"] button[type="submit"]');

    // Optimistic message should appear
    await expect(page.getByText(testMessage)).toBeVisible();

    // Wait for the message to be rolled back (removed)
    await expect(page.getByText(testMessage)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("messages update in real-time when edited", async ({ browser }) => {
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const userAPage = await userAContext.newPage();
    const userBPage = await userBContext.newPage();

    try {
      await authenticateUser(userAPage, "user-a@test.com", "password123");
      await authenticateUser(userBPage, "user-b@test.com", "password123");

      const channelUrl = "/w/test-workspace-id/test-channel-id";
      await userAPage.goto(channelUrl);
      await userBPage.goto(channelUrl);

      // User A sends a message
      const originalMessage = `Original ${Date.now()}`;
      await userAPage.fill('[data-testid="message-input"] input', originalMessage);
      await userAPage.click('[data-testid="message-input"] button[type="submit"]');

      // Wait for message to appear in both views
      await expect(userBPage.getByText(originalMessage)).toBeVisible({
        timeout: 2000,
      });

      // User A edits the message
      const editedMessage = `Edited ${Date.now()}`;
      await userAPage.click(
        `text="${originalMessage}" >> xpath=..//button[contains(@title, "Edit")]`
      );
      await userAPage.fill("textarea", editedMessage);
      await userAPage.click('button:has-text("Save")');

      // Verify edited message appears in User B's view
      await expect(userBPage.getByText(editedMessage)).toBeVisible({
        timeout: 2000,
      });
      await expect(userBPage.getByText(originalMessage)).not.toBeVisible();
    } finally {
      await userAContext.close();
      await userBContext.close();
    }
  });

  test("messages are removed in real-time when deleted", async ({ browser }) => {
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const userAPage = await userAContext.newPage();
    const userBPage = await userBContext.newPage();

    try {
      await authenticateUser(userAPage, "user-a@test.com", "password123");
      await authenticateUser(userBPage, "user-b@test.com", "password123");

      const channelUrl = "/w/test-workspace-id/test-channel-id";
      await userAPage.goto(channelUrl);
      await userBPage.goto(channelUrl);

      // User A sends a message
      const messageToDelete = `Delete me ${Date.now()}`;
      await userAPage.fill('[data-testid="message-input"] input', messageToDelete);
      await userAPage.click('[data-testid="message-input"] button[type="submit"]');

      // Wait for message to appear in User B's view
      await expect(userBPage.getByText(messageToDelete)).toBeVisible({
        timeout: 2000,
      });

      // User A deletes the message
      await userAPage.click(
        `text="${messageToDelete}" >> xpath=..//button[contains(@title, "Delete")]`
      );
      await userAPage.click('button:has-text("Confirm")');

      // Verify message is removed from User B's view
      await expect(userBPage.getByText(messageToDelete)).not.toBeVisible({
        timeout: 2000,
      });
    } finally {
      await userAContext.close();
      await userBContext.close();
    }
  });
});
