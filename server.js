const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const nodemailer=require('nodemailer');
const crypto=require('crypto');
const {Pool}=require('pg');
const fs=require('fs');
const path=require('path');

const PORT=process.env.PORT||3000;
const JWT_SECRET=process.env.JWT_SECRET||'DEV-CHANGE-ME';

const pool=new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:false}:undefined
});

const app=express();
app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname,'public')));

function validateEnvironment(){
  if(!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL não configurada');
  if(process.env.NODE_ENV==='production'&&(!process.env.JWT_SECRET||process.env.JWT_SECRET==='DEV-CHANGE-ME'))
    throw new Error('JWT_SECRET não configurada para produção');
}

async function q(text,params=[]){return pool.query(text,params)}

async function init(){
  await q(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));

  const uc=await q('SELECT COUNT(*)::int c FROM users');
  if(uc.rows[0].c===0){
    const hash=bcrypt.hashSync('admin123',10);
    await q(
      'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',
      ['Administrador','admin@antonicelli.local',hash,'admin']
    );
  }

  const tc=await q('SELECT COUNT(*)::int c FROM templates');
  if(tc.rows[0].c===0){
    const tdata=JSON.parse(fs.readFileSync(path.join(__dirname,'template.json'),'utf8'));
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const t=(await client.query(
        'INSERT INTO templates(name,type_label,version) VALUES($1,$2,1) RETURNING id',
        [tdata.name,'Evento']
      )).rows[0];

      for(let pi=0;pi<tdata.phases.length;pi++){
        const p=tdata.phases[pi];
        const ph=(await client.query(
          'INSERT INTO template_phases(template_id,name,position) VALUES($1,$2,$3) RETURNING id',
          [t.id,p.name,pi]
        )).rows[0];

        for(let ci=0;ci<p.categories.length;ci++){
          const c=p.categories[ci];
          const ca=(await client.query(
            'INSERT INTO template_categories(phase_id,name,position) VALUES($1,$2,$3) RETURNING id',
            [ph.id,c.name,ci]
          )).rows[0];

          for(let ti=0;ti<c.tasks.length;ti++){
            await client.query(
              'INSERT INTO template_tasks(category_id,name,position) VALUES($1,$2,$3)',
              [ca.id,c.tasks[ti].name,ti]
            );
          }
        }
      }
      await client.query('COMMIT');
    }catch(e){
      await client.query('ROLLBACK'); throw e;
    }finally{client.release()}
  }
}

function auth(req,res,next){
  try{
    const t=(req.headers.authorization||'').replace(/^Bearer\s+/,'');
    req.user=jwt.verify(t,JWT_SECRET);
    next();
  }catch{
    res.status(401).json({error:'Não autenticado'});
  }
}
function admin(req,res,next){
  if(req.user.role!=='admin')
    return res.status(403).json({error:'Acesso restrito ao administrador'});
  next();
}

function editor(req,res,next){
  if(!['admin','collaborator'].includes(req.user.role))
    return res.status(403).json({error:'Acesso somente para administradores e colaboradores'});
  next();
}

function smtpConfigured(){
  return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS);
}

function mailTransport(){
  return nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:Number(process.env.SMTP_PORT||587),
    secure:String(process.env.SMTP_SECURE||'false').toLowerCase()==='true',
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
  });
}


function validateAvatarData(value){
  if(value===null||value===undefined||value==='')return '';
  const s=String(value);
  if(!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(s))
    throw new Error('Formato de foto inválido');
  if(s.length>1100000)
    throw new Error('A foto de perfil é muito grande');
  return s;
}

async function sendInvitationEmail(invite){
  const base=(process.env.APP_URL||process.env.RENDER_EXTERNAL_URL||`http://localhost:${PORT}`).replace(/\/$/,'');
  const inviteUrl=`${base}/?invite=${encodeURIComponent(invite.token)}`;
  if(!smtpConfigured()) return {sent:false,invite_url:inviteUrl};

  const roleLabel=invite.role==='admin'?'Administrador':(invite.role==='guest'?'Convidado':'Colaborador');
  await mailTransport().sendMail({
    from:process.env.MAIL_FROM||process.env.SMTP_USER,
    to:invite.email,
    subject:'Convite para a plataforma Antonicelli Eventos',
    text:`Olá ${invite.name},

Você foi convidado para acessar a plataforma Antonicelli Eventos como ${roleLabel}.

Crie sua senha e conclua seu cadastro neste link:
${inviteUrl}

Este convite expira em 7 dias.`,
    html:`<p>Olá <strong>${invite.name}</strong>,</p>
      <p>Você foi convidado para acessar a plataforma <strong>Antonicelli Eventos</strong> como <strong>${roleLabel}</strong>.</p>
      <p><a href="${inviteUrl}">Clique aqui para concluir seu cadastro e criar sua senha</a>.</p>
      <p>Este convite expira em 7 dias.</p>`
  });
  return {sent:true,invite_url:inviteUrl};
}
async function activeTemplate(){
  return (await q('SELECT * FROM templates WHERE active=TRUE ORDER BY id LIMIT 1')).rows[0];
}
async function templateWithStructure(id){
  // V4.2.1 Render: somente 2 consultas ao banco, independentemente do tamanho do modelo.
  const t=(await q('SELECT * FROM templates WHERE id=$1 AND active=TRUE',[id])).rows[0];
  if(!t)return null;

  const rows=(await q(`SELECT
      p.id phase_id,p.name phase_name,p.position phase_position,
      c.id category_id,c.name category_name,c.position category_position,
      tt.id task_id,tt.name task_name,tt.position task_position
    FROM template_phases p
    LEFT JOIN template_categories c ON c.phase_id=p.id
    LEFT JOIN template_tasks tt ON tt.category_id=c.id
    WHERE p.template_id=$1
    ORDER BY p.position,p.id,c.position,c.id,tt.position,tt.id`,[id])).rows;

  const phases=[];
  const phaseMap=new Map();
  const categoryMap=new Map();

  for(const row of rows){
    let phase=phaseMap.get(row.phase_id);
    if(!phase){
      phase={id:row.phase_id,template_id:id,name:row.phase_name,position:row.phase_position,categories:[]};
      phaseMap.set(row.phase_id,phase);
      phases.push(phase);
    }
    if(!row.category_id)continue;

    let category=categoryMap.get(row.category_id);
    if(!category){
      category={id:row.category_id,phase_id:row.phase_id,name:row.category_name,position:row.category_position,tasks:[]};
      categoryMap.set(row.category_id,category);
      phase.categories.push(category);
    }
    if(!row.task_id)continue;
    category.tasks.push({
      id:row.task_id,
      category_id:row.category_id,
      name:row.task_name,
      position:row.task_position
    });
  }

  t.phases=phases;
  return t;
}
async function bumpTemplateVersion(id){await q('UPDATE templates SET version=version+1 WHERE id=$1',[id])}
async function templateIdFromPhase(id){
  return (await q('SELECT template_id FROM template_phases WHERE id=$1',[id])).rows[0]?.template_id;
}
async function templateIdFromCategory(id){
  return (await q(`SELECT p.template_id FROM template_categories c
                   JOIN template_phases p ON p.id=c.phase_id WHERE c.id=$1`,[id])).rows[0]?.template_id;
}
async function templateIdFromTask(id){
  return (await q(`SELECT p.template_id FROM template_tasks t
                   JOIN template_categories c ON c.id=t.category_id
                   JOIN template_phases p ON p.id=c.phase_id WHERE t.id=$1`,[id])).rows[0]?.template_id;
}
async function canAccessEvent(user,eventId){
  if(user.role==='admin') return true;
  return !!(await q('SELECT 1 FROM event_members WHERE event_id=$1 AND user_id=$2',[eventId,user.id])).rowCount;
}

app.post('/api/login',async(req,res)=>{
  try{
    const {email,password}=req.body||{};
    const r=await q('SELECT * FROM users WHERE email=$1 AND active=TRUE',[email||'']);
    const u=r.rows[0];
    if(!u||!bcrypt.compareSync(password||'',u.password_hash))
      return res.status(401).json({error:'E-mail ou senha inválidos'});
    const token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},JWT_SECRET,{expiresIn:'12h'});
    res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role,avatar_data:u.avatar_data||''}});
  }catch(e){res.status(500).json({error:e.message})}
});
app.get('/api/me',auth,async(req,res)=>{
  const u=(await q(
    'SELECT id,name,email,role,avatar_data FROM users WHERE id=$1 AND active=TRUE',
    [req.user.id]
  )).rows[0];
  if(!u)return res.status(401).json({error:'Usuário não encontrado ou inativo'});
  res.json(u);
});

app.get('/api/users',auth,admin,async(req,res)=>{
  const r=await q(`SELECT id,name,email,role,active,avatar_data,created_at
                   FROM users
                   WHERE active=TRUE
                   ORDER BY name`);
  res.json(r.rows);
});

/* Soft delete: preserves audit/history but revokes access */
app.delete('/api/users/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  if(id===Number(req.user.id))
    return res.status(400).json({error:'Você não pode excluir sua própria conta'});

  const user=(await q('SELECT id,name,email,role FROM users WHERE id=$1',[id])).rows[0];
  if(!user)return res.status(404).json({error:'Colaborador não encontrado'});
  if(user.role==='admin')
    return res.status(400).json({error:'Contas de administrador não podem ser excluídas por esta tela'});

  const db=await pool.connect();
  try{
    await db.query('BEGIN');
    await db.query('DELETE FROM event_task_responsibles WHERE user_id=$1',[id]);
    await db.query('UPDATE event_tasks SET responsible_user_id=NULL WHERE responsible_user_id=$1',[id]);
    await db.query('DELETE FROM event_members WHERE user_id=$1',[id]);
    await db.query('UPDATE users SET active=FALSE WHERE id=$1',[id]);
    await db.query('COMMIT');
    res.json({ok:true});
  }catch(e){
    await db.query('ROLLBACK');
    res.status(500).json({error:e.message});
  }finally{db.release()}
});

/* Invite a new platform user and optionally associate the invite with this event */
app.post('/api/events/:id/invitations',auth,admin,async(req,res)=>{
  const eventId=Number(req.params.id);
  const name=String(req.body?.name||'').trim();
  const email=String(req.body?.email||'').trim().toLowerCase();
  const role=String(req.body?.role||'collaborator').trim();

  if(!name||!email)return res.status(400).json({error:'Nome e e-mail são obrigatórios'});
  if(!['admin','collaborator','guest'].includes(role))
    return res.status(400).json({error:'Nível de acesso inválido'});

  const event=(await q('SELECT id FROM events WHERE id=$1',[eventId])).rows[0];
  if(!event)return res.status(404).json({error:'Evento não encontrado'});

  const existing=(await q('SELECT id,active FROM users WHERE LOWER(email)=LOWER($1)',[email])).rows[0];
  if(existing&&existing.active)
    return res.status(409).json({error:'Este e-mail já está cadastrado. Use a opção de adicionar colaborador existente.'});

  // Contas desativadas podem receber novo convite. O cadastro reativa a mesma conta,
  // preservando o histórico e os vínculos de auditoria existentes.
  await q(`UPDATE invitations SET expires_at=NOW()
           WHERE LOWER(email)=LOWER($1) AND accepted_at IS NULL AND expires_at>NOW()`,[email]);

  const token=crypto.randomBytes(32).toString('hex');
  const inv=(await q(
    `INSERT INTO invitations(email,name,role,token,event_id,invited_by,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '7 days')
     RETURNING *`,
    [email,name,role,token,eventId,req.user.id]
  )).rows[0];

  try{
    const mail=await sendInvitationEmail(inv);
    res.json({ok:true,sent:mail.sent,invite_url:mail.invite_url});
  }catch(e){
    res.status(502).json({error:'Convite criado, mas o e-mail não pôde ser enviado: '+e.message});
  }
});

app.get('/api/invitations/:token',async(req,res)=>{
  const token=String(req.params.token||'');
  const inv=(await q(
    `SELECT i.id,i.email,i.name,i.role,i.expires_at,i.accepted_at
     FROM invitations i
     WHERE i.token=$1`,
    [token]
  )).rows[0];

  if(!inv)return res.status(404).json({error:'Convite inválido'});
  if(inv.accepted_at)return res.status(410).json({error:'Este convite já foi utilizado'});
  if(new Date(inv.expires_at)<new Date())return res.status(410).json({error:'Este convite expirou'});
  res.json(inv);
});

app.post('/api/register-invite',async(req,res)=>{
  const token=String(req.body?.token||'');
  const name=String(req.body?.name||'').trim();
  const password=String(req.body?.password||'');
  let avatar_data='';
  try{avatar_data=validateAvatarData(req.body?.avatar_data||'')}catch(e){return res.status(400).json({error:e.message})}

  if(!name)return res.status(400).json({error:'Nome é obrigatório'});
  if(password.length<6)return res.status(400).json({error:'A senha precisa ter pelo menos 6 caracteres'});

  const db=await pool.connect();
  try{
    await db.query('BEGIN');

    const inv=(await db.query(
      `SELECT * FROM invitations
       WHERE token=$1 AND accepted_at IS NULL AND expires_at>NOW()
       FOR UPDATE`,
      [token]
    )).rows[0];
    if(!inv)throw new Error('Convite inválido ou expirado');

    const existingUser=(await db.query(
      'SELECT id,active,avatar_data FROM users WHERE LOWER(email)=LOWER($1) FOR UPDATE',
      [inv.email]
    )).rows[0];

    if(existingUser?.active)
      throw new Error('Já existe uma conta ativa com este e-mail');

    const hash=bcrypt.hashSync(password,10);
    let user;

    if(existingUser){
      // Reativa a conta original para preservar histórico/auditoria.
      // Se nenhuma foto nova for enviada, mantém a foto que já estava salva.
      const reactivatedAvatar=avatar_data||existingUser.avatar_data||'';
      user=(await db.query(
        `UPDATE users
         SET name=$1,password_hash=$2,role=$3,active=TRUE,avatar_data=$4
         WHERE id=$5
         RETURNING id,name,email,role,avatar_data`,
        [name,hash,inv.role,reactivatedAvatar,existingUser.id]
      )).rows[0];
    }else{
      user=(await db.query(
        `INSERT INTO users(name,email,password_hash,role,active,avatar_data)
         VALUES($1,$2,$3,$4,TRUE,$5)
         RETURNING id,name,email,role,avatar_data`,
        [name,inv.email,hash,inv.role,avatar_data]
      )).rows[0];
    }

    if(inv.event_id){
      await db.query(
        'INSERT INTO event_members(event_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [inv.event_id,user.id]
      );
    }

    await db.query('UPDATE invitations SET accepted_at=NOW() WHERE id=$1',[inv.id]);
    await db.query('COMMIT');

    const authToken=jwt.sign(
      {id:user.id,name:user.name,email:user.email,role:user.role},
      JWT_SECRET,{expiresIn:'12h'}
    );
    res.json({token:authToken,user});
  }catch(e){
    await db.query('ROLLBACK');
    res.status(400).json({error:e.message});
  }finally{db.release()}
});



/* Current user profile */
app.get('/api/profile',auth,async(req,res)=>{
  const u=(await q(
    'SELECT id,name,email,role,avatar_data FROM users WHERE id=$1 AND active=TRUE',
    [req.user.id]
  )).rows[0];
  if(!u)return res.status(404).json({error:'Perfil não encontrado'});
  res.json(u);
});

app.patch('/api/profile',auth,async(req,res)=>{
  const current=(await q(
    'SELECT id,name,email,role,avatar_data FROM users WHERE id=$1 AND active=TRUE',
    [req.user.id]
  )).rows[0];
  if(!current)return res.status(404).json({error:'Perfil não encontrado'});

  const name=req.body.name!==undefined?String(req.body.name||'').trim():current.name;
  if(!name)return res.status(400).json({error:'Nome é obrigatório'});

  let avatar_data=current.avatar_data||'';
  if(req.body.avatar_data!==undefined){
    try{avatar_data=validateAvatarData(req.body.avatar_data)}
    catch(e){return res.status(400).json({error:e.message})}
  }

  const u=(await q(
    `UPDATE users SET name=$1,avatar_data=$2
     WHERE id=$3
     RETURNING id,name,email,role,avatar_data`,
    [name,avatar_data,req.user.id]
  )).rows[0];

  res.json(u);
});

/* TEMPLATE */
app.get('/api/templates',auth,admin,async(req,res)=>{
  // Lista leve: não carrega fases/categorias/tarefas de todos os modelos.
  const rows=(await q(`SELECT id,name,type_label,version,active,created_at
    FROM templates WHERE active=TRUE ORDER BY id`)).rows;
  res.json(rows);
});
app.get('/api/templates/:id',auth,admin,async(req,res)=>{
  const t=await templateWithStructure(Number(req.params.id));
  if(!t)return res.status(404).json({error:'Modelo não encontrado'});
  res.json(t);
});
app.post('/api/templates',auth,admin,async(req,res)=>{
  const name=String(req.body?.name||'').trim();
  const type_label=String(req.body?.type_label||'').trim();
  if(!name)return res.status(400).json({error:'Nome do modelo é obrigatório'});
  if(!type_label)return res.status(400).json({error:'Tipo do trabalho é obrigatório'});
  const r=await q(
    'INSERT INTO templates(name,type_label,version,active) VALUES($1,$2,1,TRUE) RETURNING *',
    [name,type_label]
  );
  res.json(r.rows[0]);
});
app.patch('/api/templates/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const current=(await q('SELECT * FROM templates WHERE id=$1 AND active=TRUE',[id])).rows[0];
  if(!current)return res.status(404).json({error:'Modelo não encontrado'});
  const name=req.body?.name!==undefined?String(req.body.name||'').trim():current.name;
  const type_label=req.body?.type_label!==undefined?String(req.body.type_label||'').trim():current.type_label;
  if(!name)return res.status(400).json({error:'Nome do modelo é obrigatório'});
  if(!type_label)return res.status(400).json({error:'Tipo do trabalho é obrigatório'});
  const r=await q(
    'UPDATE templates SET name=$1,type_label=$2,version=version+1 WHERE id=$3 RETURNING *',
    [name,type_label,id]
  );
  res.json(r.rows[0]);
});
app.post('/api/template/phases',auth,admin,async(req,res)=>{
  const template_id=Number(req.body?.template_id),name=String(req.body?.name||'').trim();
  if(!template_id||!name)return res.status(400).json({error:'Modelo e fase são obrigatórios'});
  const pos=(await q('SELECT COALESCE(MAX(position),-1)+1 p FROM template_phases WHERE template_id=$1',[template_id])).rows[0].p;
  const r=await q('INSERT INTO template_phases(template_id,name,position) VALUES($1,$2,$3) RETURNING *',[template_id,name,pos]);
  await bumpTemplateVersion(template_id);res.json(r.rows[0]);
});
app.patch('/api/template/phases/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id),name=String(req.body?.name||'').trim();
  const tid=await templateIdFromPhase(id);
  if(!tid)return res.status(404).json({error:'Fase não encontrada'});
  if(!name)return res.status(400).json({error:'Nome da fase é obrigatório'});
  await q('UPDATE template_phases SET name=$1 WHERE id=$2',[name,id]);await bumpTemplateVersion(tid);res.json({ok:true});
});
app.delete('/api/template/phases/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id),tid=await templateIdFromPhase(id);
  if(!tid)return res.status(404).json({error:'Fase não encontrada'});
  await q('DELETE FROM template_phases WHERE id=$1',[id]);await bumpTemplateVersion(tid);res.json({ok:true});
});
app.post('/api/template/categories',auth,admin,async(req,res)=>{
  const phase_id=Number(req.body?.phase_id),name=String(req.body?.name||'').trim();
  const tid=await templateIdFromPhase(phase_id);
  if(!tid)return res.status(404).json({error:'Fase não encontrada'});
  if(!name)return res.status(400).json({error:'Nome da categoria é obrigatório'});
  const pos=(await q('SELECT COALESCE(MAX(position),-1)+1 p FROM template_categories WHERE phase_id=$1',[phase_id])).rows[0].p;
  const r=await q('INSERT INTO template_categories(phase_id,name,position) VALUES($1,$2,$3) RETURNING *',[phase_id,name,pos]);
  await bumpTemplateVersion(tid);res.json(r.rows[0]);
});
app.patch('/api/template/categories/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id),name=String(req.body?.name||'').trim(),tid=await templateIdFromCategory(id);
  if(!tid)return res.status(404).json({error:'Categoria não encontrada'});
  if(!name)return res.status(400).json({error:'Nome da categoria é obrigatório'});
  await q('UPDATE template_categories SET name=$1 WHERE id=$2',[name,id]);await bumpTemplateVersion(tid);res.json({ok:true});
});
app.delete('/api/template/categories/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id),tid=await templateIdFromCategory(id);
  if(!tid)return res.status(404).json({error:'Categoria não encontrada'});
  await q('DELETE FROM template_categories WHERE id=$1',[id]);await bumpTemplateVersion(tid);res.json({ok:true});
});
app.post('/api/template/tasks',auth,admin,async(req,res)=>{
  const category_id=Number(req.body?.category_id),name=String(req.body?.name||'').trim(),tid=await templateIdFromCategory(category_id);
  if(!tid)return res.status(404).json({error:'Categoria não encontrada'});
  if(!name)return res.status(400).json({error:'Nome da tarefa é obrigatório'});
  const pos=(await q('SELECT COALESCE(MAX(position),-1)+1 p FROM template_tasks WHERE category_id=$1',[category_id])).rows[0].p;
  const r=await q('INSERT INTO template_tasks(category_id,name,position) VALUES($1,$2,$3) RETURNING *',[category_id,name,pos]);
  await bumpTemplateVersion(tid);res.json(r.rows[0]);
});
app.patch('/api/template/tasks/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id),name=String(req.body?.name||'').trim(),tid=await templateIdFromTask(id);
  if(!tid)return res.status(404).json({error:'Tarefa não encontrada'});
  if(!name)return res.status(400).json({error:'Nome da tarefa é obrigatório'});
  await q('UPDATE template_tasks SET name=$1 WHERE id=$2',[name,id]);await bumpTemplateVersion(tid);res.json({ok:true});
});
app.delete('/api/template/tasks/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id),tid=await templateIdFromTask(id);
  if(!tid)return res.status(404).json({error:'Tarefa não encontrada'});
  await q('DELETE FROM template_tasks WHERE id=$1',[id]);await bumpTemplateVersion(tid);res.json({ok:true});
});

/* EVENTS */
app.get('/api/events',auth,async(req,res)=>{
  let r;
  if(req.user.role==='admin'){
    r=await q(`SELECT e.*,COALESCE(t.type_label,t.name,'Trabalho') work_type,t.name template_name
      FROM events e
      LEFT JOIN templates t ON t.id=e.template_id
      WHERE e.archived_at IS NULL AND e.deleted_at IS NULL
      ORDER BY e.event_date DESC NULLS LAST,e.id DESC`);
  }else{
    r=await q(`SELECT e.*,COALESCE(t.type_label,t.name,'Trabalho') work_type,t.name template_name
      FROM events e
      JOIN event_members m ON m.event_id=e.id
      LEFT JOIN templates t ON t.id=e.template_id
      WHERE m.user_id=$1
        AND e.archived_at IS NULL
        AND e.deleted_at IS NULL
      ORDER BY e.event_date DESC NULLS LAST,e.id DESC`,[req.user.id]);
  }
  const rows=[];
  for(const e of r.rows){
    const p=(await q(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE status='Concluída')::int done
      FROM event_tasks WHERE event_id=$1`,[e.id])).rows[0];
    e.progress=p.total?Math.round((p.done/p.total)*100):0;
    rows.push(e);
  }
  res.json(rows);
});
app.get('/api/calendar-events',auth,async(req,res)=>{
  let r;
  const baseSelect=`SELECT
      et.id task_id,
      et.event_id,
      et.phase_name,
      et.category_name,
      et.name task_name,
      et.status,
      et.start_date,
      et.end_date,
      et.notes,
      e.name event_name,
      e.client,
      e.place,
      COALESCE(t.type_label,t.name,'Trabalho') work_type,
      COALESCE(
        json_agg(
          json_build_object(
            'id',u.id,
            'name',u.name,
            'avatar_data',u.avatar_data
          )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'::json
      ) responsibles
    FROM event_tasks et
    JOIN events e ON e.id=et.event_id
    LEFT JOIN templates t ON t.id=e.template_id
    LEFT JOIN event_task_responsibles er ON er.task_id=et.id
    LEFT JOIN users u ON u.id=er.user_id AND u.active=TRUE`;

  if(req.user.role==='admin'){
    r=await q(`${baseSelect}
      WHERE e.archived_at IS NULL
        AND e.deleted_at IS NULL
        AND et.status <> 'Concluída'
        AND (et.start_date IS NOT NULL OR et.end_date IS NOT NULL)
      GROUP BY et.id,e.id,t.id
      ORDER BY COALESCE(et.start_date,et.end_date),e.name,et.position,et.id`);
  }else{
    r=await q(`${baseSelect}
      JOIN event_members em ON em.event_id=e.id
      WHERE em.user_id=$1
        AND e.archived_at IS NULL
        AND e.deleted_at IS NULL
        AND et.status <> 'Concluída'
        AND (et.start_date IS NOT NULL OR et.end_date IS NOT NULL)
      GROUP BY et.id,e.id,t.id
      ORDER BY COALESCE(et.start_date,et.end_date),e.name,et.position,et.id`,[req.user.id]);
  }

  res.json(r.rows);
});

app.post('/api/events',auth,admin,async(req,res)=>{
  const {name,client,event_date,end_date,place,participants,additional_info,template_id}=req.body||{};
  if(!String(name||'').trim())return res.status(400).json({error:'Nome do trabalho é obrigatório'});
  const tid=Number(template_id);
  if(!tid)return res.status(400).json({error:'Selecione um modelo para o trabalho'});
  const t=(await q('SELECT * FROM templates WHERE id=$1 AND active=TRUE',[tid])).rows[0];
  if(!t)return res.status(400).json({error:'Modelo inválido ou inativo'});
  const phases=(await q('SELECT * FROM template_phases WHERE template_id=$1 ORDER BY position,id',[t.id])).rows;
  const db=await pool.connect();
  try{
    await db.query('BEGIN');
    const e=(await db.query(
      `INSERT INTO events(name,client,event_date,end_date,place,participants,additional_info,template_id,template_version,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        String(name).trim(),
        client||'',
        event_date||null,
        end_date||null,
        place||'',
        participants!==undefined&&participants!==''?Number(participants):null,
        additional_info||'',
        t.id,t.version,req.user.id
      ]
    )).rows[0];
    let pos=0;
    for(const p of phases){
      const cats=(await db.query('SELECT * FROM template_categories WHERE phase_id=$1 ORDER BY position,id',[p.id])).rows;
      for(const c of cats){
        const tasks=(await db.query('SELECT * FROM template_tasks WHERE category_id=$1 ORDER BY position,id',[c.id])).rows;
        for(const task of tasks){
          await db.query(
            `INSERT INTO event_tasks(event_id,phase_name,category_name,name,position)
             VALUES($1,$2,$3,$4,$5)`,
            [e.id,p.name,c.name,task.name,pos++]
          );
        }
      }
    }
    await db.query('COMMIT');res.json({id:e.id});
  }catch(err){
    await db.query('ROLLBACK');res.status(500).json({error:err.message});
  }finally{db.release()}
});

app.get('/api/events/:id',auth,async(req,res)=>{
  const id=Number(req.params.id);
  const e=(await q(`SELECT e.*,COALESCE(t.type_label,t.name,'Trabalho') work_type,t.name template_name FROM events e LEFT JOIN templates t ON t.id=e.template_id WHERE e.id=$1`,[id])).rows[0];
  if(!e)return res.status(404).json({error:'Evento não encontrado'});
  if(e.deleted_at)return res.status(404).json({error:'Trabalho não encontrado'});
  if(e.archived_at && req.user.role!=='admin')return res.status(404).json({error:'Trabalho não encontrado'});
  if(!(await canAccessEvent(req.user,id)))return res.status(403).json({error:'Sem acesso'});

  e.tasks=(await q(`SELECT et.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id',ru.id,
            'name',ru.name,
            'email',ru.email,
            'role',ru.role,
            'avatar_data',ru.avatar_data
          )
          ORDER BY ru.name
        ) FILTER (WHERE ru.id IS NOT NULL),
        '[]'::json
      ) AS responsibles
    FROM event_tasks et
    LEFT JOIN event_task_responsibles tr ON tr.task_id=et.id
    LEFT JOIN users ru ON ru.id=tr.user_id AND ru.active=TRUE
    WHERE et.event_id=$1
    GROUP BY et.id
    ORDER BY et.position,et.id`,[id])).rows;

  e.members=(await q(`SELECT u.id,u.name,u.email,u.role
    FROM event_members em JOIN users u ON u.id=em.user_id
    WHERE em.event_id=$1
    ORDER BY u.name`,[id])).rows;

  res.json(e);
});


/* Edit event details */
app.patch('/api/events/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const current=(await q('SELECT * FROM events WHERE id=$1',[id])).rows[0];
  if(!current)return res.status(404).json({error:'Evento não encontrado'});

  const name=req.body.name!==undefined?String(req.body.name||'').trim():current.name;
  const client=req.body.client!==undefined?String(req.body.client||'').trim():current.client;
  const event_date=req.body.event_date!==undefined?(req.body.event_date||null):current.event_date;
  const end_date=req.body.end_date!==undefined?(req.body.end_date||null):current.end_date;
  const place=req.body.place!==undefined?String(req.body.place||'').trim():current.place;
  const participants=req.body.participants!==undefined
    ? (req.body.participants===''||req.body.participants===null?null:Number(req.body.participants))
    : current.participants;
  const additional_info=req.body.additional_info!==undefined
    ? String(req.body.additional_info||'')
    : String(current.additional_info||'');

  if(!name)return res.status(400).json({error:'Nome do evento é obrigatório'});
  if(event_date&&end_date&&new Date(end_date)<new Date(event_date))
    return res.status(400).json({error:'A data de término não pode ser anterior à data de início'});
  if(participants!==null&&(!Number.isInteger(participants)||participants<0))
    return res.status(400).json({error:'Número de participantes inválido'});

  await q(
    `UPDATE events SET
      name=$1,client=$2,event_date=$3,end_date=$4,place=$5,participants=$6,additional_info=$7
     WHERE id=$8`,
    [name,client,event_date,end_date,place,participants,additional_info,id]
  );

  await q(
    `INSERT INTO audit_log(event_id,user_id,action,details)
     VALUES($1,$2,'event_updated',$3::jsonb)`,
    [id,req.user.id,JSON.stringify({name,client,event_date,end_date,place,participants,additional_info})]
  );

  res.json({ok:true});
});

/* Event members */
app.get('/api/events/:id/members',auth,async(req,res)=>{
  const id=Number(req.params.id);
  if(!(await canAccessEvent(req.user,id)))return res.status(403).json({error:'Sem acesso'});
  const r=await q(`SELECT u.id,u.name,u.email,u.role
    FROM event_members em JOIN users u ON u.id=em.user_id
    WHERE em.event_id=$1 ORDER BY u.name`,[id]);
  res.json(r.rows);
});

app.post('/api/events/:id/members',auth,admin,async(req,res)=>{
  const eventId=Number(req.params.id),userId=Number(req.body?.user_id);
  const u=(await q('SELECT id,active FROM users WHERE id=$1',[userId])).rows[0];
  if(!u||!u.active)return res.status(400).json({error:'Usuário inválido ou inativo'});
  await q('INSERT INTO event_members(event_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[eventId,userId]);
  await q(`INSERT INTO audit_log(event_id,user_id,action,details)
    VALUES($1,$2,'member_added',$3::jsonb)`,
    [eventId,req.user.id,JSON.stringify({member_user_id:userId})]);
  res.json({ok:true});
});

app.delete('/api/events/:id/members/:userId',auth,admin,async(req,res)=>{
  const eventId=Number(req.params.id),userId=Number(req.params.userId);
  await q(`DELETE FROM event_task_responsibles tr
    USING event_tasks et
    WHERE tr.task_id=et.id AND et.event_id=$1 AND tr.user_id=$2`,[eventId,userId]);
  await q('UPDATE event_tasks SET responsible_user_id=NULL WHERE event_id=$1 AND responsible_user_id=$2',[eventId,userId]);
  await q('DELETE FROM event_members WHERE event_id=$1 AND user_id=$2',[eventId,userId]);
  await q(`INSERT INTO audit_log(event_id,user_id,action,details)
    VALUES($1,$2,'member_removed',$3::jsonb)`,
    [eventId,req.user.id,JSON.stringify({member_user_id:userId})]);
  res.json({ok:true});
});

/* Event-specific task */
app.post('/api/events/:id/tasks',auth,editor,async(req,res)=>{
  const eventId=Number(req.params.id);
  if(!(await canAccessEvent(req.user,eventId)))return res.status(403).json({error:'Sem acesso'});
  const phase_name=String(req.body?.phase_name||'').trim();
  const category_name=String(req.body?.category_name||'').trim();
  const name=String(req.body?.name||'').trim();
  if(!phase_name||!category_name||!name)
    return res.status(400).json({error:'Fase, categoria e tarefa são obrigatórias'});
  const pos=(await q('SELECT COALESCE(MAX(position),-1)+1 p FROM event_tasks WHERE event_id=$1',[eventId])).rows[0].p;
  const r=await q(`INSERT INTO event_tasks(event_id,phase_name,category_name,name,position,updated_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [eventId,phase_name,category_name,name,pos,req.user.id]);
  await q(`INSERT INTO audit_log(event_id,task_id,user_id,action,details)
    VALUES($1,$2,$3,'task_created',$4::jsonb)`,
    [eventId,r.rows[0].id,req.user.id,JSON.stringify({phase_name,category_name,name})]);
  res.json(r.rows[0]);
});

app.patch('/api/tasks/:id',auth,async(req,res)=>{
  const id=Number(req.params.id);
  const task=(await q('SELECT * FROM event_tasks WHERE id=$1',[id])).rows[0];
  if(!task)return res.status(404).json({error:'Tarefa não encontrada'});
  if(!(await canAccessEvent(req.user,task.event_id)))return res.status(403).json({error:'Sem acesso'});
  if(req.user.role==='guest')return res.status(403).json({error:'Convidados possuem acesso somente para visualização'});

  let status=req.body.status??task.status;
  let name=task.name,phase_name=task.phase_name,category_name=task.category_name;
  let start_date=req.body.start_date!==undefined?(req.body.start_date||null):task.start_date;
  let end_date=req.body.end_date!==undefined?(req.body.end_date||null):task.end_date;
  let notes=req.body.notes!==undefined?String(req.body.notes||''):String(task.notes||'');

  const validStatuses=['Não Iniciada','Em Andamento','Concluída','Atrasada'];
  if(!validStatuses.includes(status))return res.status(400).json({error:'Status inválido'});
  if(start_date&&end_date&&new Date(end_date)<new Date(start_date))
    return res.status(400).json({error:'A data final não pode ser anterior à data inicial'});

  if(['admin','collaborator'].includes(req.user.role)){
    if(req.body.name!==undefined)name=String(req.body.name).trim();
    if(req.user.role==='admin'){
      if(req.body.phase_name!==undefined)phase_name=String(req.body.phase_name).trim();
      if(req.body.category_name!==undefined)category_name=String(req.body.category_name).trim();
    }
  }

  let responsibleIds=null;
  if(req.body.responsible_user_ids!==undefined){
    responsibleIds=[...new Set(
      (Array.isArray(req.body.responsible_user_ids)?req.body.responsible_user_ids:[])
        .map(Number).filter(Boolean)
    )];

    if(responsibleIds.length){
      const valid=(await q(
        `SELECT u.id,u.role
         FROM event_members em
         JOIN users u ON u.id=em.user_id
         WHERE em.event_id=$1 AND em.user_id = ANY($2::int[]) AND u.active=TRUE`,
        [task.event_id,responsibleIds]
      )).rows;

      if(valid.length!==responsibleIds.length)
        return res.status(400).json({error:'Todos os responsáveis precisam estar adicionados ao evento'});
      if(valid.some(x=>x.role==='guest'))
        return res.status(400).json({error:'Convidados não podem ser definidos como responsáveis'});
    }
  }else if(req.body.responsible_user_id!==undefined){
    const single=req.body.responsible_user_id?Number(req.body.responsible_user_id):null;
    responsibleIds=single?[single]:[];
  }

  const db=await pool.connect();
  try{
    await db.query('BEGIN');

    await db.query(`UPDATE event_tasks SET
        name=$1,phase_name=$2,category_name=$3,status=$4,
        start_date=$5,end_date=$6,notes=$7,updated_by=$8,updated_at=NOW()
      WHERE id=$9`,
      [name,phase_name,category_name,status,start_date,end_date,notes,req.user.id,id]);

    if(responsibleIds!==null){
      await db.query('DELETE FROM event_task_responsibles WHERE task_id=$1',[id]);
      for(const uid of responsibleIds){
        await db.query(
          'INSERT INTO event_task_responsibles(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [id,uid]
        );
      }
      // Keep legacy column synchronized with the first responsible for backwards compatibility.
      await db.query('UPDATE event_tasks SET responsible_user_id=$1 WHERE id=$2',
        [responsibleIds[0]||null,id]);
    }

    await db.query(`INSERT INTO audit_log(event_id,task_id,user_id,action,details)
      VALUES($1,$2,$3,'task_update',$4::jsonb)`,
      [task.event_id,id,req.user.id,JSON.stringify({
        name,phase_name,category_name,status,
        responsible_user_ids:responsibleIds,
        start_date,end_date,notes
      })]);

    await db.query('COMMIT');
    res.json({ok:true});
  }catch(e){
    await db.query('ROLLBACK');
    res.status(500).json({error:e.message});
  }finally{db.release()}
});

app.delete('/api/tasks/:id',auth,editor,async(req,res)=>{
  const id=Number(req.params.id);
  const task=(await q('SELECT * FROM event_tasks WHERE id=$1',[id])).rows[0];
  if(!task)return res.status(404).json({error:'Tarefa não encontrada'});
  if(!(await canAccessEvent(req.user,task.event_id)))return res.status(403).json({error:'Sem acesso'});
  await q(`INSERT INTO audit_log(event_id,user_id,action,details)
    VALUES($1,$2,'task_deleted',$3::jsonb)`,
    [task.event_id,req.user.id,JSON.stringify({deleted_task_id:id,name:task.name})]);
  await q('DELETE FROM event_tasks WHERE id=$1',[id]);
  res.json({ok:true});
});


/* Rename one category inside one phase of an existing event */
app.patch('/api/events/:id/categories',auth,admin,async(req,res)=>{
  const eventId=Number(req.params.id);
  const phase_name=String(req.body?.phase_name||'').trim();
  const old_name=String(req.body?.old_name||'').trim();
  const new_name=String(req.body?.new_name||'').trim();
  if(!phase_name||!old_name||!new_name)
    return res.status(400).json({error:'Fase, categoria atual e novo nome são obrigatórios'});

  const exists=(await q(
    'SELECT 1 FROM event_tasks WHERE event_id=$1 AND phase_name=$2 AND category_name=$3 LIMIT 1',
    [eventId,phase_name,old_name]
  )).rowCount;
  if(!exists)return res.status(404).json({error:'Categoria não encontrada neste evento'});

  await q(
    `UPDATE event_tasks SET category_name=$1,updated_by=$2,updated_at=NOW()
     WHERE event_id=$3 AND phase_name=$4 AND category_name=$5`,
    [new_name,req.user.id,eventId,phase_name,old_name]
  );

  await q(
    `INSERT INTO audit_log(event_id,user_id,action,details)
     VALUES($1,$2,'category_renamed',$3::jsonb)`,
    [eventId,req.user.id,JSON.stringify({phase_name,old_name,new_name})]
  );
  res.json({ok:true});
});

/* Reorder/move tasks across phases and categories */
app.post('/api/events/:id/reorder-tasks',auth,admin,async(req,res)=>{
  const eventId=Number(req.params.id);
  const items=Array.isArray(req.body?.items)?req.body.items:[];
  if(!items.length)return res.status(400).json({error:'Nenhuma tarefa recebida para reorganização'});

  const ids=items.map(x=>Number(x.id)).filter(Boolean);
  const db=await pool.connect();
  try{
    await db.query('BEGIN');

    const owned=(await db.query(
      'SELECT id FROM event_tasks WHERE event_id=$1 AND id = ANY($2::int[])',
      [eventId,ids]
    )).rows;
    if(owned.length!==ids.length)throw new Error('Uma ou mais tarefas não pertencem a este evento');

    for(let i=0;i<items.length;i++){
      const x=items[i];
      const phase_name=String(x.phase_name||'').trim();
      const category_name=String(x.category_name||'').trim();
      if(!phase_name||!category_name)throw new Error('Fase e categoria são obrigatórias');
      await db.query(
        `UPDATE event_tasks
         SET phase_name=$1,category_name=$2,position=$3,updated_by=$4,updated_at=NOW()
         WHERE id=$5 AND event_id=$6`,
        [phase_name,category_name,i,req.user.id,Number(x.id),eventId]
      );
    }

    await db.query(
      `INSERT INTO audit_log(event_id,user_id,action,details)
       VALUES($1,$2,'tasks_reordered',$3::jsonb)`,
      [eventId,req.user.id,JSON.stringify({task_count:items.length})]
    );

    await db.query('COMMIT');
    res.json({ok:true});
  }catch(e){
    await db.query('ROLLBACK');
    res.status(400).json({error:e.message});
  }finally{
    db.release();
  }
});

/* My tasks */
app.get('/api/my-tasks',auth,async(req,res)=>{
  const r=await q(`SELECT et.id,et.name,et.phase_name,et.category_name,et.status,
      et.notes,et.start_date,et.end_date,et.updated_at,
      e.id event_id,e.name event_name,e.client,e.event_date
    FROM event_task_responsibles tr
    JOIN event_tasks et ON et.id=tr.task_id
    JOIN events e ON e.id=et.event_id
    WHERE tr.user_id=$1
      AND (
        $2='admin' OR EXISTS (
          SELECT 1 FROM event_members em WHERE em.event_id=et.event_id AND em.user_id=$1
        )
      )
    ORDER BY e.event_date NULLS LAST,e.name,et.position`,
    [req.user.id,req.user.role]);
  res.json(r.rows);
});

app.get('/api/events/:id/audit',auth,async(req,res)=>{
  const id=Number(req.params.id);
  if(!(await canAccessEvent(req.user,id)))return res.status(403).json({error:'Sem acesso'});
  const r=await q(`SELECT a.*,u.name user_name,et.name task_name
    FROM audit_log a
    LEFT JOIN users u ON u.id=a.user_id
    LEFT JOIN event_tasks et ON et.id=a.task_id
    WHERE a.event_id=$1
    ORDER BY a.id DESC LIMIT 200`,[id]);
  res.json(r.rows);
});

app.patch('/api/events/:id/archive',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const e=(await q('SELECT id,name,archived_at,deleted_at FROM events WHERE id=$1',[id])).rows[0];
  if(!e)return res.status(404).json({error:'Trabalho não encontrado'});
  if(e.deleted_at)return res.status(400).json({error:'Restaure o trabalho da lixeira antes de arquivá-lo'});
  if(e.archived_at)return res.status(400).json({error:'Trabalho já está arquivado'});
  await q('UPDATE events SET archived_at=NOW(),archived_by=$1 WHERE id=$2',[req.user.id,id]);
  await q('INSERT INTO audit_log(event_id,user_id,action,details) VALUES($1,$2,$3,$4)',
    [id,req.user.id,'event_archived',JSON.stringify({name:e.name})]);
  res.json({ok:true});
});

app.patch('/api/events/:id/unarchive',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const e=(await q('SELECT id,name,deleted_at FROM events WHERE id=$1',[id])).rows[0];
  if(!e)return res.status(404).json({error:'Trabalho não encontrado'});
  if(e.deleted_at)return res.status(400).json({error:'O trabalho está na lixeira'});
  await q('UPDATE events SET archived_at=NULL,archived_by=NULL WHERE id=$1',[id]);
  await q('INSERT INTO audit_log(event_id,user_id,action,details) VALUES($1,$2,$3,$4)',
    [id,req.user.id,'event_unarchived',JSON.stringify({name:e.name})]);
  res.json({ok:true});
});

app.delete('/api/events/:id',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const e=(await q('SELECT id,name,deleted_at FROM events WHERE id=$1',[id])).rows[0];
  if(!e)return res.status(404).json({error:'Trabalho não encontrado'});
  if(e.deleted_at)return res.status(400).json({error:'Trabalho já está na lixeira'});
  await q(`UPDATE events
    SET deleted_at=NOW(),deleted_by=$1,archived_at=NULL,archived_by=NULL
    WHERE id=$2`,[req.user.id,id]);
  await q('INSERT INTO audit_log(event_id,user_id,action,details) VALUES($1,$2,$3,$4)',
    [id,req.user.id,'event_moved_to_trash',JSON.stringify({name:e.name})]);
  res.json({ok:true});
});

app.get('/api/events-archived',auth,admin,async(req,res)=>{
  const r=await q(`SELECT e.*,COALESCE(t.type_label,t.name,'Trabalho') work_type,t.name template_name
    FROM events e
    LEFT JOIN templates t ON t.id=e.template_id
    WHERE e.archived_at IS NOT NULL AND e.deleted_at IS NULL
    ORDER BY e.archived_at DESC,e.id DESC`);
  res.json(r.rows);
});

app.get('/api/events-trash',auth,admin,async(req,res)=>{
  const r=await q(`SELECT e.*,COALESCE(t.type_label,t.name,'Trabalho') work_type,t.name template_name
    FROM events e
    LEFT JOIN templates t ON t.id=e.template_id
    WHERE e.deleted_at IS NOT NULL
    ORDER BY e.deleted_at DESC,e.id DESC`);
  res.json(r.rows);
});

app.patch('/api/events/:id/restore',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const e=(await q('SELECT id,name,deleted_at FROM events WHERE id=$1',[id])).rows[0];
  if(!e)return res.status(404).json({error:'Trabalho não encontrado'});
  if(!e.deleted_at)return res.status(400).json({error:'Trabalho não está na lixeira'});
  await q('UPDATE events SET deleted_at=NULL,deleted_by=NULL WHERE id=$1',[id]);
  await q('INSERT INTO audit_log(event_id,user_id,action,details) VALUES($1,$2,$3,$4)',
    [id,req.user.id,'event_restored',JSON.stringify({name:e.name})]);
  res.json({ok:true});
});

app.delete('/api/events/:id/permanent',auth,admin,async(req,res)=>{
  const id=Number(req.params.id);
  const e=(await q('SELECT id,name,deleted_at FROM events WHERE id=$1',[id])).rows[0];
  if(!e)return res.status(404).json({error:'Trabalho não encontrado'});
  if(!e.deleted_at)return res.status(400).json({error:'Somente trabalhos na lixeira podem ser excluídos permanentemente'});
  // ON DELETE CASCADE remove membros, tarefas e demais registros vinculados.
  await q('DELETE FROM events WHERE id=$1',[id]);
  res.json({ok:true});
});

app.get('/health',(req,res)=>{
  res.set('Cache-Control','no-store');
  res.status(200).json({ok:true,service:'antonicelli-projetos'});
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

try{
  validateEnvironment();
  init()
    .then(()=>app.listen(PORT,'0.0.0.0',()=>{
      const publicUrl=process.env.RENDER_EXTERNAL_URL||`http://localhost:${PORT}`;
      console.log(`Antonicelli V4.2.1 Render rodando em ${publicUrl}`);
    }))
    .catch(e=>{console.error('Falha ao iniciar:',e);process.exit(1)});
}catch(e){
  console.error('Configuração inválida:',e.message);
  process.exit(1);
}
