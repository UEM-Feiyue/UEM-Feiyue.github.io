import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Markdown } from '@tiptap/markdown';

const output = document.querySelector('#output');
const status = document.querySelector('#status');
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [StarterKit, Image, Link.configure({ openOnClick: false }), Markdown],
  content: '<h2>我的经验分享</h2><p>在这里输入或粘贴 Word/WPS 文档。</p>',
  onUpdate: ({ editor }) => {
    try { output.textContent = editor.getMarkdown(); status.textContent = ''; }
    catch (error) { status.textContent = String(error); }
  },
});
output.textContent = editor.getMarkdown();
document.querySelector('#toolbar').addEventListener('click', (event) => {
  const action = event.target.closest('button')?.dataset.action;
  if (!action) return;
  const commands = {
    h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    bold: () => editor.chain().focus().toggleBold().run(),
    bullet: () => editor.chain().focus().toggleBulletList().run(),
    ordered: () => editor.chain().focus().toggleOrderedList().run(),
    quote: () => editor.chain().focus().toggleBlockquote().run(),
    image: () => document.querySelector('#image').click(),
  };
  commands[action]?.();
});
document.querySelector('#image').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  status.textContent = '临时图片仅供编辑测试，blob URL 不能作为正式 Markdown 图片地址。';
});
