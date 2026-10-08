import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
	await page.goto('/admin/login');
	await page.fill('input[name="username"]', 'admin');
	await page.fill('input[name="password"]', 'password123');
	await page.locator('form').evaluate((form) => (form as HTMLFormElement).submit());
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL('/admin');
}

// Creates a quiz with a single MCQ question but leaves it in draft status.
async function createDraftQuizWithQuestion(page: Page, title: string) {
	await page.goto('/admin/quizzes/new');
	await page.fill('input[name="title"]', title);
	await page.fill('textarea[name="description"]', 'Draft quiz for preview testing');
	await page.fill('input[name="maxParticipants"]', '100');
	await page.fill('input[name="maxAttempts"]', '1');
	await page.locator('form.space-y-6').evaluate((form) => (form as HTMLFormElement).submit());
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

	const quizId = page.url().match(/\/admin\/quizzes\/([^/]+)\/edit/)?.[1];
	if (!quizId) throw new Error('Failed to determine quiz id after creation');

	await page.click('[data-slot="tabs-trigger"]:has-text("Questions")');
	await page.waitForLoadState('networkidle');

	await page.click('button:has-text("Add Question")');
	await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible({ timeout: 5000 });

	await page.fill('textarea[name="text"]', 'What is 2 + 2?');
	await page.fill('input[placeholder="Option 1"]', '3');
	await page.fill('input[placeholder="Option 2"]', '4');
	await page.locator('[role="radio"]').nth(1).click();

	await page.click('button[type="submit"]:has-text("Add Question")');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('[data-slot="sheet-content"]')).toBeHidden({ timeout: 10000 });

	return quizId;
}

test.describe('Quiz preview', () => {
	test('admin can preview a draft quiz without recording an attempt', async ({ page }) => {
		await login(page);
		const title = `E2E Preview Quiz ${Date.now()}`;
		const quizId = await createDraftQuizWithQuestion(page, title);

		// Preview entry point from the editor header opens the public flow in a new tab.
		const previewLink = page.locator('a:has-text("Preview")');
		await expect(previewLink).toHaveAttribute('href', `/quiz/${quizId}?preview=1`);

		// Draft quiz stays previewable for the owner.
		await page.goto(`/quiz/${quizId}?preview=1`);
		await expect(page.locator('body')).toContainText(title);
		await expect(page.locator('body')).toContainText('Preview mode');

		await page.click('button[type="submit"]:has-text("Start Quiz")');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/quiz/${quizId}/take`);
		await expect(page.locator('body')).toContainText('Preview mode');

		await page.click('label:has-text("4")');
		await page.click('button:has-text("Submit Quiz")');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}/results/preview-.+`));
		await expect(page.locator('body')).toContainText('Quiz Complete');
		await expect(page.locator('body')).toContainText('1 out of 1');
		await expect(page.locator('body')).toContainText('not recorded');

		// The preview submission must not appear as a real attempt.
		await page.goto('/admin/quizzes');
		const row = page.locator('tr', { hasText: title });
		await expect(row.locator('td').nth(3)).toHaveText('0');
	});

	test('preview results are not visible after logout', async ({ page }) => {
		await login(page);
		const title = `E2E Preview Logout Quiz ${Date.now()}`;
		const quizId = await createDraftQuizWithQuestion(page, title);

		await page.goto(`/quiz/${quizId}?preview=1`);
		await page.click('button[type="submit"]:has-text("Start Quiz")');
		await page.waitForURL(`/quiz/${quizId}/take`);
		await page.click('label:has-text("4")');
		await page.click('button:has-text("Submit Quiz")');
		await page.waitForURL(new RegExp(`/quiz/${quizId}/results/preview-.+`));
		const resultsUrl = page.url();

		await page.goto('/admin/logout');
		const response = await page.goto(resultsUrl);
		expect(response?.status()).toBe(404);
	});

	test('anonymous visitors cannot preview a draft quiz', async ({ page }) => {
		await login(page);
		const title = `E2E Preview Guard Quiz ${Date.now()}`;
		const quizId = await createDraftQuizWithQuestion(page, title);

		await page.goto('/admin/logout');
		await page.goto(`/quiz/${quizId}?preview=1`);
		await expect(page.locator('body')).toContainText('not currently active');
		await expect(page.locator('body')).not.toContainText('Preview mode');
	});
});
