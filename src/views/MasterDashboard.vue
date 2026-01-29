<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { subscribeToAllCharacters, updateCharacterData, subscribeToCombat, setCombatState, subscribeToSessionCharacters, updateSessionCharacter, setSessionCombatState } from '../services/firebase';

const route = useRoute();
const sessionId = route.params.sessionId; // ID da sessão (se existir)

const players = ref({});
const combatState = ref({ ativo: false, ordem: [], turnoAtual: 0 });
const monstrosNaLista = ref([]);
const playerInitiatives = ref({});

// Templates de Fichas
const templates = {
    cacador_machado: { esperando: false, hp_max: 24, hp_atual: 24, frascos: 5, balas: 5, status: [], equipamentos: [{ nome: "Machado de Caçador", dano: "1d8+2" }] },
    cacador_cutelo: { esperando: false, hp_max: 20, hp_atual: 20, frascos: 5, balas: 5, status: [], equipamentos: [{ nome: "Cutelo Cerrado", dano: "1d6+3" }] },
    cacador_bengala: { esperando: false, hp_max: 18, hp_atual: 18, frascos: 5, balas: 8, status: [], equipamentos: [{ nome: "Bengala Enroscada", dano: "1d6+2" }] }
};

// Função para APROVAR entrada do jogador
const aprovarJogador = (id) => {
    const jogadorAtual = players.value[id];
    if (!jogadorAtual) return;
    
    console.log('Aprovando jogador:', id);
    // Aprova e adiciona campo esperando: true para ir para a próxima seção
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { aprovado: true, esperando: true });
    } else {
        updateCharacterData(id, { aprovado: true, esperando: true });
    }
};

// Função para EXPULSAR um jogador da sala
const expulsarJogador = (id) => {
    if (confirm(`Tem certeza que deseja expulsar ${players.value[id].nome}?`)) {
        console.log('Expulsando jogador:', id);
        if (sessionId) {
            updateSessionCharacter(sessionId, id, { expulso: true });
        } else {
            updateCharacterData(id, { expulso: true });
        }
    }
};

// Função para RECUSAR entrada do jogador
const recusarJogador = (id) => {
    // Implementar lógica de recusa (remover jogador ou marcar como recusado)
    console.log('Jogador recusado:', id);
};

// Função para ATRIBUIR ficha ao jogador já aprovado
const aplicarTemplate = (id, tipo) => {
    const jogadorAtual = players.value[id];
    if (!jogadorAtual) {
        console.error('MasterDashboard - Jogador não encontrado:', id);
        return;
    }
    
    console.log('MasterDashboard - Iniciando aplicação de template');
    console.log('MasterDashboard - ID:', id);
    console.log('MasterDashboard - Tipo:', tipo);
    console.log('MasterDashboard - Jogador atual:', jogadorAtual);
    
    // Cria ficha COMPLETA com dados do template + nome e sessão
    const fichaCriada = {
        nome: jogadorAtual.nome,
        sessaoId: jogadorAtual.sessaoId,
        aprovado: true,
        esperando: false, // ✅ CRÍTICO: Muda para false para sair do ApprovedLobby
        ...templates[tipo]
    };
    
    console.log('MasterDashboard - Dados da ficha a enviar:', fichaCriada);
    
    if (sessionId) {
        console.log('MasterDashboard - Modo Sessão: updateSessionCharacter');
        updateSessionCharacter(sessionId, id, fichaCriada);
    } else {
        console.log('MasterDashboard - Modo Clássico: updateCharacterData');
        updateCharacterData(id, fichaCriada);
    }
    
    console.log('MasterDashboard - Ficha enviada para Firebase!');
};

// Função para resetar jogador
const resetarJogador = (id) => {
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { esperando: true });
    } else {
        updateCharacterData(id, { esperando: true });
    }
};

// Função para atualizar HP
const atualizarHP = (id, novoHP) => {
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { hp_atual: novoHP });
    } else {
        updateCharacterData(id, { hp_atual: novoHP });
    }
};

onMounted(() => {
    if (sessionId) {
        // Modo Sessão
        subscribeToSessionCharacters(sessionId, (data) => {
            console.log('Jogadores da sessão:', data);
            players.value = data || {};
        });
    } else {
        // Modo Clássico
        subscribeToAllCharacters((data) => { players.value = data; });
        subscribeToCombat((data) => { combatState.value = data; });
    }
});

// Zera as iniciativas toda vez que o combate acaba
watch(() => combatState.value.ativo, (isAtivo) => {
    if (!isAtivo) {
        playerInitiatives.value = {};
        monstrosNaLista.value = [];
    }
});

// LÓGICA DE GERENCIAMENTO
// (aplicarTemplate, resetarJogador estão acima)

// LÓGICA DE COMBATE INTUITIVA
const addMonstroToList = () => {
    monstrosNaLista.value.push({
        id: `monstro_${Date.now()}`,
        nome: `Monstro ${monstrosNaLista.value.length + 1}`,
        iniciativa: 10,
        tipo: 'monstro'
    });
};

const iniciarCombate = () => {
    const combatentes = [...monstrosNaLista.value]; // Copia os monstros
    for (const id in players.value) {
        if (!players.value[id].esperando) {
            combatentes.push({
                id,
                nome: players.value[id].nome,
                iniciativa: parseInt(playerInitiatives.value[id]) || 0,
                tipo: 'jogador'
            });
        }
    }
    combatentes.sort((a, b) => b.iniciativa - a.iniciativa);
    
    if (sessionId) {
        setSessionCombatState(sessionId, { ativo: true, ordem: combatentes, turnoAtual: 0 });
    } else {
        setCombatState({ ativo: true, ordem: combatentes, turnoAtual: 0 });
    }
};

const proximoTurno = () => {
    let proximo = combatState.value.turnoAtual + 1;
    if (proximo >= combatState.value.ordem.length) proximo = 0;
    
    if (sessionId) {
        setSessionCombatState(sessionId, { ...combatState.value, turnoAtual: proximo });
    } else {
        setCombatState({ ...combatState.value, turnoAtual: proximo });
    }
};

// ZERA COMPLETAMENTE o estado do combate no Firebase
const encerrarCombate = () => {
    if (sessionId) {
        setSessionCombatState(sessionId, { ativo: false, ordem: [], turnoAtual: 0 });
    } else {
        setCombatState({ ativo: false, ordem: [], turnoAtual: 0 });
    }
};

// Computado para filtrar jogadores NA SALA aguardando ficha
const jogadoresNaSala = computed(() => {
    return Object.entries(players.value).filter(([id, char]) => char.esperando === true && !char.expulso);
});

const jogadoresConectados = computed(() => {
    return Object.entries(players.value).filter(([id, char]) => char.esperando === false);
});
</script>

<template>
<div class="min-h-screen bg-yharnam-dark text-gray-300 p-6">
    <div class="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <div>
            <h1 class="text-3xl text-gold font-gothic">Painel do Mestre</h1>
            <p v-if="sessionId" class="text-xs text-gray-500 mt-1">Sessão: <span class="text-gold font-mono">{{ sessionId }}</span></p>
        </div>
        <router-link to="/" class="text-sm text-gray-500 hover:text-white">Sair</router-link>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- COLUNA ESQUERDA: CONTROLE DE COMBATE -->
        <div class="lg:col-span-1 bg-yharnam-paper border border-yharnam-border rounded p-4 h-fit">
            <h2 class="text-2xl font-gothic text-blood mb-4">Controle de Combate</h2>
            
            <!-- SETUP DO COMBATE -->
            <div v-if="!combatState.ativo" class="space-y-4">
                <div>
                    <h3 class="text-sm uppercase tracking-widest text-gray-500 mb-2">1. Adicionar Monstros</h3>
                    <div v-for="(monstro, index) in monstrosNaLista" :key="monstro.id" class="flex gap-2 items-center mb-1">
                        <input v-model="monstro.nome" placeholder="Nome" class="bg-black/50 border-b border-gray-700 p-1 rounded w-full text-sm">
                        <input v-model.number="monstro.iniciativa" type="number" placeholder="Ini" class="bg-black/50 border-b border-gray-700 p-1 rounded w-20 text-sm">
                    </div>
                    <button @click="addMonstroToList" class="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded mt-1 w-full">+ Monstro</button>
                </div>

                <div>
                    <h3 class="text-sm uppercase tracking-widest text-gray-500 mb-2">2. Iniciativa dos Jogadores</h3>
                    <div v-for="([id, player]) in jogadoresConectados" :key="id">
                        <div class="flex gap-2 items-center mb-1">
                            <label class="w-full text-blue-300">{{ player.nome }}</label>
                            <input v-model.number="playerInitiatives[id]" type="number" placeholder="Ini" class="bg-black/50 border-b border-gray-700 p-1 rounded w-20 text-sm text-center">
                        </div>
                    </div>
                </div>

                <button @click="iniciarCombate" class="w-full bg-blood hover:bg-red-700 text-white font-gothic py-3 mt-4 text-lg uppercase tracking-widest rounded">
                    INICIAR COMBATE
                </button>
            </div>

            <!-- CONTROLE DO COMBATE ATIVO -->
            <div v-else>
                 <div class="flex justify-between items-center mb-4">
                    <button @click="proximoTurno" class="bg-gold hover:bg-gold-dim text-black font-gothic py-2 px-6 rounded">Próximo</button>
                    <button @click="encerrarCombate" class="text-xs text-gray-500 hover:text-blood">Encerrar Combate</button>
                 </div>
                 <div class="space-y-1">
                    <div v-for="(p, index) in combatState.ordem" :key="p.id" 
                         class="p-2 rounded flex justify-between items-center"
                         :class="index === combatState.turnoAtual ? 'bg-gold/20' : ''">
                        <span class="font-gothic text-lg" :class="p.tipo === 'jogador' ? 'text-blue-300' : 'text-red-400'">{{ p.nome }}</span>
                        <span class="font-mono text-sm text-gray-400">{{ p.iniciativa }}</span>
                    </div>
                 </div>
            </div>
        </div>

        <!-- COLUNA DIREITA: GERENCIAMENTO DE JOGADORES -->
        <div class="lg:col-span-2">
            <h2 class="text-2xl font-gothic text-gold mb-4">Jogadores na Sessão</h2>

            <!-- SEÇÃO: JOGADORES NA SALA - AGUARDANDO FICHA -->
            <div v-if="jogadoresNaSala.length > 0" class="mb-8">
                <h3 class="text-lg font-gothic text-blue-400 mb-3">🔵 Na Sala - Escolher Ficha ({{ jogadoresNaSala.length }})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-for="([id, char]) in jogadoresNaSala" :key="id" class="bg-yharnam-paper border border-blue-600 rounded shadow-lg">
                        <div class="bg-blue-900/30 p-3 border-b border-blue-700 flex justify-between items-center">
                            <h4 class="text-lg font-bold text-blue-400 font-gothic">{{ char.nome }}</h4>
                            <button @click="expulsarJogador(id)" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-900/30 rounded">
                                Expulsar
                            </button>
                        </div>
                        <div class="p-4">
                            <p class="text-xs text-blue-400 mb-3">Atribuir Ficha:</p>
                            <div class="flex flex-col gap-2">
                                <button @click="aplicarTemplate(id, 'cacador_machado')" 
                                        class="bg-gray-800 hover:bg-gray-700 text-sm py-2 px-3 rounded text-left">🪓 Machado de Caçador</button>
                                <button @click="aplicarTemplate(id, 'cacador_cutelo')" 
                                        class="bg-gray-800 hover:bg-gray-700 text-sm py-2 px-3 rounded text-left">🔪 Cutelo Cerrado</button>
                                <button @click="aplicarTemplate(id, 'cacador_bengala')" 
                                        class="bg-gray-800 hover:bg-gray-700 text-sm py-2 px-3 rounded text-left">🦯 Bengala Enroscada</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SEÇÃO: JOGADORES CONECTADOS -->
            <div>
                <h3 class="text-lg font-gothic text-green-400 mb-3">🟢 Jogadores Conectados ({{ jogadoresConectados.length }})</h3>
                <div v-if="jogadoresConectados.length === 0" class="text-center text-gray-500 text-sm py-4">
                    Nenhum jogador conectado ainda...
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div v-for="([id, char]) in jogadoresConectados" :key="id" class="bg-yharnam-paper border border-gray-700 rounded shadow-lg">
                        <div class="bg-black/50 p-3 border-b border-gray-700 flex justify-between items-center">
                            <h3 class="text-lg font-bold text-gold font-gothic">{{ char.nome }}</h3>
                        </div>

                        <div class="p-4 space-y-4">
                            <div class="flex justify-between text-xs uppercase text-gray-500">
                                <span>Vida: {{ char.hp_atual }} / {{ char.hp_max }}</span>
                                <button @click="resetarJogador(id)" class="hover:text-red-500">Resetar Ficha</button>
                            </div>
                            <input type="range" min="0" :max="char.hp_max" :value="char.hp_atual" @input="e => atualizarHP(id, parseInt(e.target.value))"
                                   class="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blood">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>