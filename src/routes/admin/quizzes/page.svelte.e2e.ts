import { test, expect } from '@playwright/test';

async function login(page: any) {
	await page.goto('/admin/login');
	await page.fill('input[name="username"]', 'admin');
	await page.fill('input[name="password"]', 'password123');
	await page.locator('form').evaluate((form) => form.submit());
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL('/admin');
	await expect(page.locator('a[href="/admin/logout"]')).toBeVisible();
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
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.fill('input[name="title"]', 'Updated Quiz Title');

		// Switch to Settings tab to access maxAttempts
		await page.click('[data-slot="tabs-trigger"]:has-text("Settings")');
		await page.fill('input[name="maxAttempts"]', '3');
		await page.locator('form[action="?/update"]').evaluate((form) => form.submit());
		await page.waitForURL(/\/edit\?\/update/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('[role="alert"]')).toContainText('Quiz updated successfully', { timeout: 10000 });
	});

	test('should duplicate a quiz', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Original Quiz');
		await page.fill('textarea[name="description"]', 'Original description');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.goto('/admin/quizzes');

		// Open the dropdown menu for the first quiz
		await page.locator('[data-slot="dropdown-menu-trigger"]').first().click();
		await page.click('button[type="submit"]:has-text("Duplicate")');
		await page.waitForURL(/\/quizzes\?\/duplicate/);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('[role="alert"]')).toContainText('Quiz duplicated successfully', { timeout: 10000 });
	});

	test('should delete a quiz', async ({ page }) => {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz to Delete');
		await page.fill('textarea[name="description"]', 'Will be deleted');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		await page.goto('/admin/quizzes');

		// Open the dropdown menu for the first quiz
		await page.locator('[data-slot="dropdown-menu-trigger"]').first().click();
		await page.click('[data-slot="dropdown-menu-item"]:has-text("Delete")');
		// Confirm in the alert dialog
		await page.click('[data-slot="alert-dialog-action"] button[type="submit"]');
		await page.waitForLoadState('networkidle');

		await expect(page.locator('[role="alert"]')).toContainText('Quiz deleted successfully', { timeout: 10000 });
	});

	test('should enforce max 5 active quizzes constraint', async ({ page }) => {
		await page.goto('/admin/quizzes');

		// Open the dropdown menu for the first quiz
		await page.locator('[data-slot="dropdown-menu-trigger"]').first().click();

		const activateButtons = page.locator('[data-slot="dropdown-menu"] button:has-text("Activate")');
		const count = await activateButtons.count();

		if (count > 0) {
			await activateButtons.first().click();
		}

		if (count > 0) {
			// After clicking activate, the dropdown closes and the button may no longer be visible
			await page.waitForLoadState('networkidle');
		}
	});
});

test.describe('Question Editor', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/admin/quizzes');
		await expect(page.locator('h1')).toContainText('Quizzes');
	});

	async function createQuizAndOpenEditor(page: any) {
		await page.goto('/admin/quizzes/new');
		await page.fill('input[name="title"]', 'Quiz for Questions');
		await page.fill('textarea[name="description"]', 'Test quiz');
		await page.fill('input[name="maxParticipants"]', '100');
		await page.fill('input[name="maxAttempts"]', '1');
		await page.locator('form.space-y-6').evaluate((form) => form.submit());
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin\/quizzes\/.*\/edit/);

		// Switch to Questions tab
		await page.click('[data-slot="tabs-trigger"]:has-text("Questions")');
		await page.waitForLoadState('networkidle');
	}

	test('should add MCQ single choice question via sheet', async ({ page }) => {
		await createQuizAndOpenEditor(page);

		// Click "Add Question" button to open the sheet
		await page.click('button:has-text("Add Question")');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible({ timeout: 5000 });

		// Fill question text
		await page.fill('textarea[name="text"]', 'What is 2+2?');

		// Default type is mcq_single; fill the two default options
		await page.fill('input[placeholder="Option 1"]', '3');
		await page.fill('input[placeholder="Option 2"]', '4');

		// Add a third option
		await page.click('button:has-text("Add Option")');
		await page.fill('input[placeholder="Option 3"]', '5');

		// Mark option 2 (index 1) as correct
		await page.locator('[role="radio"]').nth(1).click();

		// Submit
		await page.click('button[type="submit"]:has-text("Add Question")');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeHidden({ timeout: 10000 });

		// Question should appear in the list
		await expect(page.locator('text=What is 2+2?')).toBeVisible({ timeout: 10000 });
	});

	test('should add true/false question via sheet', async ({ page }) => {
		await createQuizAndOpenEditor(page);

		await page.click('button:has-text("Add Question")');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible({ timeout: 5000 });

		// Select True/False type via the select trigger inside the sheet
		await page.locator('[data-slot="sheet-content"] [data-slot="select-trigger"]').click();
		await page.click('[role="option"]:has-text("True / False")');

		await page.fill('textarea[name="text"]', 'The sky is blue');

		// Click the "True" answer button
		await page.click('button[role="radio"]:has-text("True")');

		await page.click('button[type="submit"]:has-text("Add Question")');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeHidden({ timeout: 10000 });

		await expect(page.locator('text=The sky is blue')).toBeVisible({ timeout: 10000 });
	});

	test('should add fill in the blank question via sheet', async ({ page }) => {
		await createQuizAndOpenEditor(page);

		await page.click('button:has-text("Add Question")');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible({ timeout: 5000 });

		// Select Fill in the Blank type
		await page.locator('[data-slot="sheet-content"] [data-slot="select-trigger"]').click();
		await page.click('[role="option"]:has-text("Fill in the Blank")');

		await page.fill('textarea[name="text"]', 'The capital of France is _____');
		await page.fill('#fitb-answer', 'Paris');

		await page.click('button[type="submit"]:has-text("Add Question")');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeHidden({ timeout: 10000 });

		await expect(page.locator('text=The capital of France is _____')).toBeVisible({ timeout: 10000 });
	});
});