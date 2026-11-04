import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

const status = document.querySelector('#status');
const output = document.querySelector('#output');
try {
  const crepe = new Crepe({
    root: document.querySelector('#editor'),
    defaultValue: '## 我的经验分享\n\n在这里输入或粘贴 Word/WPS 文档。\n',
  });
  await crepe.create();
  const refresh = () => { output.textContent = crepe.getMarkdown(); };
  refresh();
  document.querySelector('#export').addEventListener('click', refresh);
} catch (error) { status.textContent = String(error); }
