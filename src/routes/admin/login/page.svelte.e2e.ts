import { expect, test } from '@playwright/test';

test.describe('Admin Login Flow', () => {
	test('should redirect to login when accessing protected route without session', async ({ page }) => {
		await page.goto('/admin');
		await expect(page).toHaveURL('/admin/login');
		await expect(page.locator('h2')).toContainText('Admin Login');
	});

	test('should show error with invalid credentials', async ({ page }) => {
		await page.goto('/admin/login');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'wrongpassword');
		await page.click('button[type="submit"]');

		await expect(page.locator('text=Invalid credentials')).toBeVisible();
	});

	test('should login successfully with valid credentials and redirect to dashboard', async ({
		page
	}) => {
		await page.goto('/admin/login');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/admin');
		await expect(page.locator('h1')).toContainText('Admin Dashboard');
		await expect(page.locator('text=Logged in as: admin')).toBeVisible();
	});

	test('should logout successfully and redirect to login', async ({ page }) => {
		// First login
		await page.goto('/admin/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/admin');

		// Then logout
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/admin/login');
		await expect(page.locator('h2')).toContainText('Admin Login');
	});

	test('should require both username and password', async ({ page }) => {
		await page.goto('/admin/login');

		await page.click('button[type="submit"]');

		// Browser validation should prevent submission
		const usernameInput = page.locator('input[name="username"]');
		const passwordInput = page.locator('input[name="password"]');

		await expect(usernameInput).toHaveAttribute('required');
		await expect(passwordInput).toHaveAttribute('required');
	});
});
