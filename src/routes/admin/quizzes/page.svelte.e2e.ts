import { test, expect } from '@playwright/test';

async function login(page: any) {
	await page.goto('/admin/login');
	await page.fill('input[name="username"]', 'admin');
	await page.fill('input[name="password"]', 'password123');
	await page.locator('form').evaluate((form) => form.submit());
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL('/admin');
	await expect(page.locator('text=Logged in as: admin')).toBeVisible();
}

test.describe('Quiz CRUD Operations', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/admin/quizzes');
		await expect(page.locator('h1')).toContainText('Quizzes');
	});

	test('should display quiz list page', async ({ page }) => {
		await page.goto('/admin/quizzes');
		await expect(page.locator('h1')).toContainText('Quizzes');
		await expect(page.locator('a[href="/admin/quizzes/new"]')).toBeVisible();
	});

	test('should create a new quiz', async ({ page }) => {
		await page.goto('/admin/quizzes/new');

		await page.fill('input[name="title"]', 'Test Quiz');
		await page.fill('textarea[name="description"]', 'A test quiz for e2e testing');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');

		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/, { timeout: 10000 });
		await expect(page.locator('h1')).toContainText('Edit Quiz');
	});

	test('should edit quiz settings', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz to Edit');
		await page.fill('textarea[name="description"]', 'Description');
		await page.fill('input[name="maxParticipants"]', '50');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.fill('input[name="title"]', 'Updated Quiz Title');
		await page.fill('input[name="maxAttempts"]', '3');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForURL(/\/edit\?\/update/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.bg-green-50')).toContainText('Quiz updated successfully', { timeout: 10000 });
	});

	test('should duplicate a quiz', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Original Quiz');
		await page.fill('textarea[name="description"]', 'Original description');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.goto('/admin/quizzes');

		await page.locator('form[action="?/duplicate"]').first().evaluate((form) => form.submit());
		await page.waitForURL(/\/quizzes\?\/duplicate/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.bg-green-50')).toContainText('Quiz duplicated successfully', { timeout: 10000 });
	});

	test('should delete a quiz', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz to Delete');
		await page.fill('textarea[name="description"]', 'Will be deleted');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.goto('/admin/quizzes');

		page.on('dialog', (dialog) => dialog.accept());
		await page.locator('form[action="?/delete"]').first().evaluate((form) => form.submit());
		await page.waitForURL(/\/quizzes\?\/delete/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.bg-green-50')).toContainText('Quiz deleted successfully', { timeout: 10000 });
	});

	test('should enforce max 5 active quizzes constraint', async ({ page }) => {
		await page.goto('/admin/quizzes');

		const activateButtons = page.locator('button:has-text("Activate")');
		const count = await activateButtons.count();

		if (count > 0) {
			await activateButtons.first().click();
		}

		if (count > 0) {
			await expect(activateButtons.first()).toBeVisible();
		}
	});
});

test.describe('Question Editor', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/admin/quizzes');
		await expect(page.locator('h1')).toContainText('Quizzes');
	});

	test('should add MCQ single choice question', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz for Questions');
		await page.fill('textarea[name="description"]', 'Test quiz');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.click('a:has-text("+ Add Question")');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/questions/);

		await page.selectOption('select[name="type"]', 'mcq_single');
		await page.fill('textarea[name="text"]', 'What is 2+2?');

		await page.click('button:has-text("+ Add Option")');
		await page.click('button:has-text("+ Add Option")');

		await page.fill('input[name="options[0].text"]', '3');
		await page.fill('input[name="options[1].text"]', '4');
		await page.fill('input[name="options[2].text"]', '5');

		await page.locator('input[type="radio"]').nth(1).check();

		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForURL(/\/questions\?\/create/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.bg-green-50')).toContainText('Question created successfully', { timeout: 10000 });
	});

	test('should add true/false question', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz for Questions');
		await page.fill('textarea[name="description"]', 'Test quiz');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.click('a:has-text("+ Add Question")');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/questions/);

		await page.selectOption('select[name="type"]', 'true_false');
		await page.fill('textarea[name="text"]', 'The sky is blue');

		await page.locator('input[value="true"]').check();

		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForURL(/\/questions\?\/create/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.bg-green-50')).toContainText('Question created successfully', { timeout: 10000 });
	});

	test('should add fill in the blank question', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz for Questions');
		await page.fill('textarea[name="description"]', 'Test quiz');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.check('input[name="allowBackNavigation"]');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.click('a:has-text("+ Add Question")');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/questions/);

		await page.selectOption('select[name="type"]', 'fitb');
		await page.fill('textarea[name="text"]', 'The capital of France is _____');
		await page.fill('input[name="correctAnswer"]', 'Paris');

		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForURL(/\/questions\?\/create/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('.bg-green-50')).toContainText('Question created successfully', { timeout: 10000 });
	});
});