
// Tiny IndexedDB helper without optional chaining; Promise-based.
(function(global){
  var DB_NAME = 'mint_v60_db';
  var DB_VERSION = 1;
  var STORE = 'kv'; // simple key-value store

  function openDB(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(ev){
        var db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  function withStore(mode, fn){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(STORE, mode);
        var store = tx.objectStore(STORE);
        var res;
        try {
          res = fn(store);
        } catch (e) {
          reject(e); return;
        }
        tx.oncomplete = function(){ resolve(res); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }

  function get(key){
    return withStore('readonly', function(store){
      return new Promise(function(resolve, reject){
        var r = store.get(key);
        r.onsuccess = function(){ resolve(r.result); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  function set(key, value){
    return withStore('readwrite', function(store){
      return new Promise(function(resolve, reject){
        var r = store.put(value, key);
        r.onsuccess = function(){ resolve(); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  function del(key){
    return withStore('readwrite', function(store){
      return new Promise(function(resolve, reject){
        var r = store.delete(key);
        r.onsuccess = function(){ resolve(); };
        r.onerror = function(){ reject(r.error); };
      });
    });
  }

  function getJSON(key, fallback){
    return get(key).then(function(v){
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch(e){ return fallback; }
      }
      return (v === undefined) ? fallback : v;
    });
  }

  function setJSON(key, obj){
    try {
      return set(key, JSON.stringify(obj));
    } catch(e) {
      return set(key, JSON.stringify(obj));
    }
  }

  global.mintIDB = { get:get, set:set, del:del, getJSON:getJSON, setJSON:setJSON };
})(this);
