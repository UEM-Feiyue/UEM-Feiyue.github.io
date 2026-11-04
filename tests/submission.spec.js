import { test, expect } from '@playwright/test';

const fillRequired = async page => {
  await page.locator('#title').fill('申请经历');
  await page.locator('#author').fill('测试同学');
  await page.locator('#year').fill('2026');
  await page.locator('#school').fill('测试学院');
  await page.locator('#major').fill('测试专业');
  await page.locator('#destination').fill('测试去向');
  await page.locator('#background').fill('个人背景');
};

test('editor loads, writes Markdown and previews', async ({ page }) => {
  await page.goto('/submit.html');
  await expect(page.locator('#rich-editor [contenteditable=true]')).toBeVisible();
  await fillRequired(page);
  await page.locator('#rich-editor [contenteditable=true]').fill('正文内容');
  await expect(page.locator('#body')).toHaveValue(/正文内容/);
  await page.getByRole('button', { name: '预览内容' }).click();
  await expect(page.locator('#preview')).toBeVisible();
  await expect(page.locator('#preview .article-body')).toContainText('正文内容');
});

test('editor restores draft after reload and reset removes it', async ({ page }) => {
  await page.goto('/submit.html');
  await expect(page.locator('#rich-editor [contenteditable=true]')).toBeVisible();
  await page.locator('#title').fill('草稿标题');
  await page.locator('#rich-editor [contenteditable=true]').fill('草稿正文');
  await page.reload();
  await expect(page.locator('#rich-editor [contenteditable=true]')).toBeVisible();
  await expect(page.locator('#title')).toHaveValue('草稿标题');
  await expect(page.locator('#rich-editor')).toContainText('草稿正文');
  await page.getByRole('button', { name: '清空表单' }).click();
  await expect(page.locator('#rich-editor')).not.toContainText('草稿正文');
  await page.reload();
  await expect(page.locator('#title')).toHaveValue('');
  await expect(page.locator('#rich-editor')).not.toContainText('草稿正文');
});

test('empty rich body prevents preview without hidden-field focus error', async ({ page }) => {
  await page.goto('/submit.html');
  await expect(page.locator('#rich-editor [contenteditable=true]')).toBeVisible();
  await fillRequired(page);
  await page.getByRole('button', { name: '预览内容' }).click();
  await expect(page.locator('#preview')).toBeHidden();
  await expect(page.locator('#rich-editor + .field-hint')).toContainText('请先填写经历正文');
});

test('contact details are not persisted in draft', async ({ page }) => {
  await page.goto('/submit.html');
  await expect(page.locator('#rich-editor [contenteditable=true]')).toBeVisible();
  await page.locator('#contact').fill('private@example.org');
  await page.locator('#title').fill('公开标题');
  const draft = await page.evaluate(() => sessionStorage.getItem('uem-draft-v1'));
  expect(draft).not.toContain('private@example.org');
});
