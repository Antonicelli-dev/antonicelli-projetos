const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const request=require('supertest');
const {PGlite}=require('@electric-sql/pglite');
const {parse}=require('csv-parse/sync');
const {JSDOM}=require('jsdom');
const {parseTemplateCsv,sanitizeRich,plainText,exportCsv}=require('../v43');
const root=path.join(__dirname,'..');
test('CSV validates header, required fields, quotes, BOM, multiline and limits',()=>{
  const result=parseTemplateCsv('\uFEFFFase,Categoria,Tarefa\r\nPlanejar,Equipe,"Confirmar, equipe"\r\nPlanejar,Equipe,"Linha 1\nLinha 2"');
  assert.deepEqual(result.get('Planejar').get('Equipe'),['Confirmar, equipe','Linha 1\nLinha 2']);
  for(const csv of ['Fase;Categoria;Tarefa\na;b;c','Fase,Categoria,Tarefa\na,,c','Fase,Categoria,Tarefa\na,b,"c','Fase,Categoria,Tarefa','Fase,Categoria,Tarefa\na,b,c,d'])assert.throws(()=>parseTemplateCsv(csv));
});
test('rich text removes executable markup; CSV keeps accents, dates, lines and prevents formulas',()=>{
  assert.equal(sanitizeRich('<p onclick="alert(1)"><b>Olá</b><img src=x onerror=x><script>alert(1)</script><a href="javascript:x">link</a></p>'),'<p><b>Olá</b>link</p>');
  assert.throws(()=>sanitizeRich('a'.repeat(100001)));
  assert.equal(plainText('<p>A &amp; B &lt; C</p>'),'A & B < C\n');
  const csv=exportCsv([{phase_name:'=1+1',category_name:'A',name:'ação,"teste"',status:'Concluída',start_date:'2026-09-06',end_date:null,notes:'linha 1\nlinha 2',responsibles:[{name:'José'}]}]);
  const rows=parse(csv,{bom:true});assert.equal(rows[1][0],"'=1+1");assert.equal(rows[1][2],'ação,"teste"');assert.equal(rows[1][5],'06/09/2026');assert.equal(rows[1][7],'linha 1\nlinha 2');
});
test('Nodemailer composes the invitation format locally without SMTP delivery',async()=>{
  const transport=require('nodemailer').createTransport({streamTransport:true,buffer:true,newline:'unix'});
  const result=await transport.sendMail({from:'teste@example.test',to:'destino@example.test',subject:'Convite Antonicelli',text:'Você foi convidado. Acesse o link para concluir seu cadastro.',html:'<p>Você foi convidado.</p>'});
  assert.ok(result.message.toString().includes('multipart/alternative'));
  assert.ok(result.message.toString().includes('destino@example.test'));
});
test('frontend scripts compile',()=>{
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  new vm.Script(fs.readFileSync(path.join(root,'public/v43-ui.js'),'utf8'));
});
async function isolatedServer(){
  const db=new PGlite();let queries=0,failTaskInsert=false;
  const query=async(text,params=[])=>{
    ++queries;
    if(failTaskInsert&&text.startsWith('INSERT INTO template_tasks'))throw Error('Simulated write failure');
    if(text.includes('CREATE TABLE')||text.includes('ALTER TABLE')){const r=await db.exec(text);return r.at(-1)}
    const r=await db.query(text,params);return {...r,rowCount:/^\s*SELECT/i.test(text)?r.rows.length:r.affectedRows??r.rows.length};
  };
  const pool={query,connect:async()=>({query,release(){}}),end:()=>db.close()};
  const filename=path.join(root,'server.js'),originalRequire=createRequire(filename),module={exports:{}};
  const customRequire=id=>id==='pg'?{Pool:class{constructor(){return pool}}}:originalRequire(id);
  customRequire.resolve=originalRequire.resolve;
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:customRequire,module,exports:module.exports,__dirname:root,process,console,Buffer,setTimeout},{filename});
  await module.exports.init();
  return {db,app:module.exports.app,query,count:()=>queries,failTasks:value=>failTaskInsert=value};
}
test('isolated PostgreSQL: migrations, roles, CSV atomicity, event data and legacy regressions',async()=>{
  const server=await isolatedServer(),{app,query,db}=server;
  try{
    const adminLogin=await request(app).post('/api/login').send({email:'admin@antonicelli.local',password:'admin123'}).expect(200);
    const adminToken=adminLogin.body.token,auth=()=>({Authorization:'Bearer '+adminToken});
    const adminId=adminLogin.body.user.id;
    const second=(await query("INSERT INTO users(name,email,password_hash,role,avatar_data) SELECT 'Segundo','second@example.test',password_hash,'admin','data:image/png;base64,aGVsbG8=' FROM users WHERE id=$1 RETURNING id",[adminId])).rows[0].id;
    const secondLogin=await request(app).post('/api/login').send({email:'second@example.test',password:'admin123'}).expect(200);
    assert.ok(secondLogin.body.user.avatar_data);
    await request(app).patch('/api/users/'+adminId+'/role').set(auth()).send({role:'guest'}).expect(400);
    await request(app).patch('/api/users/'+second+'/role').set(auth()).send({role:'guest'}).expect(200);
    await request(app).get('/api/users').set('Authorization','Bearer '+secondLogin.body.token).expect(403);
    await request(app).patch('/api/users/'+second+'/role').set(auth()).send({role:'bogus'}).expect(400);
    const before=(await query('SELECT COUNT(*)::int n FROM templates')).rows[0].n;
    await request(app).post('/api/templates/import-csv').set(auth()).send({name:'Bad',csv:'Fase,Categoria,Tarefa\na,,t'}).expect(400);
    server.failTasks(true);
    await request(app).post('/api/templates/import-csv').set(auth()).send({name:'Rollback',csv:'Fase,Categoria,Tarefa\na,b,t'}).expect(500);
    server.failTasks(false);
    assert.equal((await query('SELECT COUNT(*)::int n FROM templates')).rows[0].n,before);
    const imported=await request(app).post('/api/templates/import-csv').set(auth()).send({name:'Modelo CSV',csv:'Fase,Categoria,Tarefa\nFase A,Cat A,Tarefa 1\nFase A,Cat A,Tarefa 2\nFase B,Cat B,Tarefa 3'}).expect(201);
    const event=await request(app).post('/api/events').set(auth()).send({name:'Teste',template_id:imported.body.id,additional_info:'Texto legado <literal>\nlinha 2'}).expect(200);
    const id=event.body.id;
    await request(app).post('/api/events/'+id+'/members').set(auth()).send({user_id:second}).expect(200);
    let detail=(await request(app).get('/api/events/'+id).set(auth()).expect(200)).body;
    assert.equal(detail.tasks.length,3);assert.equal(detail.members[0].id,second);
    const html='<p onclick="evil()"><strong>Teste</strong><script>evil()</script></p>';
    await request(app).patch('/api/events/'+id).set(auth()).send({additional_info_html:html,client_logo_data:'data:image/webp;base64,aGVsbG8='}).expect(200);
    detail=(await request(app).get('/api/events/'+id).set(auth()).expect(200)).body;
    assert.equal(detail.additional_info_html,'<p><strong>Teste</strong></p>');assert.ok(detail.client_logo_data);
    await request(app).patch('/api/events/'+id).set(auth()).send({client_logo_data:'javascript:alert(1)'}).expect(400);
    const task=detail.tasks[0].id;
    await request(app).patch('/api/tasks/'+task).set(auth()).send({status:'Concluída',start_date:'2026-09-06',notes:'Olá\nMundo'}).expect(200);
    const calendar=await request(app).get('/api/calendar-events').set(auth()).expect(200);
    assert.ok(!calendar.body.some(t=>t.id===task));
    const exported=await request(app).get('/api/events/'+id+'/export-csv').set(auth()).expect(200);
    assert.ok(exported.text.includes('06/09/2026'));assert.ok(exported.text.includes('Olá\nMundo'));
    const count=server.count();await request(app).get('/api/events').set(auth()).expect(200);assert.equal(server.count()-count,3,'auth + events + one bulk progress query');
    // Reapply both migrations; rich data, membership, tasks and old columns survive.
    await query(fs.readFileSync(path.join(root,'schema.sql'),'utf8'));
    await query(fs.readFileSync(path.join(root,'migrations/v4_3.sql'),'utf8'));
    detail=(await request(app).get('/api/events/'+id).set(auth()).expect(200)).body;assert.equal(detail.tasks.length,3);assert.equal(detail.additional_info_html,'<p><strong>Teste</strong></p>');
    // Existing disabled account is reactivated with its original identity and photo.
    await query('UPDATE users SET active=FALSE WHERE id=$1',[second]);
    await request(app).get('/api/me').set('Authorization','Bearer '+secondLogin.body.token).expect(401);
    await query("INSERT INTO invitations(email,name,role,token,event_id,invited_by,expires_at) VALUES('second@example.test','Segundo','guest','test-invite',$1,$2,NOW()+INTERVAL '1 day')",[id,adminId]);
    const invite=await request(app).get('/api/invitations/test-invite').expect(200);assert.ok(!JSON.stringify(invite.body).includes('Teste'));
    const reactivated=await request(app).post('/api/register-invite').send({token:'test-invite',name:'Segundo',password:'new-password'}).expect(200);
    assert.equal(reactivated.body.user.id,second);assert.ok(reactivated.body.user.avatar_data);
    await request(app).get('/api/events/'+id+'/export-csv').set('Authorization','Bearer '+reactivated.body.token).expect(200);
    await query('DELETE FROM event_members WHERE event_id=$1 AND user_id=$2',[id,second]);
    await request(app).get('/api/events/'+id+'/export-csv').set('Authorization','Bearer '+reactivated.body.token).expect(403);
    await request(app).get('/vendor/purify.min.js').expect(200);
  }finally{await db.close()}
});
test('DOM: route restoration, safe rich text and immediate collaborator options',async()=>{
  const dom=new JSDOM('<div id="app"></div><div id="modal"><div id="modalbox"></div></div><select id="filterResp"><option value="">Todos</option></select><select class="taskRespQuick"></select>',{url:'http://localhost/#/trabalho/42',runScripts:'outside-only'});
  const w=dom.window;
  w.eval(fs.readFileSync(require.resolve('dompurify/dist/purify.min.js'),'utf8'));
  w.eval(`var me={id:1,role:'admin'},currentEvent={members:[{id:2,name:'Ana',role:'collaborator'},{id:3,name:'Visitante',role:'guest'}]};var app=document.getElementById('app');function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}function closeModal(){};function openEvent(id){window.opened=id};function showLogin(){};function loadEvents(){};`);
  w.eval(fs.readFileSync(path.join(root,'public/v43-ui.js'),'utf8'));
  await w.restoreRoute();assert.equal(w.opened,42);
  w.refreshMemberPickers();assert.equal(w.document.querySelector('.taskRespQuick').options.length,2);assert.equal(w.document.querySelector('#filterResp').options.length,4);
  assert.equal(w.eventRich({additional_info:'<script>hello</script>\ntext'}),'&lt;script&gt;hello&lt;/script&gt;<br>text');
  assert.equal(w.cleanRich('<img src=x onerror=x><b>Bom</b>'),'<b>Bom</b>');
  dom.window.close();
});
