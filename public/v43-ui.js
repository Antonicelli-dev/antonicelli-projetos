let viewRevision=0;
function beginView(route){
  const hash='#'+route;
  if(location.hash!==hash)history.pushState({},'',hash);
  closeModal();
  return ++viewRevision;
}
async function restoreRoute(){
  if(!me)return showLogin();
  const route=location.hash.slice(1)||'/trabalhos';
  try{
    if(/^\/trabalho\/\d+$/.test(route))return await openEvent(Number(route.split('/')[2]));
    if(route==='/calendario')return await openCalendar();
    if(route==='/minhas-tarefas')return await openMyTasks();
    if(me.role==='admin'){
      if(route==='/arquivados')return await openArchivedEvents();
      if(route==='/lixeira')return await openTrash();
      if(/^\/modelos(?:\/\d+)?$/.test(route))return await openTemplateEditor(Number(route.split('/')[2])||null);
      if(route==='/usuarios')return await openUsers();
    }
    await loadEvents();
  }catch(e){
    app.innerHTML=`<div class="card"><h2>Não foi possível abrir esta tela</h2><p>${esc(e.message)}</p><button id="routeRetry" class="primary">Tentar novamente</button> <button id="routeHome" class="secondary">Voltar aos trabalhos</button></div>`;
    document.getElementById('routeRetry').onclick=restoreRoute;
    document.getElementById('routeHome').onclick=loadEvents;
  }
}
window.addEventListener('popstate',()=>{if(me)restoreRoute()});
function positionNoteTooltip(event){
  const icon=event.target.closest?.('.noteIcon');if(!icon)return;
  const tooltip=icon.querySelector('.noteTooltip');if(!tooltip)return;
  const rect=icon.getBoundingClientRect();
  const width=Math.min(340,window.innerWidth-24);
  tooltip.style.width=width+'px';tooltip.style.maxWidth=width+'px';
  tooltip.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
  tooltip.style.top=Math.max(12,Math.min(rect.bottom+8,window.innerHeight-tooltip.offsetHeight-12))+'px';
}
document.addEventListener('mouseover',positionNoteTooltip);
document.addEventListener('focusin',positionNoteTooltip);
function cleanRich(html){return DOMPurify.sanitize(html||'',{ALLOWED_TAGS:['p','br','div','strong','b','em','i','u','ul','ol','li'],ALLOWED_ATTR:[]})}
function eventRich(event){return event.additional_info_html!=null?cleanRich(event.additional_info_html):esc(event.additional_info||'').replace(/\n/g,'<br>')}
function richEditorMarkup(id){
  return `<div class="richToolbar" data-editor="${id}" role="toolbar" aria-label="Formatação">${[['bold','Negrito'],['italic','Itálico'],['underline','Sublinhado'],['insertUnorderedList','Lista'],['insertOrderedList','Lista numerada'],['removeFormat','Limpar formato']].map(([cmd,label])=>`<button type="button" class="secondary mini" data-command="${cmd}">${label}</button>`).join('')}</div><div id="${id}" class="richEditor" contenteditable="true" role="textbox" aria-label="Informações adicionais" aria-multiline="true"></div>`;
}
function setupRichEditor(id,event){
  const el=document.getElementById(id);el.innerHTML=eventRich(event);
  document.querySelectorAll(`[data-editor="${id}"] button`).forEach(b=>{
    b.onmousedown=e=>e.preventDefault();
    b.onclick=()=>{el.focus();document.execCommand(b.dataset.command,false,null)};
  });
  // Paste only text; keep foreign markup and remote images out of the editor.
  el.onpaste=e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))};
  el.ondrop=e=>e.preventDefault();
}
function clientLogo(event){return /^data:image\/(png|jpe?g|webp);base64,/i.test(event.client_logo_data||'')?`<img class="clientLogo" src="${esc(event.client_logo_data)}" alt="Logo do cliente">`:''}
function logoPickerMarkup(){return '<label>Logo do cliente</label><input id="clientLogoFile" type="file" accept="image/png,image/jpeg,image/webp"><div class="small">PNG, JPEG ou WebP, até 5 MB. A imagem será reduzida automaticamente.</div><div id="clientLogoPreview"></div><button id="removeClientLogo" type="button" class="secondary mini">Remover logo</button><div id="clientLogoError" class="error" hidden></div>'}
function setupLogoPicker(initial=''){
  let data=initial||'',pending=Promise.resolve(),revision=0,error=null;
  const input=document.getElementById('clientLogoFile'),preview=document.getElementById('clientLogoPreview'),box=document.getElementById('clientLogoError');
  const render=()=>preview.innerHTML=clientLogo({client_logo_data:data});render();
  input.onchange=()=>{
    const file=input.files[0],r=++revision;error=null;box.hidden=true;
    if(!file)return;
    pending=(async()=>{
      try{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Escolha PNG, JPEG ou WebP de até 5 MB.');
        const image=await createImageBitmap(file);
        const scale=Math.min(1,512/image.width,512/image.height),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();
        const result=canvas.toDataURL('image/webp',.85);
        if(result.length>1100000)throw Error('Imagem muito grande após otimização.');
        if(r===revision){data=result;render()}
      }catch(e){if(r===revision){error=e;box.textContent=e.message;box.hidden=false}}
    })();
  };
  document.getElementById('removeClientLogo').onclick=()=>{++revision;data='';input.value='';error=null;box.hidden=true;render()};
  return async()=>{await pending;if(error)throw error;return data};
}
function refreshMemberPickers(){
  const filter=document.getElementById('filterResp');
  if(filter){const selected=filter.value;filter.innerHTML='<option value="">Todos os responsáveis</option><option value="none">Sem responsável</option>'+currentEvent.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');filter.value=selected}
  document.querySelectorAll('.taskRespQuick').forEach(select=>{
    const selected=select.value;
    select.innerHTML='<option value="">Selecionar responsável...</option>'+currentEvent.members.filter(m=>m.role!=='guest').map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');select.value=selected;
  });
}
async function downloadWorkCsv(id){
  const btn=document.getElementById('exportCsvBtn');btn.disabled=true;
  try{
    const response=await fetch('/api/events/'+id+'/export-csv',{headers:{Authorization:'Bearer '+token}});
    if(!response.ok)throw Error((await response.json()).error||'Não foi possível exportar.');
    const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download='trabalho-'+id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){alert(e.message)}finally{btn.disabled=false}
}
function openCsvImport(){
  showModal(`<h2>Importar modelo de CSV</h2><p>Arquivo UTF-8, separado por vírgulas, com cabeçalho <b>Fase,Categoria,Tarefa</b>. Até 1 MB e 5.000 tarefas.</p><p><a href="/modelo-exemplo.csv" download>Baixar exemplo</a></p><form id="csvForm"><label>Nome do modelo</label><input id="csvName" maxlength="200" required><label>Arquivo CSV</label><input id="csvFile" type="file" accept=".csv,text/csv" required><div id="csvError" class="error" hidden></div><div class="actions"><button type="button" id="csvCancel" class="secondary">Cancelar</button><button id="csvSubmit" class="primary">Importar modelo</button></div></form>`);
  document.getElementById('csvCancel').onclick=closeModal;
  document.getElementById('csvForm').onsubmit=async e=>{
    e.preventDefault();const btn=document.getElementById('csvSubmit'),box=document.getElementById('csvError');btn.disabled=true;box.hidden=true;
    try{
      const file=document.getElementById('csvFile').files[0];if(!file||file.size>1000000)throw Error('Selecione um CSV de até 1 MB.');
      let csv;try{csv=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer())}catch{throw Error('Salve o CSV na codificação UTF-8.')}
      const result=await api('/api/templates/import-csv',{method:'POST',body:{name:document.getElementById('csvName').value.trim(),csv}});
      closeModal();await openTemplateEditor(result.id,true);
    }catch(e){box.textContent=e.message;box.hidden=false;btn.disabled=false}
  };
}
async function openUsers(){
  const view=beginView('/usuarios');userbar();const users=await api('/api/users');if(view!==viewRevision)return;
  app.innerHTML=`<div class="toolbar"><h1>Usuários ativos</h1><button id="usersBack" class="secondary">Voltar aos trabalhos</button></div><div class="note">O nível de acesso vale para toda a plataforma. Seu próprio acesso de administrador está protegido.</div><div class="card">${users.map(u=>`<div class="member"><div><b>${esc(u.name)}</b><div class="small">${esc(u.email)}</div></div><select class="userRole" aria-label="Nível de acesso de ${esc(u.name)}" data-id="${u.id}" data-role="${u.role}" ${Number(u.id)===Number(me.id)?'disabled':''}>${['admin','collaborator','guest'].map(role=>`<option value="${role}" ${role===u.role?'selected':''}>${esc(roleLabel(role))}</option>`).join('')}</select></div>`).join('')}</div>`;
  document.getElementById('usersBack').onclick=loadEvents;
  document.querySelectorAll('.userRole').forEach(select=>select.onchange=async()=>{
    const previous=select.dataset.role;
    if(!confirm('Alterar o acesso deste usuário em toda a plataforma?')){select.value=previous;return}
    select.disabled=true;
    try{const user=await api('/api/users/'+select.dataset.id+'/role',{method:'PATCH',body:{role:select.value}});select.dataset.role=user.role}
    catch(e){select.value=previous;alert(e.message)}finally{select.disabled=false}
  });
}
