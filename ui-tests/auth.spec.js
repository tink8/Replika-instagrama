const { test, expect } = require("@playwright/test");

test.describe("Auth UI", () => {
  // Podesavamo baseURL ako nije definisan u configu,
  // ali page.goto("/") koristi ono sto je u playwright.config.js

  test("login forma je prikazana pri ucitavanju stranice", async ({ page }) => {
    await page.goto("/");

    // Provera naslova
    await expect(page.getByText("Instagram")).toBeVisible();

    // Provera input polja (ispravljeni placeholderi)
    await expect(
      page.getByPlaceholder("Username or email address"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();

    // Provera dugmeta (ispravljen naziv "Log In" i koriscenje klase jer nema ID-ja)
    await expect(
      page.locator(".form-stack").getByRole("button", { name: "Log In" }),
    ).toBeVisible();
  });

  test("klik na Sign up vodi na register stranicu", async ({ page }) => {
    await page.goto("/");

    // Link "Sign up" se nalazi u auth-card-secondary sekciji
    await page.getByRole("link", { name: "Sign up" }).click();

    // Proveravamo da li je URL promenjen na /register
    await expect(page).toHaveURL(/.*register/);
  });

  test("korisnik moze da unese podatke u login formu", async ({ page }) => {
    await page.goto("/");

    // Hvatanje elemenata sa ispravnim placeholderom
    const usernameInput = page.getByPlaceholder("Username or email address");
    const passwordInput = page.getByPlaceholder("Password");

    // Unos podataka
    await usernameInput.fill("ana123");
    await passwordInput.fill("test123");

    // Provera da li su podaci uneti
    await expect(usernameInput).toHaveValue("ana123");
    await expect(passwordInput).toHaveValue("test123");
  });

  test("link za registraciju je vidljiv na login stranici", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });
});
