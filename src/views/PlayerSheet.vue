<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { subscribeToCharacter, updateCharacterData, subscribeToCombat, subscribeToSessionCombat } from '../services/firebase';
import { getDatabase, ref as dbRef, onValue, update } from 'firebase/database';
import { getApp } from 'firebase/app';
import InitiativeTracker from '../components/InitiativeTracker.vue';

const route = useRoute();
const charId = route.params.id;
const character = ref(null);
const combatState = ref({ ativo: false });
const db = getDatabase(getApp());

const isSession = charId.includes('_');
const sessionId = isSession ? charId.split('_')[0] : null;

const hpPercentage = computed(() => {
    if (!character.value || !character.value.hp_max) return 0;
    return (character.value.hp_atual / character.value.hp_max) * 100;
});

const staminaPercentage = computed(() => {
    if (!character.value) return 0;
    return ((character.value.frascos || 0) / 5) * 100;
});

const frenzySusceptibility = computed(() => {
    if (!character.value) return 0;
    return (character.value.insight || 0) / 50 * 100;
});

onMounted(() => {
    console.log('PlayerSheet montado - CharID:', charId, 'IsSession:', isSession, 'SessionID:', sessionId);
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        console.log('PlayerSheet - Observando:', `sessoes/${sessionId}/personagens/${charId}`);
        onValue(charRef, (snapshot) => {
            const data = snapshot.val();
            console.log('PlayerSheet - Dados recebidos:', data);
            character.value = data;
        });
        
        const combatRef = dbRef(db, `sessoes/${sessionId}/combate`);
        onValue(combatRef, (snapshot) => {
            combatState.value = snapshot.val() || { ativo: false };
        });
    } else {
        subscribeToCharacter(charId, (data) => {
            character.value = data;
        });
        subscribeToCombat((data) => {
            combatState.value = data;
        });
    }
});

const alterarRecurso = (tipo, valor) => {
    if (!character.value) return;
    const novoValor = (character.value[tipo] || 0) + valor;
    if (novoValor < 0) return;
    
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        update(charRef, { [tipo]: novoValor });
    } else {
        updateCharacterData(charId, { [tipo]: novoValor });
    }
};
</script>

<template>
    <div v-if="character" class="min-h-screen bg-black text-gray-300 font-sans overflow-x-hidden">
        <!-- HEADER -->
        <header class="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-4 md:pb-6 lg:pb-8 gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 md:gap-6 w-full sm:w-auto">
                <div class="w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 border border-white/20 flex items-center justify-center bg-black/50 shadow-inner flex-shrink-0">
                    <span class="material-symbols-outlined text-gray-400 text-2xl sm:text-2xl md:text-3xl">account_circle</span>
                </div>
                <div class="text-center sm:text-left">
                    <div class="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3 md:gap-4 flex-wrap mb-2 md:mb-3">
                        <h1 class="text-2xl sm:text-3xl md:text-4xl tracking-widest text-white uppercase leading-none font-cinzel font-bold">{{ character.nome }}</h1>
                        <span class="font-playfair text-red-700 italic text-xs sm:text-sm md:text-base tracking-wider opacity-90">Caçador Yharnam</span>
                    </div>
                    <div class="text-[10px] sm:text-xs text-gray-500 font-cinzel uppercase tracking-widest mb-2 md:mb-4">// O Ferido</div>
                    <div class="flex items-center gap-3 sm:gap-4 md:gap-8 mt-2 md:mt-3 text-[9px] sm:text-xs font-cinzel tracking-widest text-gray-400 bg-black/30 px-2 sm:px-3 md:px-4 py-1 md:py-2 border border-white/5 inline-flex flex-wrap justify-center">
                        <div class="flex items-center gap-1 sm:gap-2">
                            <span class="text-gray-600">Nível</span>
                            <span class="text-white text-xs sm:text-sm font-mono font-bold">{{ character.level || 1 }}</span>
                        </div>
                        <div class="w-px h-3 bg-white/10 hidden sm:block"></div>
                        <div class="flex items-center gap-1 sm:gap-2" title="Os olhos que veem verdades ocultas">
                            <span class="text-gray-600">Insight</span>
                            <span class="text-white text-xs sm:text-sm font-mono font-bold">{{ character.insight || 0 }}</span>
                        </div>
                        <div class="w-px h-3 bg-white/10 hidden sm:block"></div>
                        <div class="flex items-center gap-1 sm:gap-2">
                            <span class="text-gray-600">Ecos</span>
                            <span class="text-white text-xs sm:text-sm font-mono font-bold">{{ character.ecos || 0 }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BARRAS PRINCIPAIS -->
            <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                <!-- HP -->
                <div class="space-y-1">
                    <div class="flex justify-between text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-widest text-gray-500 font-cinzel items-baseline">
                        <span>HP</span>
                        <span class="text-red-700 font-bold text-xs sm:text-sm">{{ character.hp_atual }}/{{ character.hp_max }}</span>
                    </div>
                    <div class="stat-bar-bg border-red-700/30 h-5 sm:h-6 md:h-7">
                        <div class="stat-bar-fill bg-red-700 w-[85%] shadow-[0_0_10px_rgba(139,0,0,0.4)] h-full" :style="{ width: hpPercentage + '%' }"></div>
                    </div>
                    <div class="text-[8px] sm:text-[9px] font-playfair italic text-gray-600 text-right">Governado por Vitalidade</div>
                </div>

                <!-- STAMINA (Frascos) -->
                <div class="space-y-1">
                    <div class="flex justify-between text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-widest text-gray-500 font-cinzel items-baseline">
                        <span>Resistência</span>
                        <span class="text-green-100/80 font-bold text-xs sm:text-sm">{{ character.frascos }}/5</span>
                    </div>
                    <div class="stat-bar-bg border-green-900/30 h-5 sm:h-6 md:h-7">
                        <div class="stat-bar-fill bg-green-900/60 w-[70%] h-full" :style="{ width: staminaPercentage + '%' }"></div>
                    </div>
                    <div class="text-[8px] sm:text-[9px] font-playfair italic text-gray-600 text-right">Governado por Resistência</div>
                </div>

                <!-- FRENESI RES -->
                <div class="space-y-1">
                    <div class="flex justify-between text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-widest text-gray-500 font-cinzel items-baseline">
                        <span>Res. Frenesi</span>
                        <span class="text-gray-300 font-bold text-xs sm:text-sm">{{ Math.floor(frenzySusceptibility) }}%</span>
                    </div>
                    <div class="stat-bar-bg border-gray-700 h-5 sm:h-6 md:h-7">
                        <div class="stat-bar-fill bg-gray-500 w-[20%] h-full" :style="{ width: frenzySusceptibility + '%' }"></div>
                    </div>
                    <div class="text-[8px] sm:text-[9px] font-playfair italic text-gray-600 text-right">Governado por Insight</div>
                </div>
            </div>
        </header>

        <!-- CONTEÚDO PRINCIPAL -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5 lg:gap-6 h-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <!-- COLUNA ESQUERDA: ATRIBUTOS + DEFESAS -->
            <div class="md:col-span-1 lg:col-span-3 flex flex-col gap-4 md:gap-5 lg:gap-6">
                <!-- ATRIBUTOS -->
                <div class="glass-panel p-3 sm:p-4 md:p-5">
                    <div class="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                        <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400">Atributos</h2>
                        <span class="material-symbols-outlined text-gray-600 text-sm hover:text-white cursor-pointer transition-colors text-[16px]">edit</span>
                    </div>
                    <div class="space-y-0 divide-y divide-white/5">
                        <div v-for="attr in ['vitality', 'endurance', 'strength', 'skill', 'bloodtinge', 'arcane']" :key="attr"
                             class="grid grid-cols-2 items-center py-1.5 sm:py-2 hover:bg-white/5 transition-colors group relative">
                            <div class="flex items-center gap-0.5 sm:gap-1">
                                <span class="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 font-cinzel group-hover:text-red-700 transition-colors capitalize">
                                    {{ { vitality: 'Vit', endurance: 'Res', strength: 'For', skill: 'Hab', bloodtinge: 'San', arcane: 'Arc' }[attr] }}
                                </span>
                                <span class="material-symbols-outlined text-[8px] sm:text-[10px] text-gray-700 cursor-help opacity-0 group-hover:opacity-100 transition-opacity" 
                                      :title="{ vitality: 'Governa HP', endurance: 'Stamina', strength: 'Força', skill: 'Habilidade', bloodtinge: 'Sangue', arcane: 'Arcano' }[attr]">help</span>
                            </div>
                            <div class="flex justify-end items-center gap-1">
                                <button @click="alterarRecurso(attr, -1)" class="text-gray-600 hover:text-white text-[8px] sm:text-[10px] w-3 sm:w-4 h-3 sm:h-4 flex items-center justify-center border border-transparent hover:border-white/20">−</button>
                                <span class="w-6 sm:w-8 text-center font-mono text-xs sm:text-sm stat-glow stat-dot font-bold">{{ character[attr] || 0 }}</span>
                                <button @click="alterarRecurso(attr, 1)" class="text-gray-600 hover:text-white text-[8px] sm:text-[10px] w-3 sm:w-4 h-3 sm:h-4 flex items-center justify-center border border-transparent hover:border-white/20">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- DEFESAS -->
                <div class="glass-panel p-3 sm:p-4 md:p-5 flex-1">
                    <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400 mb-3 border-b border-white/10 pb-2">Defesa</h2>
                    <div class="grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-2 sm:gap-y-2.5 md:gap-y-3">
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Físico</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_physical || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Impacto</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_blunt || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Perfur.</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_thrust || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Sangue</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_blood || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Arcano</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_arcane || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Fogo</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_fire || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 group-hover:text-gray-300 transition-colors">Relâm.</span>
                            <span class="text-gray-200 font-mono text-xs">{{ character.def_bolt || 0 }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[9px] sm:text-xs border-b border-white/5 pb-1 group">
                            <span class="text-gray-500 text-red-700/80 group-hover:text-red-700 transition-colors font-bold">Descoberta</span>
                            <span class="text-white font-mono text-xs">{{ character.discovery || 0 }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- COLUNA CENTRAL: ARMAMENTO + INDUMENTÁRIA -->
            <div class="md:col-span-1 lg:col-span-5 flex flex-col gap-4 md:gap-5 lg:gap-6">
                <!-- ARMAMENTO -->
                <div class="glass-panel p-3 sm:p-4 md:p-5">
                    <div class="flex justify-between items-end mb-3 border-b border-white/10 pb-2">
                        <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400">Armamento</h2>
                        <span class="text-[8px] sm:text-[9px] md:text-[10px] text-gray-600 uppercase tracking-widest">ATK</span>
                    </div>
                    <div class="grid grid-cols-1 gap-2 sm:gap-2.5 md:gap-3">
                        <div v-if="character.equipamentos && character.equipamentos.length > 0"
                             v-for="(eq, idx) in character.equipamentos" :key="idx"
                             class="ornate-border bg-black/30 p-2 sm:p-3 md:p-3 flex items-center gap-2 sm:gap-3 md:gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div class="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-black/50 border border-white/10 flex-shrink-0 relative flex items-center justify-center">
                                <span class="material-symbols-outlined text-gray-500 text-lg md:text-xl">swords</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-center mb-0.5">
                                    <span class="text-xs sm:text-sm md:text-sm text-gray-200 font-cinzel truncate group-hover:text-white transition-colors">{{ eq.nome }}</span>
                                    <span class="text-xs sm:text-sm md:text-sm font-mono text-white ml-1">{{ eq.dano || 0 }}</span>
                                </div>
                                <div class="flex gap-2 text-[7px] sm:text-[9px] md:text-[10px] text-gray-500 uppercase tracking-wider truncate">
                                    <span class="flex items-center gap-0.5">{{ eq.tipo || 'Arma' }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-else class="border border-white/5 bg-black/10 p-2 sm:p-3 md:p-3 text-[8px] sm:text-xs text-gray-600 font-cinzel uppercase tracking-widest text-center opacity-50">
                            Nenhuma Arma
                        </div>
                    </div>
                </div>

                <!-- INDUMENTÁRIA -->
                <div class="glass-panel p-3 sm:p-4 md:p-5 flex-1">
                    <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400 mb-3 border-b border-white/10 pb-2">Indumentária</h2>
                    <div class="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3">
                        <div class="flex items-center gap-2 sm:gap-3 border border-white/5 p-2 sm:p-2.5 md:p-3 bg-black/20 hover:border-white/20 transition-colors hover:bg-white/5 cursor-pointer">
                            <span class="material-symbols-outlined text-gray-500 text-lg md:text-xl flex-shrink-0">skull</span>
                            <div class="overflow-hidden min-w-0">
                                <span class="block text-xs sm:text-xs md:text-xs text-gray-300 font-cinzel truncate">{{ character.armor_head || 'Chapéu' }}</span>
                                <span class="block text-[7px] sm:text-[8px] md:text-[9px] text-gray-600 uppercase font-playfair italic">Cabeça</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 sm:gap-3 border border-white/5 p-2 sm:p-2.5 md:p-3 bg-black/20 hover:border-white/20 transition-colors hover:bg-white/5 cursor-pointer">
                            <span class="material-symbols-outlined text-gray-500 text-lg md:text-xl flex-shrink-0">checkroom</span>
                            <div class="overflow-hidden min-w-0">
                                <span class="block text-xs sm:text-xs md:text-xs text-gray-300 font-cinzel truncate">{{ character.armor_chest || 'Armadura' }}</span>
                                <span class="block text-[7px] sm:text-[8px] md:text-[9px] text-gray-600 uppercase font-playfair italic">Peito</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 sm:gap-3 border border-white/5 p-2 sm:p-2.5 md:p-3 bg-black/20 hover:border-white/20 transition-colors hover:bg-white/5 cursor-pointer">
                            <span class="material-symbols-outlined text-gray-500 text-lg md:text-xl flex-shrink-0">front_hand</span>
                            <div class="overflow-hidden min-w-0">
                                <span class="block text-xs sm:text-xs md:text-xs text-gray-300 font-cinzel truncate">{{ character.armor_hands || 'Luvas' }}</span>
                                <span class="block text-[7px] sm:text-[8px] md:text-[9px] text-gray-600 uppercase font-playfair italic">Mãos</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 sm:gap-3 border border-white/5 p-2 sm:p-2.5 md:p-3 bg-black/20 hover:border-white/20 transition-colors hover:bg-white/5 cursor-pointer">
                            <span class="material-symbols-outlined text-gray-500 text-lg md:text-xl flex-shrink-0">steps</span>
                            <div class="overflow-hidden min-w-0">
                                <span class="block text-xs sm:text-xs md:text-xs text-gray-300 font-cinzel truncate">{{ character.armor_legs || 'Calças' }}</span>
                                <span class="block text-[7px] sm:text-[8px] md:text-[9px] text-gray-600 uppercase font-playfair italic">Pernas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- COLUNA DIREITA: RUNAS + EFEITOS -->
            <div class="md:col-span-1 lg:col-span-4 flex flex-col gap-4 md:gap-5 lg:gap-6">
                <!-- RUNAS -->
                <div class="glass-panel p-3 sm:p-4 md:p-5">
                    <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400 mb-3 border-b border-white/10 pb-2">Runas</h2>
                    <div class="flex justify-between items-center px-1 sm:px-2 gap-2 sm:gap-3">
                        <div class="flex flex-col items-center gap-1 sm:gap-2 group cursor-pointer">
                            <div class="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 rounded-full border border-white/10 bg-black/40 flex items-center justify-center group-hover:border-red-700/50 group-hover:shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all relative overflow-hidden">
                                <span class="material-symbols-outlined text-gray-400 group-hover:text-red-700 text-base md:text-lg z-10">water_drop</span>
                                <div class="absolute inset-0 bg-red-700/0 group-hover:bg-red-700/10 transition-colors"></div>
                            </div>
                            <span class="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-widest text-gray-500 font-cinzel">Comunhão</span>
                        </div>
                        <div class="flex flex-col items-center gap-1 sm:gap-2 group cursor-pointer">
                            <div class="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 rounded-full border border-white/10 bg-black/40 flex items-center justify-center group-hover:border-red-700/50 group-hover:shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all relative overflow-hidden">
                                <span class="material-symbols-outlined text-gray-400 group-hover:text-red-700 text-base md:text-lg z-10">visibility</span>
                                <div class="absolute inset-0 bg-red-700/0 group-hover:bg-red-700/10 transition-colors"></div>
                            </div>
                            <span class="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-widest text-gray-500 font-cinzel">Olho</span>
                        </div>
                        <div class="flex flex-col items-center gap-1 sm:gap-2 group cursor-pointer">
                            <div class="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 rounded-full border border-white/10 bg-black/40 flex items-center justify-center group-hover:border-red-700/50 group-hover:shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all relative overflow-hidden">
                                <span class="material-symbols-outlined text-gray-400 group-hover:text-red-700 text-base md:text-lg z-10">favorite</span>
                                <div class="absolute inset-0 bg-red-700/0 group-hover:bg-red-700/10 transition-colors"></div>
                            </div>
                            <span class="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-widest text-gray-500 font-cinzel">Anti-Clq</span>
                        </div>
                    </div>
                </div>

                <!-- EFEITOS -->
                <div class="glass-panel p-3 sm:p-4 md:p-5 flex-1 flex flex-col gap-3 md:gap-5">
                    <div>
                        <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400 mb-2 md:mb-3 border-b border-white/10 pb-2">Resistência</h2>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="bg-black/20 p-1.5 sm:p-2 border border-white/5 flex flex-col items-center hover:bg-white/5 transition-colors">
                                <span class="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 uppercase tracking-wide">Lento</span>
                                <span class="text-xs sm:text-sm font-mono text-gray-200">{{ character.resist_slow_psn || 0 }}</span>
                            </div>
                            <div class="bg-black/20 p-1.5 sm:p-2 border border-white/5 flex flex-col items-center hover:bg-white/5 transition-colors">
                                <span class="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 uppercase tracking-wide">Rápido</span>
                                <span class="text-xs sm:text-sm font-mono text-gray-200">{{ character.resist_rapid_psn || 0 }}</span>
                            </div>
                            <div class="bg-black/20 p-1.5 sm:p-2 border border-white/5 flex flex-col items-center relative overflow-hidden group">
                                <div class="absolute bottom-0 left-0 h-0.5 bg-red-900 w-full group-hover:h-1 transition-all"></div>
                                <span class="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 uppercase tracking-wide">Frenesi</span>
                                <span class="text-xs sm:text-sm font-mono text-gray-200">{{ character.resist_frenzy || 0 }}</span>
                            </div>
                            <div class="bg-black/20 p-1.5 sm:p-2 border border-white/5 flex flex-col items-center hover:bg-white/5 transition-colors">
                                <span class="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 uppercase tracking-wide">Beast</span>
                                <span class="text-xs sm:text-sm font-mono text-gray-200">{{ character.resist_beasthood || 0 }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex-1">
                        <h2 class="font-cinzel text-[11px] sm:text-xs md:text-xs tracking-[0.2em] uppercase text-gray-400 mb-2 md:mb-3 border-b border-white/10 pb-2">Efeitos</h2>
                        <div v-if="character.status && character.status.length > 0" class="space-y-1 md:space-y-2">
                            <div v-for="(status, idx) in character.status" :key="idx"
                                 class="flex items-center gap-2 text-[8px] sm:text-xs bg-red-700/10 border-l-2 border-red-700 p-1.5 sm:p-2 hover:bg-red-700/20 transition-colors cursor-help">
                                <span class="material-symbols-outlined text-red-700 text-xs md:text-sm flex-shrink-0">emergency</span>
                                <div class="min-w-0">
                                    <p class="text-gray-200 uppercase tracking-wider font-cinzel text-[7px] sm:text-[9px] md:text-[10px] truncate">{{ status }}</p>
                                    <p class="text-gray-500 text-[6px] sm:text-[8px] md:text-[9px] font-playfair italic truncate">Efeito ativo</p>
                                </div>
                            </div>
                        </div>
                        <div v-else class="text-[8px] sm:text-[9px] text-gray-600 italic font-playfair">Nenhum efeito</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER DOSSIER -->
        <div class="w-full dossier-texture border-t-2 border-red-700/20 p-2 sm:p-3 md:p-4 mt-4 md:mt-2 relative shadow-lg">
            <div class="absolute top-0 left-0 w-full h-1 bg-black/50 blur-[2px]"></div>
            <div class="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 lg:gap-8 max-w-5xl mx-auto relative z-10">
                <h3 class="font-cinzel text-gray-400 uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs border-b border-gray-700 pb-1 mb-1 md:mb-0 flex-shrink-0">Dossier</h3>
                <div class="flex flex-wrap justify-center gap-3 md:gap-4 lg:gap-12 flex-1 text-center md:text-left">
                    <div class="flex flex-col items-center md:items-start">
                        <span class="text-[8px] md:text-[9px] text-gray-500 uppercase tracking-widest font-playfair italic">Origem</span>
                        <span class="text-gray-300 font-cinzel text-xs md:text-sm tracking-wide">{{ character.origin || 'Desconhecida' }}</span>
                    </div>
                    <div class="w-px h-6 bg-gray-800 hidden md:block"></div>
                    <div class="flex flex-col items-center md:items-start">
                        <span class="text-[8px] md:text-[9px] text-gray-500 uppercase tracking-widest font-playfair italic">Juramento</span>
                        <span class="text-gray-300 font-cinzel text-xs md:text-sm tracking-wide">{{ character.oath || 'Nenhum' }}</span>
                    </div>
                    <div class="w-px h-6 bg-gray-800 hidden md:block"></div>
                    <div class="flex flex-col items-center md:items-start">
                        <span class="text-[8px] md:text-[9px] text-red-700/70 uppercase tracking-widest font-playfair italic">Aflição</span>
                        <span class="text-gray-300 font-cinzel text-xs md:text-sm tracking-wide">{{ character.affliction || 'Nenhuma' }}</span>
                    </div>
                </div>
                <div class="w-6 md:w-8 h-6 md:h-8 opacity-20 border border-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-gray-500 text-[14px] md:text-sm">history_edu</span>
                </div>
            </div>
        </div>

        <!-- Combate -->
        <InitiativeTracker v-if="combatState.ativo" :combat-state="combatState" :character-name="character.nome" :character-id="charId" />
    </div>

    <!-- Carregando -->
    <div v-else class="fixed inset-0 min-h-screen flex items-center justify-center bg-black z-50">
        <div class="text-center">
            <div class="w-12 h-12 border-t-2 border-red-700 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-400 font-serif italic">Entrando no Sonho...</p>
        </div>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

html {
  scroll-behavior: smooth;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --font-cinzel: 'Cinzel', serif;
  --font-playfair: 'Playfair Display', serif;
  --font-inter: 'Inter', sans-serif;
}

body {
  background-image: radial-gradient(circle at center, #1a1a1a 0%, #050505 100%);
  background-color: #0a0a0a;
  color: #d3d3d3;
  font-family: var(--font-inter);
}

.ornate-border {
  border: 1px solid rgba(192, 192, 192, 0.2);
  position: relative;
}

.ornate-border::before,
.ornate-border::after {
  content: "";
  position: absolute;
  width: 6px;
  height: 6px;
  border: 1px solid rgba(192, 192, 192, 0.5);
  transition: all 0.3s ease;
}

.ornate-border::before {
  top: -1px;
  left: -1px;
  border-right: 0;
  border-bottom: 0;
}

.ornate-border::after {
  bottom: -1px;
  right: -1px;
  border-left: 0;
  border-top: 0;
}

.ornate-border:hover::before,
.ornate-border:hover::after {
  width: 100%;
  height: 100%;
  border-color: rgba(139, 0, 0, 0.5);
}

.stat-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-bar-fill {
  height: 100%;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-panel {
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
}

.stat-glow {
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.6);
  color: #fff;
}

.stat-dot::after {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  background-color: #c0c0c0;
  border-radius: 50%;
  margin-left: 4px;
  box-shadow: 0 0 4px #c0c0c0;
  vertical-align: middle;
}

.dossier-texture {
  background-color: #1a1815;
}

.font-cinzel {
  font-family: var(--font-cinzel) !important;
}

.font-playfair {
  font-family: var(--font-playfair) !important;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined' !important;
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
</style>