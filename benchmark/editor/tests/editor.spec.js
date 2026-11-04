import { test, expect } from '@playwright/test';

for (const name of ['tiptap', 'milkdown']) {
  test(name + ': renders Chinese heading and exports Markdown', async ({ page }) => {
    await page.goto('/' + name + '.html');
    await expect(page.locator('#editor h2').first()).toContainText('我的经验分享');
    if (name === 'milkdown') await page.locator('#export').click();
    await expect(page.locator('#output')).toContainText('## 我的经验分享');
    await expect(page.locator('#status')).toBeEmpty();
  });
}

test('Tiptap: semantic HTML paste exports Markdown structure', async ({ page }) => {
  await page.goto('/tiptap.html');
  const editable = page.locator('#editor [contenteditable="true"]');
  await expect(editable).toBeVisible();
  await editable.click();
  await page.evaluate(() => {
    const el = document.querySelector('#editor [contenteditable="true"]');
    el.focus();
    const transfer = new DataTransfer();
    transfer.setData('text/html', '<h2>粘贴标题</h2><p><strong>重要经验</strong>与<a href="https://example.com">参考资料</a></p><ul><li>第一步</li><li>第二步</li></ul>');
    transfer.setData('text/plain', '粘贴标题\n重要经验与参考资料\n第一步\n第二步');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#output')).toContainText('粘贴标题');
  await expect(page.locator('#output')).toContainText('**重要经验**');
  await expect(page.locator('#output')).toContainText('第一步');
  await expect(page.locator('#output')).toContainText('https://example.com');
});

test('Tiptap: image insertion is temporary and cannot be published as-is', async ({ page }) => {
  await page.goto('/tiptap.html');
  await page.locator('#image').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8s8AAAAASUVORK5CYII=', 'base64') });
  await expect(page.locator('#editor img')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('#status')).toContainText('不能作为正式');
});
