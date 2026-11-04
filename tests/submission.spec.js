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

test('rich text paste preserves headings, lists and bold Markdown', async ({ page }) => {
  await page.goto('/submit.html');
  const editor = page.locator('#rich-editor [contenteditable=true]');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.evaluate(() => {
    const element = document.querySelector('#rich-editor [contenteditable=true]');
    const clipboard = new DataTransfer();
    clipboard.setData('text/html', '<h2>申请准备</h2><p><strong>重要事项</strong></p><ul><li>材料一</li><li>材料二</li></ul>');
    clipboard.setData('text/plain', '申请准备 重要事项 材料一 材料二');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
  });
  await expect(page.locator('#body')).toHaveValue(/## 申请准备/);
  await expect(page.locator('#body')).toHaveValue(/\*\*重要事项\*\*/);
  await expect(page.locator('#body')).toHaveValue(/材料一/);
});

test('toolbar heading edits are reflected in Markdown', async ({ page }) => {
  await page.goto('/submit.html');
  const editor = page.locator('#rich-editor [contenteditable=true]');
  await expect(editor).toBeVisible();
  await editor.fill('备考规划');
  await page.getByRole('button', { name: '二级标题' }).click();
  await expect(page.locator('#body')).toHaveValue(/## 备考规划/);
});
