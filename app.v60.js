
(function(){
  // Keys
  var LS_KEY = 'mint.v60.tasks'; // for migration
  var IDB_KEY = 'tasks';         // stored in IndexedDB as JSON

  // State
  var state = {
    tasks: [],
    currentId: null,
    ready: false
  };

  // DOM
  var els = {
    list: document.getElementById('taskList'),
    newTaskTitle: document.getElementById('newTaskTitle'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    viewList: document.getElementById('view-list'),
    viewDetail: document.getElementById('view-detail'),
    backBtn: document.getElementById('backBtn'),
    taskTitle: document.getElementById('taskTitle'),
    newSubtaskTitle: document.getElementById('newSubtaskTitle'),
    addSubtaskBtn: document.getElementById('addSubtaskBtn'),
    checklist: document.getElementById('checklist')
  };

  // Utils
  function uid() { return 'id_' + Math.random().toString(36).slice(2, 10); }

  function splitFolderTitle(rawTitle) {
    var s = (rawTitle || '').trim();
    var sepIdx = -1, sep = null;
    var trySeps = ['::', '/', '>'];
    for (var i = 0; i < trySeps.length; i++) {
      var idx = s.indexOf(trySeps[i]);
      if (idx > 0) { sepIdx = idx; sep = trySeps[i]; break; }
    }
    if (sepIdx === -1) return { folder: null, title: s };
    var folder = s.slice(0, sepIdx).trim();
    var title = s.slice(sepIdx + sep.length).trim();
    if (!folder) folder = null;
    return { folder: folder, title: title || s };
  }

  // Persistence
  function loadFromLocalStorage(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data;
    } catch(e) { return []; }
  }

  function saveToIDB(tasks){
    return mintIDB.setJSON(IDB_KEY, tasks || []);
  }
  function loadFromIDB(){
    return mintIDB.getJSON(IDB_KEY, []);
  }

  function migrateIfNeeded(){
    return loadFromIDB().then(function(idbTasks){
      if (Array.isArray(idbTasks) && idbTasks.length) {
        return idbTasks;
      }
      var lsTasks = loadFromLocalStorage();
      if (Array.isArray(lsTasks) && lsTasks.length) {
        return saveToIDB(lsTasks).then(function(){ return lsTasks; });
      }
      var seeded = [{
        id: uid(),
        title: 'Демо-задача',
        done: false,
        items: [
          { id: uid(), title: 'UI/Сверстать экран', done: false },
          { id: uid(), title: 'UI/Состояние Loading', done: true },
          { id: uid(), title: 'Бэклог::Навигация', done: false },
          { id: uid(), title: 'Техдолг > Рефакторинг', done: false },
          { id: uid(), title: 'Без папки пример', done: false }
        ]
      }];
      return saveToIDB(seeded).then(function(){ return seeded; });
    });
  }

  function persistAndRefresh(){
    return saveToIDB(state.tasks).then(function(){
      renderTasks();
      if (state.currentId) {
        var t = state.tasks.find(function(x){ return x.id === state.currentId; });
        if (t) renderChecklist(t, els.checklist);
      }
    });
  }

  // Render
  function renderTasks() {
    while (els.list.firstChild) els.list.removeChild(els.list.firstChild);
    if (!state.tasks.length) {
      var empty = document.createElement('div');
      empty.className = 'card';
      empty.textContent = 'Задач пока нет.';
      els.list.appendChild(empty);
      return;
    }
    for (var i = 0; i < state.tasks.length; i++) {
      (function(t){
        var card = document.createElement('div');
        card.className = 'card';
        var h = document.createElement('h3');
        h.textContent = t.title + (t.done ? ' ✅' : '');
        var actions = document.createElement('div');
        actions.className = 'task-actions';

        var openBtn = document.createElement('button');
        openBtn.textContent = 'Открыть';
        openBtn.className = 'btn-open';
        openBtn.addEventListener('click', function(){
          state.currentId = t.id;
          route('detail');
        });

        var delBtn = document.createElement('button');
        delBtn.textContent = 'Удалить';
        delBtn.addEventListener('click', function(){
          state.tasks = state.tasks.filter(function(x){ return x.id !== t.id; });
          persistAndRefresh();
        });

        actions.appendChild(openBtn);
        actions.appendChild(delBtn);
        card.appendChild(h);
        card.appendChild(actions);
        els.list.appendChild(card);
      })(state.tasks[i]);
    }
  }

  function renderChecklist(t, container) {
    t.items = Array.isArray(t.items) ? t.items : [];

    var groups = {};
    for (var i = 0; i < t.items.length; i++) {
      var it = t.items[i];
      var parsed = splitFolderTitle(it.title || '');
      var key = parsed.folder || '\uFFFF__NOFOLDER';
      if (!groups[key]) groups[key] = [];
      it.__displayTitle = parsed.title || (it.title || '');
      it.__folder = parsed.folder || null;
      groups[key].push(it);
    }

    var keys = Object.keys(groups).sort(function(a, b){
      if (a === '\uFFFF__NOFOLDER' && b === '\uFFFF__NOFOLDER') return 0;
      if (a === '\uFFFF__NOFOLDER') return 1;
      if (b === '\uFFFF__NOFOLDER') return -1;
      a = a.toLocaleLowerCase(); b = b.toLocaleLowerCase();
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

    while (container.firstChild) container.removeChild(container.firstChild);

    for (var k = 0; k < keys.length; k++) {
      var gKey = keys[k];
      var arr = groups[gKey];
      var isNoFolder = gKey === '\uFFFF__NOFOLDER';
      if (!isNoFolder) {
        var h = document.createElement('div');
        h.className = 'checklist-folder';
        h.textContent = gKey;
        container.appendChild(h);
      }

      for (var j = 0; j < arr.length; j++) {
        (function(it){
          var row = document.createElement('div');
          row.className = 'checklist-item';

          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!it.done;
          cb.className = 'checklist-checkbox';

          var label = document.createElement('span');
          label.className = 'checklist-title';
          label.textContent = it.__displayTitle || (it.title || '');

          var btns = document.createElement('span');
          btns.className = 'checklist-actions';

          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn-del-subtask';
          delBtn.textContent = '🗑️';
          delBtn.addEventListener('click', function(e){
            e.preventDefault(); e.stopPropagation();
            t.items = t.items.filter(function(x){ return x.id !== it.id; });
            refreshDoneFlag(t);
            persistAndRefresh();
          });
          btns.appendChild(delBtn);

          cb.addEventListener('change', function(e){
            e.preventDefault(); e.stopPropagation();
            var found = null;
            for (var q = 0; q < t.items.length; q++) {
              if (t.items[q].id === it.id) { found = t.items[q]; break; }
            }
            if (found) found.done = !!cb.checked;
            refreshDoneFlag(t);
            persistAndRefresh();
          });

          if (it.done) row.classList.add('is-done');

          row.appendChild(cb);
          row.appendChild(label);
          row.appendChild(btns);
          container.appendChild(row);
        })(arr[j]);
      }
    }
  }

  function refreshDoneFlag(t){
    var allDone = t.items.length > 0;
    for (var i = 0; i < t.items.length; i++) {
      if (!t.items[i].done) { allDone = false; break; }
    }
    t.done = !!allDone;
  }

  // Routing
  function route(where) {
    if (where === 'detail') {
      els.viewList.classList.add('hidden');
      els.viewDetail.classList.remove('hidden');
      var t = state.tasks.find(function(x){ return x.id === state.currentId; });
      if (!t) { route('list'); return; }
      els.taskTitle.textContent = t.title + (t.done ? ' ✅' : '');
      renderChecklist(t, els.checklist);
    } else {
      els.viewDetail.classList.add('hidden');
      els.viewList.classList.remove('hidden');
      renderTasks();
    }
  }

  // Events
  els.addTaskBtn.addEventListener('click', function(){
    var s = (els.newTaskTitle.value || '').trim();
    if (!s) return;
    var task = { id: uid(), title: s, done: false, items: [] };
    state.tasks.unshift(task);
    els.newTaskTitle.value = '';
    persistAndRefresh();
  });

  els.newTaskTitle.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { els.addTaskBtn.click(); }
  });

  els.backBtn.addEventListener('click', function(){ route('list'); });

  els.addSubtaskBtn.addEventListener('click', function(){
    var t = state.tasks.find(function(x){ return x.id === state.currentId; });
    if (!t) return;
    var s = (els.newSubtaskTitle.value || '').trim();
    if (!s) return;
    t.items.push({ id: uid(), title: s, done: false });
    els.newSubtaskTitle.value = '';
    refreshDoneFlag(t);
    persistAndRefresh();
  });

  els.newSubtaskTitle.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { els.addSubtaskBtn.click(); }
  });

  // Boot: migrate & load
  migrateIfNeeded().then(function(tasks){
    state.tasks = tasks || [];
    state.ready = true;
    renderTasks();
  });
})();
