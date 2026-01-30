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
const selectedPlayer = ref(null); // Jogador selecionado para editar
const showWeaponForm = ref(false); // Mostrar formulário de arma
const newWeapon = ref({ nome: '', dano: '', tipo: '' }); // Nova arma
const searchFilter = ref(''); // Filtro de pesquisa

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
    const jogador = players.value[id];
    if (!jogador) return;
    
    const confirmed = confirm(`⚠️ Tem certeza que deseja EXPULSAR "${jogador.nome}" da sessão?\n\nEsta ação é irreversível.`);
    if (confirmed) {
        console.log('Expulsando jogador:', id, jogador.nome);
        
        // Remove localmente primeiro para feedback imediato
        delete players.value[id];
        
        // Depois atualiza no Firebase marcando como expulso
        if (sessionId) {
            updateSessionCharacter(sessionId, id, { expulso: true, esperando: false });
        } else {
            updateCharacterData(id, { expulso: true, esperando: false });
        }
        alert(`✅ ${jogador.nome} foi expulso da sessão.`);
    }
};

// Função para RECUSAR entrada do jogador
const recusarJogador = (id) => {
    // Implementar lógica de recusa (remover jogador ou marcar como recusado)
    console.log('Jogador recusado:', id);
};

// Função para ATRIBUIR ficha ao jogador já aprovado
const aplicarTemplate = (id, tipo) => {
    console.log('MasterDashboard - Iniciando aplicação de template');
    console.log('MasterDashboard - ID recebido:', id);
    console.log('MasterDashboard - Tipo:', tipo);
    
    const jogadorAtual = players.value[id];
    if (!jogadorAtual) {
        console.error('MasterDashboard - Jogador não encontrado:', id);
        console.error('MasterDashboard - IDs disponíveis:', Object.keys(players.value));
        alert(`❌ Erro: Jogador não encontrado!\n\nID procurado: ${id}\nIDs disponíveis: ${Object.keys(players.value).join(', ')}`);
        return;
    }
    
    console.log('MasterDashboard - Jogador encontrado:', jogadorAtual);
    
    // Cria ficha COMPLETA com dados do template + nome e sessão
    const fichaCriada = {
        nome: jogadorAtual.nome,
        sessaoId: jogadorAtual.sessaoId,
        aprovado: true,
        esperando: false, // ✅ CRÍTICO: Muda para false para sair do ApprovedLobby
        ...templates[tipo]
    };
    
    console.log('MasterDashboard - Dados da ficha a enviar:', fichaCriada);
    
    // Atualiza localmente primeiro para feedback imediato
    players.value[id] = fichaCriada;
    
    try {
        // Depois atualiza no Firebase
        if (sessionId) {
            console.log('MasterDashboard - Modo Sessão: updateSessionCharacter');
            updateSessionCharacter(sessionId, id, fichaCriada);
        } else {
            console.log('MasterDashboard - Modo Clássico: updateCharacterData');
            updateCharacterData(id, fichaCriada);
        }
        console.log('MasterDashboard - Ficha enviada para Firebase com sucesso!');
        alert(`✅ Ficha de ${jogadorAtual.nome} atribuída com sucesso!`);
    } catch (error) {
        console.error('Erro ao atribuir ficha:', error);
        alert('❌ Erro ao atribuir ficha. Verifique o console.');
    }
};

// Função para resetar jogador (volta para aguardando ficha)
const resetarJogador = (id) => {
    const jogador = players.value[id];
    if (!jogador) return;
    
    const confirmed = confirm(`🔄 Resetar "${jogador.nome}"?\n\nEle voltará para aguardar atribuição de ficha.`);
    if (confirmed) {
        console.log('Resetando jogador:', id, jogador.nome);
        
        // Atualiza localmente primeiro
        players.value[id] = { 
            ...players.value[id], 
            esperando: true,
            hp_atual: players.value[id].hp_max || 20,
            frascos: 5,
            balas: 5,
            status: []
        };
        
        // Depois atualiza no Firebase
        const resetData = {
            esperando: true,
            hp_atual: jogador.hp_max || 20,
            frascos: 5,
            balas: 5,
            status: []
        };
        
        if (sessionId) {
            updateSessionCharacter(sessionId, id, resetData);
        } else {
            updateCharacterData(id, resetData);
        }
        
        alert(`✅ ${jogador.nome} foi resetado!`);
    }
};

// Função para atualizar HP
const atualizarHP = (id, novoHP) => {
    // Atualiza localmente primeiro para feedback instantâneo
    if (players.value[id]) {
        players.value[id].hp_atual = novoHP;
    }
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { hp_atual: novoHP });
    } else {
        updateCharacterData(id, { hp_atual: novoHP });
    }
};

onMounted(() => {
    console.log('MasterDashboard montado! SessionId:', sessionId);
    if (sessionId) {
        // Modo Sessão
        subscribeToSessionCharacters(sessionId, (data) => {
            console.log('MasterDashboard - Jogadores da sessão atualizados:', data);
            console.log('MasterDashboard - IDs dos jogadores:', data ? Object.keys(data) : 'nenhum');
            players.value = data || {};
        });
    } else {
        // Modo Clássico
        console.log('MasterDashboard - Modo clássico (sem sessão)');
        subscribeToAllCharacters((data) => { 
            console.log('MasterDashboard - Todos os personagens:', data);
            players.value = data; 
        });
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
    return Object.entries(players.value).filter(([id, char]) => 
        char.esperando === true && !char.expulso
    );
});

const jogadoresConectados = computed(() => {
    return Object.entries(players.value).filter(([id, char]) => 
        char.esperando === false && !char.expulso
    );
});

// Jogadores conectados filtrados pela busca
const jogadoresFiltrados = computed(() => {
    return jogadoresConectados.value.filter(([id, char]) => 
        char.nome.toLowerCase().includes(searchFilter.value.toLowerCase())
    );
});

// Função para adicionar arma
const adicionarArma = (playerId) => {
    if (!newWeapon.value.nome || !newWeapon.value.dano) return;
    
    const player = players.value[playerId];
    if (!player) return;
    
    const equipamentos = [...(player.equipamentos || [])];
    equipamentos.push({ ...newWeapon.value });
    
    // Atualiza localmente primeiro
    players.value[playerId] = { ...player, equipamentos };
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, playerId, { equipamentos });
    } else {
        updateCharacterData(playerId, { equipamentos });
    }
    
    newWeapon.value = { nome: '', dano: '', tipo: '' };
    showWeaponForm.value = false;
};

// Função para remover arma
const removerArma = (playerId, armaIndex) => {
    const player = players.value[playerId];
    if (!player) return;
    
    const equipamentos = [...(player.equipamentos || [])];
    equipamentos.splice(armaIndex, 1);
    
    // Atualiza localmente primeiro
    players.value[playerId] = { ...player, equipamentos };
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, playerId, { equipamentos });
    } else {
        updateCharacterData(playerId, { equipamentos });
    }
};

// Computado para obter armas do jogador selecionado
const selectedPlayerArmas = computed(() => {
    if (!selectedPlayer.value) return [];
    return (players.value[selectedPlayer.value]?.equipamentos || []);
});

// Computado para retornar cor baseada no HP
const hpStatus = (char) => {
    const pct = (char.hp_atual / char.hp_max) * 100;
    if (pct >= 75) return 'green';
    if (pct >= 50) return 'yellow';
    if (pct >= 25) return 'orange';
    return 'red';
};

</script>

<template>
<div class="min-h-screen bg-black text-gray-300 p-6" style="min-width: 1200px;">
    <!-- HEADER -->
    <div class="flex justify-between items-center mb-8 border-b border-red-900/50 pb-6">
        <div>
            <h1 class="text-4xl text-amber-100 font-cinzel tracking-widest">PAINEL DO MESTRE</h1>
            <p v-if="sessionId" class="text-sm text-gray-500 mt-2 font-mono">Sessão: <span class="text-red-400">{{ sessionId }}</span></p>
        </div>
        <router-link to="/" class="text-sm text-gray-400 hover:text-amber-100 transition-colors px-4 py-2 border border-gray-700 rounded hover:border-amber-700">
            <span class="material-symbols-outlined align-middle mr-1">exit_to_app</span>Sair
        </router-link>
    </div>

    <!-- LAYOUT PRINCIPAL (4 COLUNAS DESKTOP) -->
    <div class="grid grid-cols-4 gap-6">
        <!-- COLUNA ESQUERDA: COMBATE -->
        <div class="col-span-1">
            <div class="glass-panel p-6 rounded sticky top-6" style="max-height: calc(100vh - 120px); overflow-y-auto;">
                <h2 class="font-cinzel text-xl text-red-400 tracking-wider mb-4 uppercase flex items-center gap-2">
                    <span class="material-symbols-outlined">sports_kabaddi</span> Combate
                </h2>
                
                <!-- SETUP DO COMBATE -->
                <div v-if="!combatState.ativo" class="space-y-4">
                    <!-- Monstros -->
                    <div>
                        <label class="text-xs uppercase tracking-widest text-gray-400 block mb-2">Monstros</label>
                        <div v-for="monstro in monstrosNaLista" :key="monstro.id" class="space-y-2 mb-3 pb-3 border-b border-white/10">
                            <input v-model="monstro.nome" placeholder="Nome" class="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-red-700 outline-none">
                            <input v-model.number="monstro.iniciativa" type="number" placeholder="Iniciativa" class="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-red-700 outline-none">
                        </div>
                        <button @click="addMonstroToList" class="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 hover:border-red-700 text-amber-100 py-2 rounded text-sm transition-colors">
                            + Adicionar Monstro
                        </button>
                    </div>

                    <!-- Iniciativa Jogadores -->
                    <div v-if="jogadoresConectados.length > 0">
                        <label class="text-xs uppercase tracking-widest text-gray-400 block mb-2">Iniciativa Jogadores</label>
                        <div v-for="([id, player]) in jogadoresConectados" :key="id" class="flex gap-2 items-center mb-2">
                            <span class="text-xs text-gray-400 flex-1 truncate">{{ player.nome }}</span>
                            <input v-model.number="playerInitiatives[id]" type="number" placeholder="Ini" class="w-16 bg-black/50 border border-gray-700 rounded px-2 py-1 text-xs text-center text-gray-300 focus:border-red-700 outline-none">
                        </div>
                    </div>

                    <!-- Iniciar Combate -->
                    <button @click="iniciarCombate" class="w-full bg-red-700 hover:bg-red-600 text-white font-cinzel py-3 rounded uppercase tracking-wider text-sm transition-colors mt-4">
                        Iniciar Combate
                    </button>
                </div>

                <!-- COMBATE ATIVO -->
                <div v-else class="space-y-3">
                    <div class="flex gap-2">
                        <button @click="proximoTurno" class="flex-1 bg-amber-700 hover:bg-amber-600 text-black font-cinzel py-2 rounded uppercase text-xs transition-colors">
                            Próximo Turno
                        </button>
                        <button @click="encerrarCombate" class="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-amber-100 py-2 rounded text-xs transition-colors">
                            Encerrar
                        </button>
                    </div>
                    <div class="space-y-1 max-h-48 overflow-y-auto">
                        <div v-for="(p, idx) in combatState.ordem" :key="p.id" 
                             class="p-2 rounded text-xs font-cinzel transition-colors"
                             :class="idx === combatState.turnoAtual ? 'bg-amber-700/30 border border-amber-600' : 'bg-black/30 border border-transparent'">
                            <div class="flex justify-between items-center">
                                <span :class="p.tipo === 'jogador' ? 'text-blue-400' : 'text-red-500'">{{ p.nome }}</span>
                                <span class="text-gray-500">{{ p.iniciativa }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- COLUNA CENTRAL: JOGADORES NA SALA -->
        <div class="col-span-3">
            <!-- AGUARDANDO FICHA -->
            <div v-if="jogadoresNaSala.length > 0" class="mb-8">
                <h2 class="font-cinzel text-xl text-blue-400 tracking-wider mb-4 uppercase flex items-center gap-2">
                    <span class="material-symbols-outlined">person_add</span> Aguardando Ficha ({{ jogadoresNaSala.length }})
                </h2>
                <div class="grid grid-cols-2 gap-4">
                    <div v-for="([id, char]) in jogadoresNaSala" :key="id" 
                         class="glass-panel p-4 rounded border border-blue-900/50 hover:border-blue-700/50 transition-colors">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-cinzel text-blue-300 text-lg">{{ char.nome }}</h3>
                                <p class="text-xs text-gray-500 mt-1">⏳ Aguardando atribuição de ficha</p>
                            </div>
                            <button @click="expulsarJogador(id)" 
                                    class="text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-700 text-red-300 hover:text-red-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                    title="Expulsar este jogador">
                                <span class="material-symbols-outlined text-sm">person_remove</span>
                            </button>
                        </div>
                        
                        <p class="text-xs text-gray-400 mb-3">Selecione um arquétipo:</p>
                        <div class="space-y-2">
                            <button @click="aplicarTemplate(id, 'cacador_machado')" class="w-full bg-black/40 hover:bg-black/60 border border-gray-700 hover:border-amber-700 text-gray-300 hover:text-amber-100 py-2 px-3 rounded text-xs transition-colors text-left">
                                🪓 Machado de Caçador (HP: 24)
                            </button>
                            <button @click="aplicarTemplate(id, 'cacador_cutelo')" class="w-full bg-black/40 hover:bg-black/60 border border-gray-700 hover:border-amber-700 text-gray-300 hover:text-amber-100 py-2 px-3 rounded text-xs transition-colors text-left">
                                🔪 Cutelo Cerrado (HP: 20)
                            </button>
                            <button @click="aplicarTemplate(id, 'cacador_bengala')" class="w-full bg-black/40 hover:bg-black/60 border border-gray-700 hover:border-amber-700 text-gray-300 hover:text-amber-100 py-2 px-3 rounded text-xs transition-colors text-left">
                                🦯 Bengala Enroscada (HP: 18)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- JOGADORES CONECTADOS -->
            <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h2 class="font-cinzel text-xl text-green-400 tracking-wider uppercase flex items-center gap-2">
                        <span class="material-symbols-outlined">check_circle</span> Jogadores Conectados ({{ jogadoresConectados.length }})
                    </h2>
                    <input v-model="searchFilter" 
                           type="text" 
                           placeholder="Filtrar jogadores..." 
                           class="w-64 bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                </div>
                
                <div v-if="jogadoresConectados.length === 0" class="glass-panel p-8 rounded text-center text-gray-500">
                    <p class="text-sm">Nenhum jogador conectado ainda...</p>
                </div>

                <div v-else-if="jogadoresFiltrados.length === 0" class="glass-panel p-8 rounded text-center text-gray-500">
                    <p class="text-sm">Nenhum jogador encontrado com o filtro "{{ searchFilter }}"</p>
                </div>

                <div v-else class="grid grid-cols-2 gap-4" style="max-height: calc(100vh - 250px); overflow-y-auto;">
                    <div v-for="([id, char]) in jogadoresFiltrados" :key="id" 
                         @click="selectedPlayer = selectedPlayer === id ? null : id"
                         class="glass-panel p-4 rounded border transition-all cursor-pointer"
                         :class="selectedPlayer === id ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700/50 hover:border-gray-600'">
                        
                        <!-- Cabeçalho -->
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-cinzel text-amber-100 text-lg">{{ char.nome }}</h3>
                                <div class="flex gap-2 items-center mt-1">
                                    <p class="text-xs text-gray-500">Nível {{ char.level || 1 }}</p>
                                    <div v-if="char.equipamentos && char.equipamentos.length > 0" class="text-[10px] bg-amber-900/30 border border-amber-700/50 text-amber-300 px-2 py-0.5 rounded">
                                        {{ char.equipamentos[0].nome.split(' ').slice(0, 2).join(' ') }}
                                    </div>
                                </div>
                            </div>
                            <button @click.stop="resetarJogador(id)" class="text-xs bg-gray-900/50 hover:bg-gray-900/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 px-2 py-1 rounded transition-colors">
                                <span class="material-symbols-outlined text-sm align-middle">refresh</span>
                            </button>
                        </div>

                        <!-- Stats Rápido -->
                        <div class="space-y-2 mb-3">
                            <!-- HP Bar Visual -->
                            <div class="space-y-1">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-400">Vida</span>
                                    <span :class="hpStatus(char) === 'green' ? 'text-green-400' : hpStatus(char) === 'yellow' ? 'text-yellow-400' : hpStatus(char) === 'orange' ? 'text-orange-400' : 'text-red-400'" 
                                          class="font-mono">{{ char.hp_atual }}/{{ char.hp_max }}</span>
                                </div>
                                <div class="w-full h-3 bg-black/50 rounded overflow-hidden border border-gray-700">
                                    <div :style="{ width: (char.hp_atual / char.hp_max * 100) + '%' }"
                                         :class="hpStatus(char) === 'green' ? 'bg-green-600' : hpStatus(char) === 'yellow' ? 'bg-yellow-600' : hpStatus(char) === 'orange' ? 'bg-orange-600' : 'bg-red-600'"
                                         class="h-full transition-all duration-300 rounded"></div>
                                </div>
                            </div>

                            <!-- Frascos e Balas -->
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div class="bg-green-900/20 border border-green-700/30 rounded p-2">
                                    <p class="text-gray-500 text-[10px] uppercase">Frascos</p>
                                    <p class="text-green-400 font-mono">{{ char.frascos || 0 }}/5</p>
                                </div>
                                <div class="bg-blue-900/20 border border-blue-700/30 rounded p-2">
                                    <p class="text-gray-500 text-[10px] uppercase">Balas</p>
                                    <p class="text-blue-400 font-mono">{{ char.balas || 0 }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Controle HP (visível ao expandir ou sempre) -->
                        <div v-if="selectedPlayer === id" class="mb-3 pt-3 border-t border-gray-700 space-y-2">
                            <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
                                <span>Ajustar HP</span>
                                <span class="text-amber-400">{{ char.hp_atual }}</span>
                            </div>
                            <input type="range" min="0" :max="char.hp_max" :value="char.hp_atual" 
                                   @input="e => atualizarHP(id, parseInt(e.target.value))"
                                   class="w-full h-2 bg-gray-800 rounded appearance-none cursor-pointer accent-red-700">
                        </div>

                        <!-- Expandido -->
                        <div v-if="selectedPlayer === id" class="border-t border-gray-700 pt-3 space-y-3">
                            <!-- Armas -->
                            <div>
                                <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-700/50">
                                    <label class="text-xs uppercase tracking-widest text-amber-400 font-cinzel">⚔ Armas ({{ char.equipamentos?.length || 0 }})</label>
                                    <button @click.stop="showWeaponForm = !showWeaponForm" 
                                            class="w-7 h-7 flex items-center justify-center bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/50 text-amber-400 rounded transition-colors">
                                        <span class="material-symbols-outlined text-sm">{{ showWeaponForm ? 'remove' : 'add' }}</span>
                                    </button>
                                </div>

                                <!-- Formulário Nova Arma -->
                                <div v-if="showWeaponForm && selectedPlayer === id" class="weapon-form bg-black/50 rounded-lg p-3 mb-3 space-y-2 border-2 border-amber-700/50 backdrop-blur-sm">
                                    <div class="space-y-2">
                                        <input v-model="newWeapon.nome" 
                                               placeholder="Nome da arma" 
                                               class="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                                        <div class="grid grid-cols-2 gap-2">
                                            <input v-model="newWeapon.dano" 
                                                   placeholder="Dano (1d8+2)" 
                                                   class="bg-black/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                                            <input v-model="newWeapon.tipo" 
                                                   placeholder="Tipo" 
                                                   class="bg-black/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                                        </div>
                                        <button @click.stop="adicionarArma(id)" 
                                                class="w-full bg-amber-700 hover:bg-amber-600 text-white font-cinzel py-2 rounded text-xs tracking-wider transition-colors uppercase">
                                            <span class="material-symbols-outlined text-sm align-middle mr-1">add_circle</span>Adicionar
                                        </button>
                                    </div>
                                </div>

                                <!-- Lista Armas -->
                                <div v-if="selectedPlayer === id" class="space-y-1 max-h-48 overflow-y-auto">
                                    <div v-for="(arma, idx) in selectedPlayerArmas" :key="idx" 
                                         class="bg-gradient-to-r from-amber-900/20 to-amber-900/10 hover:from-amber-900/30 hover:to-amber-900/20 rounded-lg p-3 flex justify-between items-start border border-amber-700/30 transition-all">
                                        <div class="flex-1">
                                            <p class="text-gray-200 font-cinzel text-sm flex items-center gap-2">
                                                <span class="material-symbols-outlined text-base">swords</span>
                                                {{ arma.nome }}
                                            </p>
                                            <p class="text-gray-500 text-[11px] mt-1">
                                                <span class="text-amber-400 font-mono">{{ arma.dano }}</span> 
                                                <span v-if="arma.tipo" class="ml-2 text-gray-600">{{ arma.tipo }}</span>
                                            </p>
                                        </div>
                                        <button @click.stop="removerArma(id, idx)" 
                                                class="ml-3 text-red-600/70 hover:text-red-500 transition-colors flex-shrink-0">
                                            <span class="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                    <div v-if="selectedPlayerArmas.length === 0" class="text-center text-gray-600 text-xs py-4">
                                        <span class="material-symbols-outlined text-base align-middle">info</span> Sem armas
                                    </div>
                                </div>
                            </div>

                            <!-- Status -->
                            <div v-if="char.status && char.status.length > 0">
                                <label class="text-xs uppercase tracking-widest text-gray-400 block mb-1">Status Ativos</label>
                                <div class="flex flex-wrap gap-1">
                                    <span v-for="status in char.status" :key="status" class="bg-red-900/30 border border-red-700/50 text-red-300 text-xs px-2 py-1 rounded">
                                        {{ status }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<style scoped>
/* Animação de expansão */
.player-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-card.selected {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0.9;
        max-height: 150px;
    }
    to {
        opacity: 1;
        max-height: 500px;
    }
}

/* Range Input Customizado */
input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    background: #2a2a2a;
    border-radius: 5px;
    outline: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #d97706, #b45309);
    border: 2px solid #f59e0b;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(217, 119, 6, 0.4);
    transition: all 0.2s;
}

input[type="range"]::-webkit-slider-thumb:hover {
    width: 18px;
    height: 18px;
    box-shadow: 0 0 12px rgba(217, 119, 6, 0.6);
}

input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #d97706, #b45309);
    border: 2px solid #f59e0b;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(217, 119, 6, 0.4);
    transition: all 0.2s;
}

input[type="range"]::-moz-range-thumb:hover {
    width: 18px;
    height: 18px;
    box-shadow: 0 0 12px rgba(217, 119, 6, 0.6);
}

/* Efeito de hover em botões */
button {
    position: relative;
    overflow: hidden;
}

button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
}

button:hover::before {
    left: 100%;
}

/* Estilos para modal de armas */
.weapon-form {
    animation: fadeInDown 0.3s ease-out;
}

@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Cards com glassmorphism melhorado */
.glass-card {
    background: linear-gradient(135deg, rgba(10, 10, 10, 0.5) 0%, rgba(26, 26, 26, 0.3) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(217, 119, 6, 0.1);
    transition: all 0.3s ease;
}

.glass-card:hover {
    border-color: rgba(217, 119, 6, 0.3);
    box-shadow: 0 8px 32px rgba(217, 119, 6, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.05);
}

/* Scroll suave para listas */
.overflow-y-auto {
    scroll-behavior: smooth;
}

/* Tooltip-like effect */
.stat-badge {
    position: relative;
    transition: all 0.2s ease;
}

.stat-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>