import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
	await page.goto('/admin/login');
	await page.fill('input[name="username"]', 'admin');
	await page.fill('input[name="password"]', 'password123');
	await page.locator('form').evaluate((form) => (form as HTMLFormElement).submit());
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL('/admin');
}

async function createQuizWithQuestion(page: Page, title: string) {
	await page.goto('/admin/quizzes/new');
	await page.fill('input[name="title"]', title);
	await page.fill('textarea[name="description"]', 'End-to-end quiz flow test');
	await page.fill('input[name="maxParticipants"]', '100');
	await page.fill('input[name="maxAttempts"]', '1');
	await page.locator('form.space-y-6').evaluate((form) => (form as HTMLFormElement).submit());
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

	const quizId = page.url().match(/\/admin\/quizzes\/([^/]+)\/edit/)?.[1];
	if (!quizId) throw new Error('Failed to determine quiz id after creation');

	// Switch to Questions tab and add a single MCQ question.
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

	// Activate the quiz so it is publicly accessible.
	await page.goto('/admin/quizzes');
	const row = page.locator('tr', { hasText: title });
	await row.locator('[data-slot="dropdown-menu-trigger"]').click();
	await page.click('[data-slot="dropdown-menu-content"] button:has-text("Activate")');
	await page.waitForLoadState('networkidle');

	return quizId;
}

test.describe('Public quiz flow', () => {
	test('participant can access, take, and submit a quiz to see results', async ({ page }) => {
		await login(page);
		const title = `E2E Flow Quiz ${Date.now()}`;
		const quizId = await createQuizWithQuestion(page, title);

		// Log out of the admin session so we exercise the flow as an anonymous participant.
		await page.goto('/admin/logout');

		await page.goto(`/quiz/${quizId}`);
		await expect(page.locator('h1, [data-slot="card-title"]')).toContainText(title);

		// No intake fields configured by default, so submit the intake form directly.
		await page.click('button[type="submit"]:has-text("Start Quiz")');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/quiz/${quizId}/take`);

		// Answer the single question and submit.
		await page.click('label:has-text("4")');
		await page.click('button:has-text("Submit Quiz")');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(new RegExp(`/quiz/${quizId}/results/.+`));
		await expect(page.locator('body')).toContainText('Quiz Complete');
		await expect(page.locator('body')).toContainText('1 out of 1');
	});

	test('blocks access to an inactive (draft) quiz', async ({ page }) => {
		await login(page);
		const title = `E2E Draft Quiz ${Date.now()}`;
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', title);
		await page.fill('textarea[name="description"]', 'Should remain in draft');
		await page.fill('input[name="maxParticipants"]', '10');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.locator('form.space-y-6').evaluate((form) => (form as HTMLFormElement).submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);
		const quizId = page.url().match(/\/admin\/quizzes\/([^/]+)\/edit/)?.[1];

		await page.goto('/admin/logout');
		await page.goto(`/quiz/${quizId}`);
		await expect(page.locator('body')).toContainText('not currently active');
	});
});
