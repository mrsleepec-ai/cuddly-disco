
(function(){
  // Keys
  var IDB_TASKS_KEY = 'tasks';

  // State
  var state = {
    tasks: [],
    currentTaskId: null,
    currentFolderId: null,
    currentSubtaskRef: null // { taskId, folderId|null, subtaskId }
  };

  // DOM
  var els = {
    viewList: document.getElementById('view-list'),
    viewTask: document.getElementById('view-task'),
    viewFolder: document.getElementById('view-folder'),
    viewSubtask: document.getElementById('view-subtask'),

    // list
    newTaskTitle: document.getElementById('newTaskTitle'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    taskList: document.getElementById('taskList'),

    // task
    backToListBtn: document.getElementById('backToListBtn'),
    taskTitle: document.getElementById('taskTitle'),
    renameTaskBtn: document.getElementById('renameTaskBtn'),
    deleteTaskBtn: document.getElementById('deleteTaskBtn'),
    exportTaskCompactBtn: document.getElementById('exportTaskCompactBtn'),
    exportTaskDetailedBtn: document.getElementById('exportTaskDetailedBtn'),
    addFolderBtn: document.getElementById('addFolderBtn'),
    addSubtaskBtn: document.getElementById('addSubtaskBtn'),
    taskItems: document.getElementById('taskItems'),

    // folder
    backToTaskBtn: document.getElementById('backToTaskBtn'),
    folderTitle: document.getElementById('folderTitle'),
    renameFolderBtn: document.getElementById('renameFolderBtn'),
    deleteFolderBtn: document.getElementById('deleteFolderBtn'),
    folderItems: document.getElementById('folderItems'),

    // subtask
    backFromSubBtn: document.getElementById('backFromSubBtn'),
    subtaskTitle: document.getElementById('subtaskTitle'),
    renameSubtaskBtn: document.getElementById('renameSubtaskBtn'),
    deleteSubtaskBtn: document.getElementById('deleteSubtaskBtn'),
    subtaskNote: document.getElementById('subtaskNote'),
    saveSubtaskNoteBtn: document.getElementById('saveSubtaskNoteBtn'),
    attachments: document.getElementById('attachments'),
    attachCameraInput: document.getElementById('attachCameraInput'),
    attachGalleryInput: document.getElementById('attachGalleryInput'),
    attachFileInput: document.getElementById('attachFileInput')
  };

  // Utils
  function uid(){ return 'id_' + Math.random().toString(36).slice(2,10); }
  function nowISO(){ return new Date().toISOString(); }
  function findTask(id){ for (var i=0;i<state.tasks.length;i++) if (state.tasks[i].id === id) return state.tasks[i]; return null; }
  function persist(){ return db.setJSON(IDB_TASKS_KEY, state.tasks); }

  // Boot
  db.getJSON(IDB_TASKS_KEY, []).then(function(tasks){
    state.tasks = Array.isArray(tasks) ? tasks : [];
    if (!state.tasks.length){
      state.tasks = [{
        id: uid(), title:'Пример заметки', createdAt: nowISO(), items:[
          { id: uid(), type:'subtask', title:'Подзадача A', note:'', attachments:[], createdAt: nowISO() },
          { id: uid(), type:'folder', title:'Папка X', items:[
            { id: uid(), type:'subtask', title:'Вложенная подзадача', note:'', attachments:[], createdAt: nowISO() }
          ]}
        ]
      }];
      persist();
    }
    renderList();
  });

  // Renders
  function renderList(){
    switchView('list');
    while (els.taskList.firstChild) els.taskList.removeChild(els.taskList.firstChild);
    if (!state.tasks.length){
      var empty = document.createElement('div'); empty.className='card';
      empty.innerHTML = '<div class="title">Заметок пока нет</div><div class="muted">Создайте первую заметку выше</div>';
      els.taskList.appendChild(empty);
      return;
    }
    for (var i=0;i<state.tasks.length;i++) (function(t){
      var card = document.createElement('div'); card.className='card';
      var title = document.createElement('div'); title.className='title'; title.textContent = t.title;
      var row = document.createElement('div'); row.className='row';
      var openBtn = document.createElement('button'); openBtn.className='btn ghost'; openBtn.textContent='Открыть';
      var renameBtn = document.createElement('button'); renameBtn.className='btn ghost'; renameBtn.textContent='Переименовать';
      var delBtn = document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='Удалить';
      var exp = document.createElement('div'); exp.className='dropdown';
      var expBtn = document.createElement('button'); expBtn.className='btn ghost'; expBtn.textContent='Экспорт';
      var menu = document.createElement('div'); menu.className='dropdown-menu';
      var b1 = document.createElement('button'); b1.textContent = 'PDF — Компактный';
      var b2 = document.createElement('button'); b2.textContent = 'PDF — Подробный';
      menu.appendChild(b1); menu.appendChild(b2); exp.appendChild(expBtn); exp.appendChild(menu);

      openBtn.addEventListener('click', function(){ openTask(t.id); });
      renameBtn.addEventListener('click', function(){ var s = prompt('Новое имя', t.title || ''); if (s!=null){ t.title=s.trim()||t.title; persist().then(renderList); } });
      delBtn.addEventListener('click', function(){ if(confirm('Удалить заметку и все вложения?')){ deleteTask(t.id); } });
      b1.addEventListener('click', function(){ exportTask(t.id, 'compact'); });
      b2.addEventListener('click', function(){ exportTask(t.id, 'detailed'); });

      row.appendChild(openBtn); row.appendChild(renameBtn); row.appendChild(exp); row.appendChild(delBtn);
      card.appendChild(title); card.appendChild(row);
      els.taskList.appendChild(card);
    })(state.tasks[i]);
  }

  function renderTask(task){
    switchView('task');
    els.taskTitle.textContent = task.title;
    while (els.taskItems.firstChild) els.taskItems.removeChild(els.taskItems.firstChild);

    // Folders first
    var folders = []; var subs = [];
    for (var i=0;i<task.items.length;i++){
      var it = task.items[i];
      if (it.type === 'folder') folders.push(it); else subs.push(it);
    }

    function makeRow(it){
      var row = document.createElement('div'); row.className='item';
      var name = document.createElement('div'); name.className='name'; name.textContent = it.title;
      var actions = document.createElement('div'); actions.className='row gap';

      if (it.type === 'folder'){
        var openBtn = document.createElement('button'); openBtn.className='btn primary'; openBtn.textContent = 'Открыть';
        var renBtn = document.createElement('button'); renBtn.className='btn ghost'; renBtn.textContent = 'Переименовать';
        var delBtn = document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent = 'Удалить';
        openBtn.addEventListener('click', function(){ openFolder(task.id, it.id); });
        renBtn.addEventListener('click', function(){ var s = prompt('Имя папки', it.title || ''); if (s!=null){ it.title=s.trim()||it.title; persist().then(function(){ renderTask(task); }); } });
        delBtn.addEventListener('click', function(){ if(confirm('Удалить папку и её подзадачи?')){ deleteFolder(task.id, it.id); } });
        actions.appendChild(openBtn); actions.appendChild(renBtn); actions.appendChild(delBtn);
      } else {
        var openBtn2 = document.createElement('button'); openBtn2.className='btn primary'; openBtn2.textContent='Открыть';
        var renBtn2 = document.createElement('button'); renBtn2.className='btn ghost'; renBtn2.textContent='Переименовать';
        var delBtn2 = document.createElement('button'); delBtn2.className='btn danger'; delBtn2.textContent='Удалить';
        openBtn2.addEventListener('click', function(){ openSubtask(task.id, null, it.id); });
        renBtn2.addEventListener('click', function(){ var s = prompt('Имя подзадачи', it.title || ''); if (s!=null){ it.title=s.trim()||it.title; persist().then(function(){ renderTask(task); }); } });
        delBtn2.addEventListener('click', function(){ if(confirm('Удалить подзадачу?')){ deleteSubtask(task.id, null, it.id); } });
        actions.appendChild(openBtn2); actions.appendChild(renBtn2); actions.appendChild(delBtn2);
      }
      row.appendChild(name); row.appendChild(actions);
      return row;
    }

    for (var f=0;f<folders.length;f++){ els.taskItems.appendChild(makeRow(folders[f])); }
    for (var s=0;s<subs.length;s++){ els.taskItems.appendChild(makeRow(subs[s])); }
  }

  function renderFolder(task, folder){
    switchView('folder');
    els.folderTitle.textContent = folder.title;
    while (els.folderItems.firstChild) els.folderItems.removeChild(els.folderItems.firstChild);
    for (var i=0;i<folder.items.length;i++) (function(it){
      var row = document.createElement('div'); row.className='item';
      var name = document.createElement('div'); name.className='name'; name.textContent = it.title;
      var actions = document.createElement('div'); actions.className='row gap';
      var openBtn = document.createElement('button'); openBtn.className='btn primary'; openBtn.textContent='Открыть';
      var renBtn = document.createElement('button'); renBtn.className='btn ghost'; renBtn.textContent='Переименовать';
      var delBtn = document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='Удалить';
      openBtn.addEventListener('click', function(){ openSubtask(task.id, folder.id, it.id); });
      renBtn.addEventListener('click', function(){ var s = prompt('Имя подзадачи', it.title || ''); if (s!=null){ it.title=s.trim()||it.title; persist().then(function(){ renderFolder(task, folder); }); } });
      delBtn.addEventListener('click', function(){ if(confirm('Удалить подзадачу?')){ deleteSubtask(task.id, folder.id, it.id); } });
      row.appendChild(name); row.appendChild(actions);
      actions.appendChild(openBtn); actions.appendChild(renBtn); actions.appendChild(delBtn);
      els.folderItems.appendChild(row);
    })(folder.items[i]);
  }

  function renderSubtask(task, folder, sub){
    switchView('subtask');
    els.subtaskTitle.textContent = sub.title;
    els.subtaskNote.value = sub.note || '';
    while (els.attachments.firstChild) els.attachments.removeChild(els.attachments.firstChild);
    for (var i=0;i<(sub.attachments||[]).length;i++) (function(att){
      var card = document.createElement('div'); card.className='atc';
      var preview = document.createElement('div');
      if (/^image\\//.test(att.mime || '')){
        var img = document.createElement('img');
        db.getFile(att.fileId).then(function(blob){
          if (blob) img.src = URL.createObjectURL(blob);
        });
        preview.appendChild(img);
      } else {
        var div = document.createElement('div'); div.className='muted'; div.textContent = att.name + ' (' + (att.mime || 'file') + ')';
        preview.appendChild(div);
      }
      var row = document.createElement('div'); row.className='row';
      var dl = document.createElement('a'); dl.className='btn ghost'; dl.textContent='Скачать'; dl.href='#';
      db.getFile(att.fileId).then(function(blob){
        if (blob){
          var url = URL.createObjectURL(blob);
          dl.href = url; dl.download = att.name || 'file';
        }
      });
      var rm = document.createElement('button'); rm.className='btn danger'; rm.textContent='Удалить';
      rm.addEventListener('click', function(){
        if (!confirm('Удалить вложение?')) return;
        for (var k=0;k<sub.attachments.length;k++){ if (sub.attachments[k].id === att.id){ sub.attachments.splice(k,1); break; } }
        db.delFile(att.fileId).then(function(){ persist().then(function(){ renderSubtask(task, folder, sub); }); });
      });
      row.appendChild(dl); row.appendChild(rm);
      card.appendChild(preview); card.appendChild(row);
      els.attachments.appendChild(card);
    })(sub.attachments[i]);
  }

  // Navigation
  function switchView(v){
    els.viewList.classList.add('hidden');
    els.viewTask.classList.add('hidden');
    els.viewFolder.classList.add('hidden');
    els.viewSubtask.classList.add('hidden');
    if (v==='list') els.viewList.classList.remove('hidden');
    if (v==='task') els.viewTask.classList.remove('hidden');
    if (v==='folder') els.viewFolder.classList.remove('hidden');
    if (v==='subtask') els.viewSubtask.classList.remove('hidden');
  }

  function openTask(taskId){
    state.currentTaskId = taskId; state.currentFolderId = null;
    var t = findTask(taskId); if (!t) { renderList(); return; }
    els.renameTaskBtn.onclick = function(){ var s = prompt('Новое имя', t.title || ''); if (s!=null){ t.title=s.trim()||t.title; persist().then(function(){ renderTask(t); }); } };
    els.deleteTaskBtn.onclick = function(){ if(confirm('Удалить заметку?')) deleteTask(t.id); };
    els.addFolderBtn.onclick = function(){ var s = prompt('Имя папки'); if (s){ t.items.push({ id:uid(), type:'folder', title:s.trim(), items:[] }); persist().then(function(){ renderTask(t); }); } };
    els.addSubtaskBtn.onclick = function(){ var s = prompt('Имя подзадачи'); if (s){ t.items.push({ id:uid(), type:'subtask', title:s.trim(), note:'', attachments:[], createdAt: nowISO() }); persist().then(function(){ renderTask(t); }); } };
    els.exportTaskCompactBtn.onclick = function(){ exportTask(t.id, 'compact'); };
    els.exportTaskDetailedBtn.onclick = function(){ exportTask(t.id, 'detailed'); };
    els.backToListBtn.onclick = function(){ renderList(); };
    renderTask(t);
  }

  function openFolder(taskId, folderId){
    state.currentTaskId = taskId; state.currentFolderId = folderId;
    var t = findTask(taskId); if (!t) return renderList();
    var folder = null; for (var i=0;i<t.items.length;i++){ if (t.items[i].id===folderId){ folder = t.items[i]; break; } }
    if (!folder) return openTask(taskId);
    els.renameFolderBtn.onclick = function(){ var s = prompt('Имя папки', folder.title || ''); if (s!=null){ folder.title=s.trim()||folder.title; persist().then(function(){ renderFolder(t, folder); }); } };
    els.deleteFolderBtn.onclick = function(){ if(confirm('Удалить папку?')){ deleteFolder(taskId, folderId); } };
    els.addSubtaskInFolderBtn.onclick = function(){ var s = prompt('Имя подзадачи'); if (s){ folder.items.push({ id:uid(), type:'subtask', title:s.trim(), note:'', attachments:[], createdAt: nowISO() }); persist().then(function(){ renderFolder(t, folder); }); } };
    els.backToTaskBtn.onclick = function(){ openTask(taskId); };
    renderFolder(t, folder);
  }

  function openSubtask(taskId, folderId, subtaskId){
    state.currentTaskId = taskId; state.currentFolderId = folderId;
    var t = findTask(taskId); if (!t) return renderList();
    var sub = null; var parentFolder = null;
    if (folderId){
      for (var i=0;i<t.items.length;i++){ if (t.items[i].id===folderId){ parentFolder=t.items[i]; break; } }
      if (!parentFolder) return openTask(taskId);
      for (var j=0;j<parentFolder.items.length;j++){ if (parentFolder.items[j].id===subtaskId){ sub=parentFolder.items[j]; break; } }
    } else {
      for (var k=0;k<t.items.length;k++){ if (t.items[k].id===subtaskId){ sub=t.items[k]; break; } }
    }
    if (!sub) return (folderId ? openFolder(taskId, folderId) : openTask(taskId));

    els.renameSubtaskBtn.onclick = function(){ var s = prompt('Имя подзадачи', sub.title || ''); if (s!=null){ sub.title=s.trim()||sub.title; persist().then(function(){ renderSubtask(t, parentFolder, sub); }); } };
    els.deleteSubtaskBtn.onclick = function(){ if(confirm('Удалить подзадачу?')){ deleteSubtask(taskId, folderId, subtaskId); } };
    els.saveSubtaskNoteBtn.onclick = function(){ sub.note = els.subtaskNote.value || ''; persist().then(function(){ alert('Сохранено'); }); };

    function onFileSelected(file){
      if (!file) return;
      var fileId = uid();
      var att = { id: uid(), fileId: fileId, name: file.name || ('file-'+Date.now()), size: file.size||0, mime: file.type||'application/octet-stream', createdAt: nowISO() };
      db.putFile(fileId, file).then(function(){
        if (!sub.attachments) sub.attachments = [];
        sub.attachments.push(att);
        persist().then(function(){ renderSubtask(t, parentFolder, sub); });
      });
    }
    els.attachCameraInput.onchange = function(e){ var f = e.target.files && e.target.files[0]; onFileSelected(f); e.target.value=''; };
    els.attachGalleryInput.onchange = function(e){ var f = e.target.files && e.target.files[0]; onFileSelected(f); e.target.value=''; };
    els.attachFileInput.onchange = function(e){ var f = e.target.files && e.target.files[0]; onFileSelected(f); e.target.value=''; };

    els.backFromSubBtn.onclick = function(){ if (folderId) openFolder(taskId, folderId); else openTask(taskId); };
    renderSubtask(t, parentFolder, sub);
  }

  // Mutations
  function deleteTask(taskId){
    var t = findTask(taskId); if (!t){ renderList(); return; }
    var fileIds = [];
    function collect(items){
      for (var i=0;i<items.length;i++){
        var it = items[i];
        if (it.type==='subtask'){
          var a = it.attachments||[];
          for (var j=0;j<a.length;j++) fileIds.push(a[j].fileId);
        } else if (it.type==='folder'){
          collect(it.items||[]);
        }
      }
    }
    collect(t.items||[]);
    var p = Promise.resolve();
    for (var k=0;k<fileIds.length;k++){ (function(fid){ p = p.then(function(){ return db.delFile(fid); }); })(fileIds[k]); }
    p.then(function(){
      for (var i=0;i<state.tasks.length;i++){ if (state.tasks[i].id===taskId){ state.tasks.splice(i,1); break; } }
      persist().then(renderList);
    });
  }

  function deleteFolder(taskId, folderId){
    var t = findTask(taskId); if (!t) return renderList();
    var idx = -1; var folder = null;
    for (var i=0;i<t.items.length;i++){ if (t.items[i].id===folderId){ idx=i; folder=t.items[i]; break; } }
    if (idx===-1) return openTask(taskId);
    var fileIds = [];
    for (var j=0;j<(folder.items||[]).length;j++){
      var it = folder.items[j];
      if (it.type==='subtask'){
        var a = it.attachments||[];
        for (var k=0;k<a.length;k++) fileIds.push(a[k].fileId);
      }
    }
    var p = Promise.resolve();
    for (var m=0;m<fileIds.length;m++){ (function(fid){ p = p.then(function(){ return db.delFile(fid); }); })(fileIds[m]); }
    p.then(function(){
      t.items.splice(idx,1);
      persist().then(function(){ openTask(taskId); });
    });
  }

  function deleteSubtask(taskId, folderId, subtaskId){
    var t = findTask(taskId); if (!t) return renderList();
    var list = null;
    if (folderId){
      for (var i=0;i<t.items.length;i++){ if (t.items[i].id===folderId){ list = t.items[i].items; break; } }
    } else {
      list = t.items;
    }
    if (!list) return openTask(taskId);
    for (var j=0;j<list.length;j++){
      if (list[j].id === subtaskId){
        var st = list[j];
        var p = Promise.resolve();
        var a = st.attachments||[];
        for (var k=0;k<a.length;k++){ (function(fid){ p=p.then(function(){ return db.delFile(fid); }); })(a[k].fileId); }
        p.then(function(){
          list.splice(j,1);
          persist().then(function(){ folderId ? openFolder(taskId, folderId) : openTask(taskId); });
        });
        return;
      }
    }
  }

  // Export (print-to-PDF with two templates)
  function exportTask(taskId, mode){
    var t = findTask(taskId); if (!t) return;
    var w = window.open('', '_blank');
    var css = '*{box-sizing:border-box} body{font-family:system-ui,Arial,sans-serif;padding:24px} h1{margin:0 0 8px} h2{margin:18px 0 6px} .muted{color:#666} ul{margin:6px 0 12px} li{margin:4px 0} .box{border:1px solid #ddd;border-radius:8px;padding:12px;margin:10px 0}';
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+escapeHtml(t.title)+'</title><style>'+css+'</style></head><body>';
    html += '<h1>'+escapeHtml(t.title)+'</h1><div class="muted">Экспорт: '+(mode==='compact'?'Компактный':'Подробный')+' • '+new Date().toLocaleString()+'</div>';

    function renderItems(items){
      var out = '<ul>';
      for (var i=0;i<items.length;i++){
        var it = items[i];
        if (it.type==='folder'){
          out += '<li><strong>'+escapeHtml(it.title)+'</strong>';
          out += renderItems(it.items||[]);
          out += '</li>';
        } else {
          out += '<li>'+escapeHtml(it.title);
          if (mode==='detailed'){
            var note = it.note ? ('<div class="box"><div class="muted">Заметка</div>'+nl2br(escapeHtml(it.note))+'</div>') : '';
            var att = '';
            if (it.attachments && it.attachments.length){
              att = '<div class="box"><div class="muted">Вложения</div><ul>';
              for (var j=0;j<it.attachments.length;j++){
                var a = it.attachments[j];
                att += '<li>'+escapeHtml(a.name||('file-'+(j+1)))+' ('+escapeHtml(a.mime||'file')+')</li>';
              }
              att += '</ul></div>';
            }
            out += note + att;
          }
          out += '</li>';
        }
      }
      out += '</ul>';
      return out;
    }
    html += renderItems(t.items||[]);
    html += '<script>window.onload=function(){window.print();}</script></body></html>';
    w.document.open(); w.document.write(html); w.document.close();
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function nl2br(s){ return (s||'').replace(/\\n/g,'<br>'); }

  // Events - list view
  els.addTaskBtn.addEventListener('click', function(){
    var s = (els.newTaskTitle.value||'').trim();
    if (!s) return;
    state.tasks.unshift({ id: uid(), title: s, createdAt: nowISO(), items: [] });
    els.newTaskTitle.value='';
    persist().then(renderList);
  });
  els.newTaskTitle.addEventListener('keydown', function(e){ if (e.key==='Enter'){ els.addTaskBtn.click(); } });

  // Navigation helpers
  function openTaskPublic(id){ openTask(id); }
  window.__openTask = openTaskPublic;

  // expose for debug
  window.__appState = state;

})();