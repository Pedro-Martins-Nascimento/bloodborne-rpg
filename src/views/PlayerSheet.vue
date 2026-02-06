<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { subscribeToCharacter, updateCharacterData, subscribeToCombat, subscribeToSessionCombat } from '../services/firebase';
import { getDatabase, ref as dbRef, onValue, update } from 'firebase/database';
import { getApp } from 'firebase/app';
import InitiativeTracker from '../components/InitiativeTracker.vue';

const route = useRoute();
const charId = route.params.id;
const userId = ref(localStorage.getItem('userId') || '');
const isMaster = computed(() => {
    const result = userId.value.startsWith('mestre_');
    console.log('PlayerSheet - userId:', userId.value, 'isMaster:', result);
    return result;
});
const character = ref(null);
const combatState = ref({ ativo: false });
const db = getDatabase(getApp());
const activeTab = ref('status');
const mostrarModalSangue = ref(false);
const ultimoHPAntesGasto = ref(null);

const isSession = charId.includes('_');
const sessionId = isSession ? charId.split('_')[0] : null;

const hpPercentage = computed(() => {
    if (!character.value || !character.value.hp_max) return 0;
    return (character.value.hp_atual / character.value.hp_max) * 100;
});

const staminaPercentage = computed(() => {
    if (!character.value) return 0;
    return ((character.value.frascos ?? 0) / 3) * 100;
});

const frenzySusceptibility = computed(() => {
    if (!character.value) return 0;
    return (character.value.insight || 0) / 50 * 100;
});

const isGunslinger = computed(() => character.value?.classe === 'Gunslinger');

const classDefaults = {
    Gunslinger: {
        origin: 'Humano (Variante)',
        background: 'Forasteiro',
        antecedente: 'Forasteiro',
        background_feature: 'Vantagem em testes de INT para não ser enganado por superstições locais',
        talentos: ['Atirador Especial', 'Atirador de Elite'],
        resistencias: { destreza: 7, sabedoria: 5 },
        pericias: { intuicao: 5, persuasao: 1, acrobacia: 7, furtividade: 7 }
    },
    Alchemist: {
        origin: 'Anão',
        background: 'Servo da Igreja',
        antecedente: 'Servo da Igreja',
        background_feature: 'Acesso a áreas restritas da Igreja da Cura',
        talentos: ['Curandeiro'],
        resistencias: { inteligencia: 7, constituicao: 5 },
        pericias: { religiao: 7, medicina: 7, investigacao: 7, arcanismo: 7 }
    },
    BloodCursed: {
        origin: 'Tiefling',
        background: 'Sobrevivente da Praga',
        antecedente: 'Sobrevivente da Praga',
        background_feature: 'Identifica infectados pelo cheiro',
        talentos: ['Duradouro'],
        resistencias: { constituicao: 5, forca: 5 },
        pericias: { natureza: 4, medicina: 4, intimidacao: 3, percepcao: 4 }
    },
    GuerreirRessonante: {
        origin: 'Humano',
        background: 'Veterano da Caçada',
        antecedente: 'Veterano da Caçada',
        background_feature: 'Você encontra abrigo seguro em Yharnam facilmente',
        talentos: ['Sentinela'],
        resistencias: { forca: 6, constituicao: 6 },
        pericias: { atletismo: 6, sobrevivencia: 6, percepcao: 5, intuicao: 5 }
    },
    Gunbreaker: {
        origin: 'Meio-Orc',
        background: 'Aprendiz da Oficina',
        antecedente: 'Aprendiz da Oficina',
        background_feature: 'Pode consertar armas e armaduras em descanso curto',
        talentos: ['Mestre de Armas Grandes'],
        resistencias: { forca: 6, destreza: 4 },
        pericias: { historia: 3, investigacao: 3, atletismo: 6, intimidacao: 2 }
    }
};

const origemExibida = computed(() => {
    if (!character.value) return 'Desconhecida';
    return character.value.origin ?? character.value.raca ?? classDefaults[character.value.classe]?.origin ?? 'Desconhecida';
});

const antecedenteExibido = computed(() => {
    if (!character.value) return 'Nenhum';
    return character.value.background ?? character.value.antecedente ?? classDefaults[character.value.classe]?.background ?? 'Nenhum';
});

const resistenciasExibidas = computed(() => {
    if (!character.value) return {};
    const atuais = character.value.resistencias;
    if (atuais && Object.keys(atuais).length > 0) return atuais;
    return classDefaults[character.value.classe]?.resistencias || {};
});

const periciasExibidas = computed(() => {
    if (!character.value) return {};
    const atuais = character.value.pericias;
    if (atuais && Object.keys(atuais).length > 0) return atuais;
    return classDefaults[character.value.classe]?.pericias || {};
});

const talentosExibidos = computed(() => {
    if (!character.value) return [];
    if (character.value.talentos && character.value.talentos.length > 0) return character.value.talentos;
    return classDefaults[character.value.classe]?.talentos || [];
});

const backgroundFeatureExibida = computed(() => {
    if (!character.value) return null;
    return character.value.background_feature ?? classDefaults[character.value.classe]?.background_feature ?? null;
});

onMounted(() => {
    // Garantir que userId está atualizado
    userId.value = localStorage.getItem('userId') || '';
    console.log('PlayerSheet onMounted - userId:', userId.value, 'isMaster:', isMaster.value);
    
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        onValue(charRef, (snapshot) => {
            character.value = snapshot.val();
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

// Mapeamento de Talentos e suas descrições
const talentoDescricoes = {
    'Atirador Especial': 'Seus tiros são mais precisos e causam dano adicional crítico em 19-20.',
    'Atirador de Elite': 'Você pode escolher -5 no acerto para ganhar +10 de dano (Sharpshooter). Ignora cobertura parcial.',
    'Curandeiro': 'Kit de Cura estabiliza E cura 1d6+4. Você economiza poções com essa perícia.',
    'Duradouro': '+2 HP por nível. Vital para compensar auto-dano do Blood Cursed (+10 HP total no nível 5 = 80 HP).',
    'Sentinela': 'Ataque de oportunidade reduz deslocamento do inimigo a 0. Reação para atacar quem bater em aliado adjacente.',
    'Mestre de Armas Grandes': 'Você é especialista em armas de duas mãos. +1d6 de dano com armas grandes.'
};

const getTalentoDescricao = (talento) => {
    return talentoDescricoes[talento] || 'Descrição não disponível para este talento.';
};

const alterarRecurso = (tipo, valor) => {
    if (!isMaster.value) {
        alert('❌ Apenas o Mestre pode editar atributos!');
        return;
    }
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

// Função para gastar Sangue
const gastarSangue = (uso) => {
    if (!character.value || (character.value.sangue ?? 3) <= 0) {
        alert('❌ Sem Sangue disponível!');
        return;
    }

    const novoSangue = (character.value.sangue ?? 3) - 1;
    const hpAntes = character.value.hp_atual;
    const frascosAntes = character.value.frascos ?? 3;
    const novosFrascos = Math.max(0, frascosAntes - 1);
    
    let mensagem = '';
    let atualizacoes = { sangue: novoSangue, frascos: novosFrascos };
    
    if (uso === 'cura') {
        // Cura Rápida: 1d6 + CON
        const con = Math.floor(((character.value.constituicao || 10) - 10) / 2);
        const dado = Math.floor(Math.random() * 6) + 1;
        const cura = dado + con;
        const novoHP = Math.min(character.value.hp_max, hpAntes + cura);
        
        atualizacoes.hp_atual = novoHP;
        atualizacoes.frenesi = (character.value.frenesi || 0) + 1;
        
        mensagem = `🩸 CURA RÁPIDA USADA!\n\n💀 Sangue: ${character.value.sangue ?? 3} → ${novoSangue}\n`;
        mensagem += `🩸 Frascos: ${frascosAntes} → ${novosFrascos}\n`;
        mensagem += `🎲 Rolagem: 1d6 (${dado}) + CON (${con}) = ${cura} HP\n`;
        mensagem += `❤️ HP: ${hpAntes} → ${novoHP}\n`;
        mensagem += `👹 Frenesi: +1 (novo: ${(character.value.frenesi || 0) + 1})`;
        
    } else if (uso === 'impulso') {
        // Impulso Violento: +1d4 no próximo ataque
        atualizacoes.frenesi = (character.value.frenesi || 0) + 1;
        atualizacoes.impulso_violento_ativo = true;
        
        mensagem = `⚡ IMPULSO VIOLENTO ATIVADO!\n\n💀 Sangue: ${character.value.sangue ?? 3} → ${novoSangue}\n`;
        mensagem += `🩸 Frascos: ${frascosAntes} → ${novosFrascos}\n`;
        mensagem += `🔥 Bônus: +1d4 no próximo ataque/dano\n`;
        mensagem += `👹 Frenesi: +1 (novo: ${(character.value.frenesi || 0) + 1})`;
        
    } else if (uso === 'horror') {
        // Resistir ao Horror: Vantagem no próximo teste mental
        atualizacoes.frenesi = (character.value.frenesi || 0) + 1;
        atualizacoes.resistencia_horror_ativa = true;
        
        mensagem = `🛡️ RESISTÊNCIA AO HORROR ATIVADA!\n\n💀 Sangue: ${character.value.sangue ?? 3} → ${novoSangue}\n`;
        mensagem += `🩸 Frascos: ${frascosAntes} → ${novosFrascos}\n`;
        mensagem += `🎲 Vantagem no próximo teste contra medo/controle\n`;
        mensagem += `👹 Frenesi: +1 (novo: ${(character.value.frenesi || 0) + 1})`;
    }

    // Atualiza localmente
    character.value = { ...character.value, ...atualizacoes };
    
    // Atualiza no Firebase
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        update(charRef, atualizacoes);
    } else {
        updateCharacterData(charId, atualizacoes);
    }

    mostrarModalSangue.value = false;
    alert(mensagem);
};

const usarTiroEspecial = (tiro) => {
    if (!character.value || !isGunslinger.value) return;
    if (character.value.grit_atual <= 0) {
        alert('❌ Sem pontos de Grit disponíveis!');
        return;
    }
    
    const novoGrit = character.value.grit_atual - tiro.custo;
    if (novoGrit < 0) {
        alert(`❌ Grit insuficiente!`);
        return;
    }
    
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        update(charRef, { grit_atual: novoGrit });
    } else {
        updateCharacterData(charId, { grit_atual: novoGrit });
    }
    
    alert(`✅ ${tiro.nome} usado!`);
};

const recuperarGrit = () => {
    if (!character.value || !isGunslinger.value) return;
    const novoGrit = Math.min(character.value.grit_max, character.value.grit_atual + 1);
    
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        update(charRef, { grit_atual: novoGrit });
    } else {
        updateCharacterData(charId, { grit_atual: novoGrit });
    }
};

const usarMunicao = () => {
    if (!character.value || !isGunslinger.value) return;
    if (character.value.municao <= 0) {
        alert('❌ Sem munição!');
        return;
    }
    
    const novaMunicao = character.value.municao - 1;
    if (isSession && sessionId) {
        const charRef = dbRef(db, `sessoes/${sessionId}/personagens/${charId}`);
        update(charRef, { municao: novaMunicao });
    } else {
        updateCharacterData(charId, { municao: novaMunicao });
    }
};

const switchTab = (tab) => {
    activeTab.value = tab;
};
</script>

<template>
    <div v-if="character" class="min-h-screen bg-gradient-to-b from-[#1f0505] to-[#0d0d0d] text-gray-300 font-sans pb-20">
        
        <!-- HEADER FIXO -->
        <header class="bg-gradient-to-b from-[#1f0505] to-[#0d0d0d] border-b-2 border-red-900 p-4 text-center sticky top-0 z-30 backdrop-blur-sm">
            <h1 class="font-cinzel text-amber-600 text-2xl tracking-[0.2em] uppercase mb-1 text-shadow">
                {{ character.nome }}
            </h1>
            <div class="flex justify-center gap-3 text-gray-500 text-sm italic">
                <span v-if="isGunslinger">🎯 Gunslinger</span>
                <span v-else>⚔ Caçador</span>
                <span>•</span>
                <span>Nível {{ character.nivel || character.level || 1 }}</span>
                <span v-if="isMaster" class="text-amber-500">• 👑 MESTRE</span>
            </div>
        </header>

        <!-- HUD DE STATUS FIXO -->
        <div class="bg-[#1a1a1a] p-4 border-b border-gray-800 sticky top-[88px] z-20 backdrop-blur-sm">
            <!-- Barra de Vida -->
            <div class="relative bg-[#333] h-5 rounded-sm mb-2 border border-black overflow-hidden">
                <div 
                    class="absolute top-0 left-0 h-full bg-red-900 transition-all duration-300"
                    :style="{ width: hpPercentage + '%', boxShadow: '0 0 10px rgba(138, 3, 3, 0.8)' }"
                ></div>
                <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white text-shadow z-10">
                    {{ character.hp_atual || 0 }} / {{ character.hp_max || 0 }} PV
                </div>
            </div>

            <!-- Stats Principais em Círculos -->
            <div class="flex justify-around items-center mt-4">
                <div class="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-amber-700">
                    <span class="text-2xl font-cinzel font-bold text-amber-600">{{ character.ca || character.def_physical || 10 }}</span>
                    <span class="text-[10px] text-gray-500 uppercase">CA</span>
                </div>

                <div class="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-amber-700">
                    <span class="text-xl font-cinzel font-bold text-amber-600">{{ character.iniciativa >= 0 ? '+' : '' }}{{ character.iniciativa || 0 }}</span>
                    <span class="text-[10px] text-gray-500 uppercase">Init.</span>
                </div>

                <div class="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-amber-700">
                    <span class="text-xl font-cinzel font-bold text-amber-600">{{ character.deslocamento || 9 }}</span>
                    <span class="text-[10px] text-gray-500 uppercase">Desl.</span>
                </div>

                <div class="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-red-700">
                    <span class="text-xl font-cinzel font-bold text-red-500">+{{ character.bonus_prof || 2 }}</span>
                    <span class="text-[10px] text-gray-500 uppercase">Prof.</span>
                </div>
            </div>
        </div>

        <!-- CONTEÚDO DAS ABAS -->
        <div class="p-4">

            <!-- ABA STATUS -->
            <div v-show="activeTab === 'status'" class="space-y-4 animate-fadeIn">
                <!-- Grid de Atributos 3x2 -->
                <div class="grid grid-cols-3 gap-3 mb-4">
                    <div v-for="attr in ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma']" :key="attr"
                         class="bg-[#111] border border-gray-800 rounded p-3 text-center">
                        <div class="text-[10px] text-gray-500 uppercase mb-1">
                            {{ { forca: 'FOR', destreza: 'DES', constituicao: 'CON', inteligencia: 'INT', sabedoria: 'SAB', carisma: 'CAR' }[attr] }}
                        </div>
                        <div class="text-2xl font-bold text-white mb-1">
                            {{ Math.floor(((character[attr] || 10) - 10) / 2) >= 0 ? '+' : '' }}{{ Math.floor(((character[attr] || 10) - 10) / 2) }}
                        </div>
                        <!-- Apenas Mestre pode editar -->
                        <div v-if="isMaster" class="flex items-center justify-center gap-1 mt-2">
                            <button @click="alterarRecurso(attr, -1)" 
                                    class="w-6 h-6 transition-colors text-gray-600 hover:text-white cursor-pointer">−</button>
                            <div class="text-sm text-gray-600 border-t border-gray-800 px-2">{{ character[attr] || 10 }}</div>
                            <button @click="alterarRecurso(attr, 1)" 
                                    class="w-6 h-6 transition-colors text-gray-600 hover:text-white cursor-pointer">+</button>
                        </div>
                        <!-- Jogador apenas visualiza -->
                        <div v-else class="mt-2">
                            <div class="text-sm text-gray-500 text-center">{{ character[attr] || 10 }}</div>
                        </div>
                    </div>
                </div>

                <!-- Testes de Resistência -->
                <div class="bg-[#151515] border border-gray-800 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <h3 class="font-cinzel text-gray-500 border-b border-gray-800 pb-2 mb-3 text-sm">RESISTÊNCIAS</h3>
                    <ul class="space-y-2">
                        <li v-for="(valor, nome) in resistenciasExibidas" :key="nome"
                            class="flex justify-between items-center border-b border-gray-900 pb-2">
                            <span class="capitalize text-sm" :class="valor > 0 ? 'text-amber-600' : ''">
                                {{ { forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição', inteligencia: 'Inteligência', sabedoria: 'Sabedoria', carisma: 'Carisma' }[nome] || nome }}
                            </span>
                            <span class="font-mono">{{ valor >= 0 ? '+' : '' }}{{ valor }}</span>
                        </li>
                    </ul>
                </div>

                <!-- Perícias -->
                <div class="bg-[#151515] border border-gray-800 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <h3 class="font-cinzel text-gray-500 border-b border-gray-800 pb-2 mb-3 text-sm">PERÍCIAS</h3>
                    <ul class="space-y-2 max-h-64 overflow-y-auto">
                        <li v-for="(valor, nome) in periciasExibidas" :key="nome"
                            class="flex justify-between items-center border-b border-gray-900 pb-2">
                            <span class="capitalize text-sm" :class="valor > 0 ? 'text-amber-600' : ''">{{ nome }}</span>
                            <span class="font-mono">{{ valor >= 0 ? '+' : '' }}{{ valor }}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- ABA COMBATE -->
            <div v-show="activeTab === 'combate'" class="space-y-4 animate-fadeIn">

                <!-- 1. SANGUE -->
                <div class="bg-[#151515] border border-red-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <h3 class="font-cinzel text-red-700 border-b border-gray-800 pb-2 mb-3 text-sm">🩸 SANGUE</h3>
                    
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex-1">
                            <p class="text-xs text-gray-400 mb-2">Vitalidade Corrompida (0-6)</p>
                            <div class="flex gap-1">
                                <div v-for="i in 6" :key="'sangue-' + i"
                                     class="flex-1 h-6 rounded border border-red-700 transition-all"
                                     :class="i <= (character.sangue ?? 3) ? 'bg-red-700 shadow-[0_0_5px_rgba(185,28,28,0.8)]' : 'bg-black/40'">
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2 ml-3">
                            <span class="text-lg font-bold text-red-600 text-center">{{ character.sangue ?? 3 }}</span>
                            <button @click="mostrarModalSangue = true" 
                                    class="px-3 py-1 bg-red-900/50 hover:bg-red-900/70 text-red-300 hover:text-red-100 rounded text-xs transition-colors font-semibold">
                                💧 Gastar
                            </button>
                        </div>
                    </div>

                    <div class="text-[10px] text-gray-500">
                        <p class="text-red-400"><em>💡 Clique em Gastar para usar Sangue e escolher um efeito</em></p>
                    </div>
                </div>

                <!-- MODAL: Escolher Uso do Sangue -->
                <div v-if="mostrarModalSangue" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div class="bg-[#1a1a1a] border-2 border-red-700 rounded-lg p-6 max-w-md w-full shadow-2xl">
                        <h2 class="font-cinzel text-red-400 text-xl mb-4 text-center">ESCOLHER USO DO SANGUE</h2>
                        
                        <div class="space-y-3 mb-6">
                            <button @click="gastarSangue('cura')" 
                                    class="w-full p-4 bg-green-900/30 hover:bg-green-900/50 border border-green-700 rounded-lg text-left transition-colors">
                                <p class="font-cinzel text-green-400 font-bold">🏥 Cura Rápida</p>
                                <p class="text-xs text-gray-400 mt-1">1d6 + CON HP (ação bônus)</p>
                            </button>

                            <button @click="gastarSangue('impulso')" 
                                    class="w-full p-4 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-700 rounded-lg text-left transition-colors">
                                <p class="font-cinzel text-yellow-400 font-bold">⚡ Impulso Violento</p>
                                <p class="text-xs text-gray-400 mt-1">+1d4 no próximo ataque ou dano</p>
                            </button>

                            <button @click="gastarSangue('horror')" 
                                    class="w-full p-4 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-left transition-colors">
                                <p class="font-cinzel text-purple-400 font-bold">🛡️ Resistir ao Horror</p>
                                <p class="text-xs text-gray-400 mt-1">Vantagem contra medo ou controle</p>
                            </button>
                        </div>

                        <button @click="mostrarModalSangue = false" 
                                class="w-full p-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 text-gray-300 rounded text-sm transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>



                <!-- 4. FRENESI -->
                <div class="bg-[#151515] border border-purple-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-900 to-transparent"></div>
                    <h3 class="font-cinzel text-purple-700 border-b border-gray-800 pb-2 mb-3 text-sm">👹 FRENESI (Barra de Corrupção)</h3>
                    
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex-1">
                            <div class="flex gap-1">
                                <div v-for="i in 10" :key="'frenesi-' + i"
                                     class="flex-1 h-5 rounded border border-purple-700 transition-all"
                                     :class="i <= (character.frenesi || 0) ? 'bg-purple-700 shadow-[0_0_5px_rgba(147,51,234,0.8)]' : 'bg-black/40'">
                                </div>
                            </div>
                        </div>
                        <div class="ml-3">
                            <span class="text-lg font-bold text-purple-600 text-center block">{{ character.frenesi || 0 }}</span>
                            <p class="text-[9px] text-gray-500 text-center mt-1">Apenas Mestre</p>
                        </div>
                    </div>

                    <div class="space-y-2 text-[10px] text-gray-400 mb-3">
                        <div :class="(character.frenesi || 0) <= 3 ? 'text-green-400' : 'text-gray-400'">
                            <strong>0–3 (Controle):</strong> Nenhum efeito
                        </div>
                        <div :class="(character.frenesi || 0) >= 4 && (character.frenesi || 0) <= 7 ? 'text-yellow-400' : 'text-gray-400'">
                            <strong>4–7 (Fúria Emergente):</strong> Vantagem em ataques | Desvantagem mental
                        </div>
                        <div :class="(character.frenesi || 0) >= 8 ? 'text-red-400' : 'text-gray-400'">
                            <strong>8–10 (Besta Interior):</strong> +1d6 dano | Deve atacar mais próximo
                        </div>
                    </div>

                    <div class="text-[10px] text-gray-500 bg-black/40 p-2 rounded">
                        <strong>Redução:</strong> Descanso curto (CD 14) -3 | Descanso longo = 0
                    </div>
                </div>



                <!-- Ataques/Armas -->
                <div class="bg-[#151515] border border-gray-800 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <h3 class="font-cinzel text-gray-500 border-b border-gray-800 pb-2 mb-3 text-sm">ATAQUES</h3>
                    
                    <div v-if="character.equipamentos && character.equipamentos.length > 0" class="space-y-3">
                        <div v-for="(equip, idx) in character.equipamentos" :key="idx"
                             class="flex justify-between items-center">
                            <div>
                                <div class="font-bold text-white">{{ equip.nome }}</div>
                                <div class="text-xs text-gray-600">{{ equip.dano || '1d8' }} • {{ equip.tipo || 'Cortante' }}</div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-sm text-gray-600 italic text-center py-4">
                        Nenhuma arma equipada
                    </div>
                </div>
            </div>

            <!-- ABA INVENTÁRIO -->
            <div v-show="activeTab === 'inventario'" class="space-y-4 animate-fadeIn">
                <div class="bg-[#151515] border border-gray-800 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <div class="flex justify-between text-amber-600 mb-3">
                        <span>Ecos de Sangue (PO):</span>
                        <span class="font-bold">{{ character.ecos || 0 }}</span>
                    </div>
                </div>

                <div class="bg-[#151515] border border-gray-800 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <h3 class="font-cinzel text-gray-500 border-b border-gray-800 pb-2 mb-3 text-sm">EQUIPAMENTO</h3>
                    
                    <ul class="space-y-2">
                        <li class="flex justify-between items-center border-b border-gray-900 pb-2">
                            <span>Armadura</span>
                            <span class="text-sm text-gray-600">{{ character.armadura || 'Nenhuma' }}</span>
                        </li>
                        <li class="flex justify-between items-center border-b border-gray-900 pb-2">
                            <span>Frasco de Sangue (Poção)</span>
                            <span class="text-sm text-amber-600">x{{ character.frascos || 0 }}</span>
                        </li>
                        <li v-if="isGunslinger" class="flex justify-between items-center border-b border-gray-900 pb-2">
                            <span>Balas de Mercúrio</span>
                            <span class="text-sm text-blue-400">x{{ character.municao || 0 }}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- ABA NOTAS -->
            <div v-show="activeTab === 'notas'" class="space-y-4 animate-fadeIn">
                <!-- DESCRIÇÃO DA CLASSE -->
                <div class="bg-[#151515] border border-blue-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-900 to-transparent"></div>
                    <h3 class="font-cinzel text-blue-600 border-b border-gray-800 pb-2 mb-3 text-sm">📖 SUA CLASSE: {{ character.classe }}</h3>
                    
                    <div class="space-y-3">
                        <div class="bg-black/40 p-3 rounded">
                            <p class="text-xs text-gray-300 leading-relaxed">
                                {{ character.descricao_classe || 'Descrição não carregada. Contacte o Mestre.' }}
                            </p>
                        </div>
                        
                        <!-- Antecedente -->
                        <div v-if="character.antecedente" class="bg-black/40 p-3 rounded border-l-4 border-purple-700">
                            <h4 class="font-cinzel text-purple-400 text-xs mb-2 uppercase">Antecedente</h4>
                            <p class="text-xs text-gray-300">{{ character.antecedente }}</p>
                        </div>
                        
                        <!-- Perícias Principais -->
                        <div v-if="character.pericias" class="bg-black/40 p-3 rounded border-l-4 border-green-700">
                            <h4 class="font-cinzel text-green-400 text-xs mb-2 uppercase">Perícias Principais</h4>
                            <div class="flex flex-wrap gap-2">
                                <span v-for="(valor, nome) in character.pericias" :key="nome" v-if="valor >= 5"
                                      class="text-[10px] bg-green-900/30 border border-green-700/50 text-green-300 px-2 py-1 rounded uppercase">
                                    {{ nome }}: +{{ valor }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TALENTOS -->
                <div v-if="character.talentos && character.talentos.length > 0" class="bg-[#151515] border border-orange-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-900 to-transparent"></div>
                    <h3 class="font-cinzel text-orange-600 border-b border-gray-800 pb-2 mb-3 text-sm">⭐ TALENTOS</h3>
                    
                    <div class="space-y-3">
                        <div v-for="(talento, idx) in character.talentos" :key="idx"
                             class="bg-black/40 p-3 rounded border-l-4 border-orange-600">
                            
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-cinzel text-orange-400 text-sm">{{ talento }}</h4>
                            </div>
                            
                            <p class="text-xs text-gray-300 leading-relaxed">
                                {{ getTalentoDescricao(talento) }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- MARCAS DE CAÇADOR -->
                <div v-if="character.marcas_de_cacador && character.marcas_de_cacador.length > 0" class="bg-[#151515] border border-yellow-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-900 to-transparent"></div>
                    <h3 class="font-cinzel text-yellow-600 border-b border-gray-800 pb-2 mb-3 text-sm">🏹 MARCAS DE CAÇADOR</h3>
                    
                    <div class="space-y-3">
                        <div v-for="(marca, idx) in character.marcas_de_cacador" :key="idx"
                             class="bg-black/40 p-3 rounded border-l-4"
                             :class="(character.marcas_desbloqueadas?.[marca.id]) ? 'border-yellow-600 bg-yellow-900/20' : 'border-gray-700 bg-gray-900/20 opacity-60'">
                            
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-cinzel text-sm"
                                    :class="(character.marcas_desbloqueadas?.[marca.id]) ? 'text-yellow-400' : 'text-gray-500'">
                                    {{ marca.nome }}
                                </h4>
                                <span v-if="(character.marcas_desbloqueadas?.[marca.id])" class="text-[10px] px-2 py-1 rounded bg-green-900/50 text-green-300">
                                    ✅ Liberada
                                </span>
                                <span v-else class="text-[10px] px-2 py-1 rounded bg-gray-900/50 text-gray-400">
                                    🔒 Bloqueada
                                </span>
                            </div>
                            
                            <p class="text-xs leading-relaxed"
                               :class="(character.marcas_desbloqueadas?.[marca.id]) ? 'text-gray-300' : 'text-gray-500'">
                                {{ marca.descricao }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- HABILIDADES E MAGIAS -->
                <div v-if="character.habilidades && character.habilidades.length > 0" class="bg-[#151515] border border-amber-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-900 to-transparent"></div>
                    <h3 class="font-cinzel text-amber-600 border-b border-gray-800 pb-2 mb-3 text-sm">⚡ HABILIDADES E MAGIAS</h3>
                    
                    <div class="space-y-3">
                        <div v-for="(hab, idx) in character.habilidades" :key="idx"
                             class="bg-black/40 p-3 rounded border-l-4"
                             :class="hab.nivel <= (character.nivel || 1) ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700 bg-gray-900/20 opacity-60'">
                            
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-cinzel text-sm"
                                    :class="hab.nivel <= (character.nivel || 1) ? 'text-amber-400' : 'text-gray-500'">
                                    {{ hab.nome }}
                                </h4>
                                <span class="text-[10px] px-2 py-1 rounded"
                                      :class="hab.nivel <= (character.nivel || 1) ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-900/50 text-gray-400'">
                                    Nível {{ hab.nivel }}
                                </span>
                            </div>
                            
                            <p class="text-xs leading-relaxed"
                               :class="hab.nivel <= (character.nivel || 1) ? 'text-gray-300' : 'text-gray-500'">
                                {{ hab.descricao }}
                            </p>
                            
                            <div v-if="hab.nivel > (character.nivel || 1)" class="mt-2 text-[10px] text-red-400 italic">
                                🔒 Desbloqueará no nível {{ hab.nivel }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- GUIA DE MECÂNICAS -->
                <div class="bg-[#151515] border border-purple-900 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-900 to-transparent"></div>
                    <h3 class="font-cinzel text-purple-700 border-b border-gray-800 pb-2 mb-3 text-sm">📖 GUIA DE MECÂNICAS DE COMBATE</h3>
                    
                    <div class="space-y-3 text-[10px] text-gray-400">
                        <div class="bg-black/40 p-2 rounded border-l-2 border-red-700">
                            <strong class="text-red-400">🩸 SANGUE (Gasto = +1 Frenesi)</strong>
                            <p class="mt-1"><strong>Cura Rápida:</strong> 1 Sangue → 1d6 + CON HP (ação bônus)</p>
                            <p><strong>Impulso Violento:</strong> 1 Sangue → +1d4 no próximo ataque</p>
                            <p><strong>Resistir Horror:</strong> 1 Sangue → Vantagem contra medo/controle</p>
                        </div>

                        <div class="bg-black/40 p-2 rounded border-l-2 border-amber-700">
                            <strong class="text-amber-400">⚔ PARRY (Reação)</strong>
                            <p class="mt-1"><strong>Sucesso:</strong> Inimigo atordoado → Seu próximo ataque é crítico</p>
                            <p><strong>Falha:</strong> Ataque com vantagem contra você + Ganha +2 Frenesi</p>
                        </div>

                        <div class="bg-black/40 p-2 rounded border-l-2 border-green-700">
                            <strong class="text-green-400">💪 REGAIN (Defesa Agressiva)</strong>
                            <p class="mt-1"><strong>Marcial:</strong> Recupera 50% do dano sofrido</p>
                            <p><strong>Misto:</strong> Recupera 25% do dano sofrido</p>
                            <p><strong>Conjurador:</strong> Recupera 1d4 + CON HP</p>
                            <p class="text-yellow-400 mt-1">⚡ Deve acertar o mesmo inimigo até fim do próx. turno</p>
                        </div>

                        <div class="bg-black/40 p-2 rounded border-l-2 border-purple-700">
                            <strong class="text-purple-400">👹 FRENESI - Efeitos por Nível</strong>
                            <p class="mt-1 text-green-400"><strong>0–3:</strong> Controle total, sem efeitos</p>
                            <p class="text-yellow-400"><strong>4–7:</strong> Vantagem em ataques | Desvantagem em testes mentais</p>
                            <p class="text-red-400"><strong>8–10:</strong> +1d6 dano corpo a corpo | Deve atacar mais próximo</p>
                            <p class="text-gray-500 mt-1">Descanso curto (CD 14) -3 | Descanso longo = 0</p>
                        </div>
                    </div>
                </div>

                <!-- DOSSIER -->
                <div class="bg-[#151515] border border-gray-800 p-4 relative">
                    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <h3 class="font-cinzel text-gray-500 border-b border-gray-800 pb-2 mb-3 text-sm">DOSSIER</h3>
                    
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="bg-black/40 border border-white/10 p-2 rounded">
                            <span class="text-[10px] text-gray-500 uppercase block mb-1">Origem</span>
                            <span class="text-sm">{{ origemExibida }}</span>
                        </div>
                        <div class="bg-black/40 border border-white/10 p-2 rounded">
                            <span class="text-[10px] text-gray-500 uppercase block mb-1">Antecedente</span>
                            <span class="text-sm">{{ antecedenteExibido }}</span>
                        </div>
                    </div>

                    <div v-if="backgroundFeatureExibida" class="bg-black/40 border border-blue-900/30 p-3 rounded mb-3">
                        <h4 class="text-[10px] text-blue-400 uppercase mb-2">📜 Feature do Antecedente</h4>
                        <p class="text-sm text-gray-300 leading-relaxed">{{ backgroundFeatureExibida }}</p>
                    </div>

                    <div v-if="character.personalidade" class="bg-black/40 border border-white/10 p-3 rounded mb-3">
                        <h4 class="text-[10px] text-gray-500 uppercase mb-2">Personalidade</h4>
                        <p class="text-sm text-gray-300 italic leading-relaxed">{{ character.personalidade }}</p>
                    </div>


                </div>
            </div>

        </div>

        <!-- NAVEGAÇÃO INFERIOR FIXA -->
        <nav class="fixed bottom-0 left-0 right-0 h-16 bg-[#0f0f0f] border-t border-amber-700 flex justify-around items-center z-40">
            <div @click="switchTab('status')" 
                 class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer transition-all"
                 :class="activeTab === 'status' ? 'text-red-700 bg-gradient-to-b from-[#220000]/50 to-transparent' : 'text-gray-600'">
                <span class="text-xl mb-1">☤</span>
                <span class="text-[10px] font-cinzel uppercase">Status</span>
            </div>
            
            <div @click="switchTab('combate')" 
                 class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer transition-all"
                 :class="activeTab === 'combate' ? 'text-red-700 bg-gradient-to-b from-[#220000]/50 to-transparent' : 'text-gray-600'">
                <span class="text-xl mb-1">⚔</span>
                <span class="text-[10px] font-cinzel uppercase">Caça</span>
            </div>
            
            <div @click="switchTab('inventario')" 
                 class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer transition-all"
                 :class="activeTab === 'inventario' ? 'text-red-700 bg-gradient-to-b from-[#220000]/50 to-transparent' : 'text-gray-600'">
                <span class="text-xl mb-1">🎒</span>
                <span class="text-[10px] font-cinzel uppercase">Itens</span>
            </div>
            
            <div @click="switchTab('notas')" 
                 class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer transition-all"
                 :class="activeTab === 'notas' ? 'text-red-700 bg-gradient-to-b from-[#220000]/50 to-transparent' : 'text-gray-600'">
                <span class="text-xl mb-1">📜</span>
                <span class="text-[10px] font-cinzel uppercase">Notas</span>
            </div>
        </nav>

        <InitiativeTracker v-if="combatState.ativo" :combat-state="combatState" :character-name="character.nome" :character-id="charId" />
    </div>

    <!-- Loading State -->
    <div v-else class="fixed inset-0 min-h-screen flex items-center justify-center bg-black z-50">
        <div class="text-center">
            <div class="w-12 h-12 border-t-2 border-red-700 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-400 font-serif italic">Entrando no Sonho...</p>
        </div>
    </div>
</template>

<style scoped>
.animate-fadeIn {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.text-shadow {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}
</style>
