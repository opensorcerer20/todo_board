import type { Page } from '@playwright/test';

export function goToTab(page: Page, label: string) {
  return page.getByRole('button', { name: label, exact: true }).click();
}

export async function addTask(page: Page, title: string) {
  await goToTab(page, 'Tasks');
  await page.getByPlaceholder('What needs to be done?').fill(title);
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addRequest(page: Page, title: string) {
  await goToTab(page, 'Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Type' }).locator('select').selectOption('request');
  await page.getByPlaceholder('What needs to be done?').fill(title);
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addRepeatedTask(page: Page, title: string) {
  await goToTab(page, 'Repeat Tasks');
  await page.getByPlaceholder('Habit or recurring task…').fill(title);
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addMultistepProject(page: Page, projectTitle: string, steps: string[]) {
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name…').fill(projectTitle);
  for (let i = 0; i < steps.length; i++) {
    if (i > 0) await page.getByText('+ Add Step').click();
    await page.locator('.step-builder-row input[type="text"]').nth(i).fill(steps[i]);
  }
  await page.getByRole('button', { name: 'Create Task' }).click();
}
