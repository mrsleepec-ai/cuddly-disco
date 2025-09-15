
// IndexedDB helper + blob store. No optional chaining.
(function(global){
  var DB = 'mint_notes_db';
  var VER = 1;
  var KV = 'kv';
  var FILES = 'files';

  function openDB(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB, VER);
      req.onupgradeneeded = function(ev){
        var db = ev.target.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  function withStore(store, mode, fn){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(store, mode);
        var s = tx.objectStore(store);
        var res;
        try { res = fn(s); } catch(e){ reject(e); return; }
        tx.oncomplete = function(){ resolve(res); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }

  function getJSON(key, fallback){
    return withStore(KV, 'readonly', function(s){
      return new Promise(function(resolve, reject){
        var r = s.get(key);
        r.onsuccess = function(){
          var v = r.result;
          if (typeof v === 'string') {
            try { resolve(JSON.parse(v)); } catch(e){ resolve(fallback); }
          } else {
            resolve(v === undefined ? fallback : v);
          }
        };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }
  function setJSON(key, obj){
    var payload = JSON.stringify(obj);
    return withStore(KV, 'readwrite', function(s){
      return new Promise(function(resolve, reject){
        var r = s.put(payload, key);
        r.onsuccess = function(){ resolve(); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  function putFile(id, blob){
    return withStore(FILES, 'readwrite', function(s){
      return new Promise(function(resolve, reject){
        var r = s.put(blob, id);
        r.onsuccess = function(){ resolve(); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }
  function getFile(id){
    return withStore(FILES, 'readonly', function(s){
      return new Promise(function(resolve, reject){
        var r = s.get(id);
        r.onsuccess = function(){ resolve(r.result || null); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }
  function delFile(id){
    return withStore(FILES, 'readwrite', function(s){
      return new Promise(function(resolve, reject){
        var r = s.delete(id);
        r.onsuccess = function(){ resolve(); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  global.db = { getJSON:getJSON, setJSON:setJSON, putFile:putFile, getFile:getFile, delFile:delFile };
})(this);
