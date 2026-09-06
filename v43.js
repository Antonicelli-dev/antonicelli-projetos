const sanitizeHtml=require('sanitize-html');
const {parse}=require('csv-parse/sync');
function sanitizeRich(value){
  if(value===null||value===undefined)return null;
  if(typeof value!=='string'||value.length>100000){const e=new Error('Informações adicionais: limite de 100.000 caracteres.');e.status=400;throw e}
  return sanitizeHtml(value,{allowedTags:['p','br','div','strong','b','em','i','u','ul','ol','li'],allowedAttributes:{}});
}
function plainText(value){return sanitizeHtml(String(value||'').replace(/<\/(p|div|li)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n'),{allowedTags:[],allowedAttributes:{}}).replace(/&(amp|lt|gt|quot|apos|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",'#39':"'"}[key]))}
function parseTemplateCsv(csv){
  if(typeof csv!=='string'||Buffer.byteLength(csv,'utf8')>1000000)throw new Error('CSV deve ter até 1 MB e estar em UTF-8.');
  let records;
  try{records=parse(csv,{bom:true,skip_empty_lines:true,trim:true,max_record_size:20000,info:true})}
  catch(e){throw new Error(`CSV inválido${e.lines?' na linha '+e.lines:''}: confira as três colunas e as aspas.`)}
  const header=records.shift()?.record;
  if(!header||header.join(',')!=='Fase,Categoria,Tarefa')throw new Error('Cabeçalho obrigatório: Fase,Categoria,Tarefa (separado por vírgulas).');
  if(!records.length||records.length>5000)throw new Error('O CSV precisa conter entre 1 e 5.000 tarefas.');
  const phases=new Map();
  for(const {record,info} of records){
    const [phase,category,task]=record.map(v=>v.trim());
    if(record.length!==3||![phase,category,task].every(Boolean))throw new Error(`Linha ${info.lines}: Fase, Categoria e Tarefa são obrigatórias.`);
    if([phase,category,task].some(v=>v.length>500||v.includes('\0')))throw new Error(`Linha ${info.lines}: campo inválido ou maior que 500 caracteres.`);
    if(!phases.has(phase))phases.set(phase,new Map());
    const categories=phases.get(phase);
    if(!categories.has(category))categories.set(category,[]);
    categories.get(category).push(task);
  }
  return phases;
}
function csvCell(value){
  let s=String(value??'');
  // Spreadsheet formula protection, including leading whitespace/control characters.
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function dateBR(value){if(!value)return '';const s=value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);return s.split('-').reverse().join('/')}
function exportCsv(tasks){
  const rows=[['Fase','Categoria','Tarefa','Status','Responsáveis','Data Inicial','Data Final','Anotações'],...tasks.map(t=>[t.phase_name,t.category_name,t.name,t.status,(t.responsibles||[]).map(u=>u.name).join('; '),dateBR(t.start_date),dateBR(t.end_date),t.notes||''])];
  return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function registerV43(app,{pool,q,auth,admin,canAccessEvent}){
  app.patch('/api/users/:id/role',auth,admin,async(req,res)=>{
    const id=Number(req.params.id),role=req.body?.role;
    if(!Number.isSafeInteger(id)||id<1||!['admin','collaborator','guest'].includes(role))return res.status(400).json({error:'Usuário ou nível de acesso inválido.'});
    if(id===Number(req.user.id)&&role!=='admin')return res.status(400).json({error:'Você não pode remover seu próprio acesso de administrador.'});
    const db=await pool.connect();
    try{
      await db.query('BEGIN');
      await db.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
      const actor=(await db.query('SELECT role,active FROM users WHERE id=$1',[req.user.id])).rows[0];
      if(!actor?.active||actor.role!=='admin'){await db.query('ROLLBACK');return res.status(403).json({error:'Acesso de administrador necessário.'})}
      const target=(await db.query('SELECT id,role FROM users WHERE id=$1 AND active=TRUE',[id])).rows[0];
      if(!target){await db.query('ROLLBACK');return res.status(404).json({error:'Usuário ativo não encontrado.'})}
      if(target.role==='admin'&&role!=='admin'){
        const n=(await db.query("SELECT COUNT(*)::int n FROM users WHERE active=TRUE AND role='admin'")).rows[0].n;
        if(n<=1){await db.query('ROLLBACK');return res.status(400).json({error:'Mantenha pelo menos um administrador ativo.'})}
      }
      const user=(await db.query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role,active',[role,id])).rows[0];
      await db.query("INSERT INTO audit_log(user_id,action,details) VALUES($1,'user_role_updated',$2::jsonb)",[req.user.id,JSON.stringify({user_id:id,from:target.role,to:role})]);
      await db.query('COMMIT');res.json(user);
    }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
  });
  app.post('/api/templates/import-csv',auth,admin,async(req,res)=>{
    let phases;const name=String(req.body?.name||'').trim();
    try{if(!name||name.length>200)throw new Error('Informe um nome de modelo com até 200 caracteres.');phases=parseTemplateCsv(req.body?.csv)}
    catch(e){return res.status(400).json({error:e.message})}
    const db=await pool.connect();
    try{
      await db.query('BEGIN');
      const t=(await db.query("INSERT INTO templates(name,type_label,version) VALUES($1,'Trabalho',1) RETURNING id",[name])).rows[0];
      let pi=0;
      for(const [phase,categories] of phases){
        const p=(await db.query('INSERT INTO template_phases(template_id,name,position) VALUES($1,$2,$3) RETURNING id',[t.id,phase,pi++])).rows[0];
        let ci=0;
        for(const [category,tasks] of categories){
          const c=(await db.query('INSERT INTO template_categories(phase_id,name,position) VALUES($1,$2,$3) RETURNING id',[p.id,category,ci++])).rows[0];
          await db.query('INSERT INTO template_tasks(category_id,name,position) SELECT $1,name,(ord-1)::int FROM unnest($2::text[]) WITH ORDINALITY AS t(name,ord)',[c.id,tasks]);
        }
      }
      await db.query('COMMIT');res.status(201).json({id:t.id});
    }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
  });
  app.get('/api/events/:id/export-csv',auth,async(req,res)=>{
    const id=Number(req.params.id);
    const event=(await q('SELECT id,archived_at,deleted_at FROM events WHERE id=$1',[id])).rows[0];
    if(!event||event.deleted_at||(event.archived_at&&req.user.role!=='admin'))return res.status(404).json({error:'Trabalho não encontrado.'});
    if(!await canAccessEvent(req.user,id))return res.status(403).json({error:'Sem acesso.'});
    const tasks=(await q(`SELECT et.*,COALESCE(json_agg(json_build_object('name',u.name) ORDER BY u.name) FILTER(WHERE u.id IS NOT NULL),'[]'::json) responsibles
      FROM event_tasks et LEFT JOIN event_task_responsibles r ON r.task_id=et.id
      LEFT JOIN users u ON u.id=r.user_id AND u.active=TRUE
      WHERE et.event_id=$1 GROUP BY et.id ORDER BY et.position,et.id`,[id])).rows;
    res.set('Content-Type','text/csv; charset=utf-8');res.set('Content-Disposition',`attachment; filename="trabalho-${id}.csv"`);res.set('Cache-Control','no-store');res.send(exportCsv(tasks));
  });
}
module.exports={sanitizeRich,plainText,parseTemplateCsv,csvCell,dateBR,exportCsv,registerV43};
