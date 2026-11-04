import assert from 'node:assert/strict';
import test from 'node:test';
import {validate,formatIssue} from '../src/index.mjs';

const data = {
 version:1, category:'career', author:'张同学', year:'2026',
 destination:'某公司', program:'产品经理', body:'## 准备过程\n\n我分享自己真实的准备过程和经验总结。', contact:''
};
test('valid contribution uses canonical schema',()=>{
 assert.equal(validate(data),true);
 assert.equal(validate({...data,category:'random'}),false);
 assert.equal(validate({...data,year:'20xx'}),false);
 assert.equal(validate({...data,body:'too short'}),false);
 assert.equal(validate({...data,extra:'x'}),false);
});
test('issue contains exact structured payload and public text',()=>{
 const issue=formatIssue(data);
 assert.match(issue.title,/^\[飞跃投稿\] \[就业\] 张同学 — 某公司/);
 const encoded=issue.body.match(/uem-submission-v1:([A-Za-z0-9_-]+)/)[1];
 const decoded=JSON.parse(Buffer.from(encoded,'base64url').toString());
 assert.deepEqual(decoded,data);
 assert.ok(issue.body.includes(data.body));
});
