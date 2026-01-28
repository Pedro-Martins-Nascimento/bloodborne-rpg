import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, onValue, set } from "firebase/database";

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

// Criar personagem novo
export const createCharacter = (charId, initialData) => {
    return set(ref(db, `personagens/${charId}`), initialData);
};

// --- FUNÇÕES DE COMBATE ---
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