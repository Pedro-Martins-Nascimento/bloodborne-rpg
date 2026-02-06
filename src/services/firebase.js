import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, onValue, set, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  databaseURL: import.meta.env.VITE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Escutar um personagem específico (Jogador)
export const subscribeToCharacter = (charId, callback) => {
    const charRef = ref(db, `personagens/${charId}`);
    return onValue(charRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
};

// Escutar TODOS os personagens (Mestre)
export const subscribeToAllCharacters = (callback) => {
    const allRef = ref(db, 'personagens');
    return onValue(allRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
};

// Atualizar dados
export const updateCharacterData = (charId, data) => {
    return update(ref(db, `personagens/${charId}`), data);
};

// Remover personagem (modo clássico)
export const removeCharacter = (charId) => {
    return remove(ref(db, `personagens/${charId}`));
};

// Criar personagem novo
export const createCharacter = (charId, initialData) => {
    return set(ref(db, `personagens/${charId}`), initialData);
};

// --- FUNÇÕES DE SESSÃO ---

// Gerar ID único de 6 caracteres (ABC123)
export const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Criar nova sessão
export const createSession = (masterId, sessionData) => {
    const sessionId = generateSessionId();
    const sessionRef = ref(db, `sessoes/${sessionId}`);
    const fullData = {
        id: sessionId,
        mestrado: masterId,
        criada_em: new Date().toISOString(),
        ativa: true,
        personagens: {},
        combate: { ativo: false, ordem: [], turnoAtual: 0 },
        ...sessionData
    };
    return set(sessionRef, fullData).then(() => sessionId);
};

// Obter dados da sessão
export const getSession = (sessionId, callback) => {
    const sessionRef = ref(db, `sessoes/${sessionId}`);
    return onValue(sessionRef, (snapshot) => {
        callback(snapshot.val());
    }, (error) => {
        callback(null); // Sessão não encontrada
    });
};

// Escutar personagens da sessão
export const subscribeToSessionCharacters = (sessionId, callback) => {
    const charsRef = ref(db, `sessoes/${sessionId}/personagens`);
    return onValue(charsRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
};

// Atualizar personagem na sessão
export const updateSessionCharacter = (sessionId, charId, data) => {
    return update(ref(db, `sessoes/${sessionId}/personagens/${charId}`), data);
};

// Remover personagem da sessão
export const removeSessionCharacter = (sessionId, charId) => {
    return remove(ref(db, `sessoes/${sessionId}/personagens/${charId}`));
};

// Criar personagem na sessão
export const createSessionCharacter = (sessionId, charId, initialData) => {
    return set(ref(db, `sessoes/${sessionId}/personagens/${charId}`), initialData);
};

// Escutar combate da sessão
export const subscribeToSessionCombat = (sessionId, callback) => {
    const combatRef = ref(db, `sessoes/${sessionId}/combate`);
    return onValue(combatRef, (snapshot) => {
        callback(snapshot.val() || { ativo: false, ordem: [], turnoAtual: 0 });
    });
};

// Atualizar estado do combate da sessão
export const setSessionCombatState = (sessionId, newState) => {
    return set(ref(db, `sessoes/${sessionId}/combate`), newState);
};

// Remover sessão inteira
export const removeSession = (sessionId) => {
    return remove(ref(db, `sessoes/${sessionId}`));
};

// --- FUNÇÕES ANTIGAS (Para compatibilidade) ---
const combatRef = ref(db, 'combate');

// Escutar o estado do combate (para todos)
export const subscribeToCombat = (callback) => {
    return onValue(combatRef, (snapshot) => {
        callback(snapshot.val() || { ativo: false, ordem: [], turnoAtual: 0 });
    });
};

// Atualizar o estado completo do combate (usado pelo mestre)
export const setCombatState = (newState) => {
    return set(combatRef, newState);
};