import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, update, onValue, set, remove, get } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  databaseURL: import.meta.env.VITE_DATABASE_URL
};

// Inicialização segura do Firebase (não trava se credenciais forem inválidas)
let app = null;
let db = null;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getDatabase(app);
} catch (err) {
  console.warn("⚠️ Firebase não pôde ser inicializado. Usando modo Offline/Local:", err.message);
}

// ==========================================
// SISTEMA OFFLINE / LOCALSTORAGE COM SYNC
// ==========================================

// Padrão: se o usuário já marcou ou se a URL do Firebase for a antiga/descontinuada, ativa offline
const STORAGE_PREFIX = "bb_rpg_";
const IS_OFFLINE_KEY = `${STORAGE_PREFIX}offline_mode`;

export const isOfflineMode = () => {
  const saved = localStorage.getItem(IS_OFFLINE_KEY);
  if (saved !== null) {
    return saved === "true";
  }
  // Se o Firebase não inicializou ou se o projeto é o antigo descontinuado, padrão é offline
  return true;
};

export const setOfflineMode = (enabled) => {
  localStorage.setItem(IS_OFFLINE_KEY, enabled ? "true" : "false");
  notifySync('MODE_CHANGE', { offline: enabled });
};

// Canal Broadcast para comunicação instantânea entre abas (Mestre <-> Jogador no mesmo navegador)
let syncChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel('bloodborne_rpg_cross_tab_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel não suportado neste navegador, usando storage events:', e);
}

const localListeners = new Set();

const notifySync = (action, payload) => {
  localListeners.forEach(listener => {
    try { listener(action, payload); } catch (e) { console.error(e); }
  });
  if (syncChannel) {
    try {
      syncChannel.postMessage({ action, payload, timestamp: Date.now() });
    } catch (e) {
      console.warn("Erro ao emitir sync via BroadcastChannel:", e);
    }
  }
};

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    const { action, payload } = event.data || {};
    localListeners.forEach(listener => {
      try { listener(action, payload); } catch (e) { console.error(e); }
    });
  };
}

// Fallback adicional com evento de storage
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(STORAGE_PREFIX)) {
      notifySync('STORAGE_UPDATE', { key: e.key, newValue: e.newValue });
    }
  });
}

// Helpers de LocalStorage
const getLocalData = (key, fallback = {}) => {
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocalData = (key, val) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(val));
  } catch (e) {
    console.error("Erro ao salvar no localStorage:", e);
  }
};

// Gerador de ID único de sessão
export const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ==========================================
// FUNÇÕES UNIFICADAS (FIREBASE + MODO LOCAL)
// ==========================================

// Escutar um personagem específico (Jogador)
export const subscribeToCharacter = (charId, callback) => {
  if (isOfflineMode() || !db) {
    const checkAndSend = () => {
      const all = getLocalData('personagens', {});
      callback(all[charId] || null);
    };
    checkAndSend();
    const listener = (action, payload) => {
      if (action === 'CHAR_UPDATE' || action === 'STORAGE_UPDATE' || action === 'MODE_CHANGE') {
        checkAndSend();
      }
    };
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  }

  const charRef = ref(db, `personagens/${charId}`);
  return onValue(charRef, (snapshot) => {
    callback(snapshot.val());
  }, (err) => {
    console.warn("Erro no listener Firebase, usando fallback local:", err);
    const all = getLocalData('personagens', {});
    callback(all[charId] || null);
  });
};

// Escutar TODOS os personagens (Mestre modo clássico)
export const subscribeToAllCharacters = (callback) => {
  if (isOfflineMode() || !db) {
    const checkAndSend = () => {
      callback(getLocalData('personagens', {}));
    };
    checkAndSend();
    const listener = () => checkAndSend();
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  }

  const allRef = ref(db, 'personagens');
  return onValue(allRef, (snapshot) => {
    callback(snapshot.val() || {});
  }, (err) => {
    console.warn("Erro no listener Firebase, usando fallback local:", err);
    callback(getLocalData('personagens', {}));
  });
};

// Atualizar dados de personagem (modo clássico)
export const updateCharacterData = async (charId, data) => {
  // Salva sempre no local como backup
  const all = getLocalData('personagens', {});
  all[charId] = { ...(all[charId] || {}), ...data };
  setLocalData('personagens', all);
  notifySync('CHAR_UPDATE', { charId, data });

  if (!isOfflineMode() && db) {
    try {
      return await update(ref(db, `personagens/${charId}`), data);
    } catch (e) {
      console.warn("Falha no update do Firebase, salvo localmente:", e);
    }
  }
  return Promise.resolve();
};

// Remover personagem (modo clássico)
export const removeCharacter = async (charId) => {
  const all = getLocalData('personagens', {});
  delete all[charId];
  setLocalData('personagens', all);
  notifySync('CHAR_UPDATE', { charId });

  if (!isOfflineMode() && db) {
    try {
      return await remove(ref(db, `personagens/${charId}`));
    } catch (e) {
      console.warn("Falha ao remover no Firebase:", e);
    }
  }
  return Promise.resolve();
};

// Criar personagem novo (modo clássico)
export const createCharacter = async (charId, initialData) => {
  const all = getLocalData('personagens', {});
  all[charId] = initialData;
  setLocalData('personagens', all);
  notifySync('CHAR_UPDATE', { charId, data: initialData });

  if (!isOfflineMode() && db) {
    try {
      return await set(ref(db, `personagens/${charId}`), initialData);
    } catch (e) {
      console.warn("Falha ao criar no Firebase, salvo localmente:", e);
    }
  }
  return Promise.resolve();
};

// --- FUNÇÕES DE SESSÃO ---

// Criar nova sessão
export const createSession = async (masterId, sessionData = {}) => {
  const sessionId = generateSessionId();
  const fullData = {
    id: sessionId,
    mestrado: masterId,
    criada_em: new Date().toISOString(),
    ativa: true,
    personagens: {},
    combate: { ativo: false, ordem: [], turnoAtual: 0 },
    ...sessionData
  };

  // Salva no LocalStorage
  const sessions = getLocalData('sessoes', {});
  sessions[sessionId] = fullData;
  setLocalData('sessoes', sessions);
  notifySync('SESSION_CREATED', { sessionId, session: fullData });

  if (!isOfflineMode() && db) {
    try {
      await set(ref(db, `sessoes/${sessionId}`), fullData);
    } catch (e) {
      console.warn("Falha ao criar sessão no Firebase, usando modo local:", e);
    }
  }

  return sessionId;
};

// Obter dados da sessão (one-shot ou subscription)
export const getSession = (sessionId, callback) => {
  if (isOfflineMode() || !db) {
    const checkAndSend = () => {
      const sessions = getLocalData('sessoes', {});
      callback(sessions[sessionId] || null);
    };
    checkAndSend();
    const listener = (action, payload) => {
      if (action === 'SESSION_UPDATE' || action === 'SESSION_CREATED' || action === 'SESSION_REMOVED' || action === 'STORAGE_UPDATE') {
        checkAndSend();
      }
    };
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  }

  const sessionRef = ref(db, `sessoes/${sessionId}`);
  return onValue(sessionRef, (snapshot) => {
    callback(snapshot.val());
  }, (error) => {
    console.warn("Firebase getSession erro, fallback local:", error);
    const sessions = getLocalData('sessoes', {});
    callback(sessions[sessionId] || null);
  });
};

// Verificar se sessão existe (para Login)
export const checkSessionExists = async (sessionId) => {
  const cleanId = (sessionId || '').toUpperCase().trim();
  
  if (isOfflineMode() || !db) {
    const sessions = getLocalData('sessoes', {});
    const session = sessions[cleanId];
    return { exists: !!session, session: session || null };
  }

  try {
    const snap = await Promise.race([
      get(ref(db, `sessoes/${cleanId}`)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexão')), 4000))
    ]);
    return { exists: snap.exists(), session: snap.val() };
  } catch (err) {
    console.warn("Erro ao checar Firebase, verificando localmente:", err.message);
    const sessions = getLocalData('sessoes', {});
    const session = sessions[cleanId];
    return { exists: !!session, session: session || null };
  }
};

// Entrar na sessão como jogador (para Login)
export const joinSession = async (sessionId, hunterName) => {
  const cleanId = (sessionId || '').toUpperCase().trim();
  const cleanName = (hunterName || '').trim();
  const playerId = `${cleanId}_${cleanName.toLowerCase().replace(/\s/g, '')}`;

  const initialChar = {
    nome: cleanName,
    esperando: true,
    aprovado: false,
    sessaoId: cleanId,
    criado_em: new Date().toISOString()
  };

  // Atualiza LocalStorage
  const sessions = getLocalData('sessoes', {});
  if (!sessions[cleanId]) {
    // Cria container se não existir localmente
    sessions[cleanId] = {
      id: cleanId,
      ativa: true,
      personagens: {},
      combate: { ativo: false, ordem: [], turnoAtual: 0 }
    };
  }
  if (!sessions[cleanId].personagens) sessions[cleanId].personagens = {};
  if (!sessions[cleanId].personagens[playerId]) {
    sessions[cleanId].personagens[playerId] = initialChar;
  }
  setLocalData('sessoes', sessions);
  notifySync('SESSION_CHAR_UPDATE', { sessionId: cleanId, charId: playerId, data: initialChar });

  if (!isOfflineMode() && db) {
    try {
      const charRef = ref(db, `sessoes/${cleanId}/personagens/${playerId}`);
      const snap = await get(charRef);
      if (!snap.exists()) {
        await set(charRef, initialChar);
      }
    } catch (e) {
      console.warn("Erro ao registrar jogador no Firebase, mantido no local:", e);
    }
  }

  return { playerId, sessionCode: cleanId };
};

// Escutar personagens da sessão
export const subscribeToSessionCharacters = (sessionId, callback) => {
  if (isOfflineMode() || !db) {
    const checkAndSend = () => {
      const sessions = getLocalData('sessoes', {});
      const chars = sessions[sessionId]?.personagens || {};
      callback(chars);
    };
    checkAndSend();
    const listener = (action, payload) => {
      if (action === 'SESSION_CHAR_UPDATE' || action === 'SESSION_UPDATE' || action === 'STORAGE_UPDATE') {
        checkAndSend();
      }
    };
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  }

  const charsRef = ref(db, `sessoes/${sessionId}/personagens`);
  return onValue(charsRef, (snapshot) => {
    callback(snapshot.val() || {});
  }, (err) => {
    console.warn("Firebase subscribe chars erro, fallback local:", err);
    const sessions = getLocalData('sessoes', {});
    callback(sessions[sessionId]?.personagens || {});
  });
};

// Atualizar personagem na sessão
export const updateSessionCharacter = async (sessionId, charId, data) => {
  // Salva localmente
  const sessions = getLocalData('sessoes', {});
  if (sessions[sessionId]) {
    if (!sessions[sessionId].personagens) sessions[sessionId].personagens = {};
    sessions[sessionId].personagens[charId] = {
      ...(sessions[sessionId].personagens[charId] || {}),
      ...data
    };
    setLocalData('sessoes', sessions);
    notifySync('SESSION_CHAR_UPDATE', { sessionId, charId, data });
  }

  if (!isOfflineMode() && db) {
    try {
      return await update(ref(db, `sessoes/${sessionId}/personagens/${charId}`), data);
    } catch (e) {
      console.warn("Falha no update da sessão Firebase, salvo local:", e);
    }
  }
  return Promise.resolve();
};

// Remover personagem da sessão
export const removeSessionCharacter = async (sessionId, charId) => {
  const sessions = getLocalData('sessoes', {});
  if (sessions[sessionId]?.personagens) {
    delete sessions[sessionId].personagens[charId];
    setLocalData('sessoes', sessions);
    notifySync('SESSION_CHAR_UPDATE', { sessionId, charId, removed: true });
  }

  if (!isOfflineMode() && db) {
    try {
      return await remove(ref(db, `sessoes/${sessionId}/personagens/${charId}`));
    } catch (e) {
      console.warn("Falha ao remover personagem no Firebase:", e);
    }
  }
  return Promise.resolve();
};

// Criar personagem na sessão
export const createSessionCharacter = async (sessionId, charId, initialData) => {
  const sessions = getLocalData('sessoes', {});
  if (!sessions[sessionId]) {
    sessions[sessionId] = { id: sessionId, ativa: true, personagens: {} };
  }
  if (!sessions[sessionId].personagens) sessions[sessionId].personagens = {};
  sessions[sessionId].personagens[charId] = initialData;
  setLocalData('sessoes', sessions);
  notifySync('SESSION_CHAR_UPDATE', { sessionId, charId, data: initialData });

  if (!isOfflineMode() && db) {
    try {
      return await set(ref(db, `sessoes/${sessionId}/personagens/${charId}`), initialData);
    } catch (e) {
      console.warn("Falha ao criar personagem na sessão Firebase:", e);
    }
  }
  return Promise.resolve();
};

// Escutar combate da sessão
export const subscribeToSessionCombat = (sessionId, callback) => {
  if (isOfflineMode() || !db) {
    const checkAndSend = () => {
      const sessions = getLocalData('sessoes', {});
      const combat = sessions[sessionId]?.combate || { ativo: false, ordem: [], turnoAtual: 0 };
      callback(combat);
    };
    checkAndSend();
    const listener = (action) => {
      if (action === 'COMBAT_UPDATE' || action === 'SESSION_UPDATE' || action === 'STORAGE_UPDATE') {
        checkAndSend();
      }
    };
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  }

  const combatRef = ref(db, `sessoes/${sessionId}/combate`);
  return onValue(combatRef, (snapshot) => {
    callback(snapshot.val() || { ativo: false, ordem: [], turnoAtual: 0 });
  }, (err) => {
    console.warn("Firebase combat error, fallback local:", err);
    const sessions = getLocalData('sessoes', {});
    callback(sessions[sessionId]?.combate || { ativo: false, ordem: [], turnoAtual: 0 });
  });
};

// Atualizar estado do combate da sessão
export const setSessionCombatState = async (sessionId, newState) => {
  const sessions = getLocalData('sessoes', {});
  if (sessions[sessionId]) {
    sessions[sessionId].combate = newState;
    setLocalData('sessoes', sessions);
    notifySync('COMBAT_UPDATE', { sessionId, combat: newState });
  }

  if (!isOfflineMode() && db) {
    try {
      return await set(ref(db, `sessoes/${sessionId}/combate`), newState);
    } catch (e) {
      console.warn("Falha ao salvar combate no Firebase:", e);
    }
  }
  return Promise.resolve();
};

// Remover sessão inteira
export const removeSession = async (sessionId) => {
  const sessions = getLocalData('sessoes', {});
  delete sessions[sessionId];
  setLocalData('sessoes', sessions);
  notifySync('SESSION_REMOVED', { sessionId });

  if (!isOfflineMode() && db) {
    try {
      return await remove(ref(db, `sessoes/${sessionId}`));
    } catch (e) {
      console.warn("Falha ao remover sessão no Firebase:", e);
    }
  }
  return Promise.resolve();
};

// --- FUNÇÕES GLOBAIS DE COMBATE (Para compatibilidade clássica) ---
export const subscribeToCombat = (callback) => {
  if (isOfflineMode() || !db) {
    const checkAndSend = () => {
      const combat = getLocalData('combate_global', { ativo: false, ordem: [], turnoAtual: 0 });
      callback(combat);
    };
    checkAndSend();
    const listener = (action) => {
      if (action === 'COMBAT_UPDATE') checkAndSend();
    };
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  }

  const combatRef = ref(db, 'combate');
  return onValue(combatRef, (snapshot) => {
    callback(snapshot.val() || { ativo: false, ordem: [], turnoAtual: 0 });
  });
};

export const setCombatState = async (newState) => {
  setLocalData('combate_global', newState);
  notifySync('COMBAT_UPDATE', { combat: newState });

  if (!isOfflineMode() && db) {
    try {
      return await set(ref(db, 'combate'), newState);
    } catch (e) {
      console.warn("Falha ao salvar combate clássico no Firebase:", e);
    }
  }
  return Promise.resolve();
};