<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
    subscribeToCharacter, 
    updateCharacterData, 
    subscribeToCombat, 
    subscribeToSessionCombat,
    subscribeToSessionCharacters,
    updateSessionCharacter 
} from '../services/firebase';
import InitiativeTracker from '../components/InitiativeTracker.vue';
import HunterArchive from '../components/HunterArchive.vue';

const route = useRoute();
const router = useRouter();
const charId = route.params.id;
const userId = ref(localStorage.getItem('userId') || '');
const isMaster = computed(() => {
    return userId.value.startsWith('mestre_');
});

const character = ref(null);
const carregando = ref(true);
const erroCarregamento = ref(false);
const combatState = ref({ ativo: false, ordem: [], turnoAtual: 0 });
const activeTab = ref('status');

// Modais e gavetas
const mostrarModalSangue = ref(false);
const mostrarModalHP = ref(false);
const showArchive = ref(false);
const valorDanoCuraCustom = ref(null);

// Toast de rolagem de dados
const toastRolagem = ref({ visivel: false, texto: '', critico: false, falha: false });
let toastTimer = null;
const mostrarToast = (texto, critico = false, falha = false) => {
    toastRolagem.value = { visivel: true, texto, critico, falha };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastRolagem.value.visivel = false;
    }, 4000);
};

const isSession = charId.includes('_');
const sessionId = isSession ? charId.split('_')[0] : null;

let unsubscribeChar = null;
let unsubscribeCombat = null;

const hpPercentage = computed(() => {
    if (!character.value || !character.value.hp_max) return 0;
    return Math.max(0, Math.min(100, (character.value.hp_atual / character.value.hp_max) * 100));
});

const isGunslinger = computed(() => character.value?.classe === 'Gunslinger');
const isAlchemist = computed(() => character.value?.classe === 'Alchemist');
const isBloodCursed = computed(() => character.value?.classe === 'BloodCursed');
const isGuerreiroRessonante = computed(() => character.value?.classe === 'GuerreirRessonante');
const isGunbreaker = computed(() => character.value?.classe === 'Gunbreaker');

const armadurasEquipadas = computed(() => {
    if (!character.value?.equipamentos) return [];
    return character.value.equipamentos.filter((equip) => {
        const tipo = (equip.tipo || '').toLowerCase();
        return Boolean(equip.ca) || tipo.includes('armadura');
    });
});

const armasEquipadas = computed(() => {
    if (!character.value?.equipamentos) return [];
    return character.value.equipamentos.filter((equip) => {
        const tipo = (equip.tipo || '').toLowerCase();
        return !equip.ca && !tipo.includes('armadura');
    });
});

const armaduraExibida = computed(() => {
    if (!character.value) return 'Nenhuma';
    if (character.value.armadura) return character.value.armadura;
    if (armadurasEquipadas.value.length > 0) {
        return armadurasEquipadas.value.map((equip) => equip.nome).join(', ');
    }
    return 'Nenhuma';
});

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

const antecedentes = {
    'Forasteiro': 'Um caçador de fora de Yharnam. Você chegou atraído pelos boatos de sangue e bestas. Peculiar em costumes, a perspectiva de fora é sua maior força.',
    'Servo da Igreja': 'Devotado aos ensinamentos da Igreja da Cura, você conhece seus rituais e mistérios. Acesso a áreas restritas e confiança de seu povo.',
    'Sobrevivente da Praga': 'Você viu a transformação bestial de perto. Imunidade natural ou pura sorte... sobreviveu onde outros pereceram.',
    'Veterano da Caçada': 'Você caçava bestas bem antes da epidemia virar pesadelo. Experiência de sangue e conexões com velhos caçadores.',
    'Aprendiz da Oficina': 'Treinado na arte de forjar e modificar armas de truque e pólvora. Pode reparar equipamento em descansos.'
};

const getAntecedentDescricao = (antecedente) => {
    return antecedentes[antecedente] || 'Descrição não disponível para este antecedente.';
};

const talentoDescricoes = {
    'Atirador Especial': 'Seus tiros são mais precisos e causam dano adicional crítico em 19-20.',
    'Atirador de Elite': 'Você pode escolher -5 no acerto para ganhar +10 de dano (Sharpshooter). Ignora cobertura parcial.',
    'Curandeiro': 'Kit de Cura estabiliza E cura 1d6+4. Você economiza poções com essa perícia.',
    'Duradouro': '+2 HP por nível. Vital para compensar auto-dano do Blood Cursed (+10 HP no nível 5 = 80 HP).',
    'Sentinela': 'Ataque de oportunidade reduz deslocamento do inimigo a 0. Reação para atacar quem bater em aliado adjacente.',
    'Mestre de Armas Grandes': 'Especialista em armas pesadas. Ataque extra com Ação Bônus ao matar ou acertar crítico. -5 acerto para +10 de dano.'
};

const getTalentoDescricao = (talento) => {
    return talentoDescricoes[talento] || 'Descrição não disponível para este talento.';
};

// Atualização de dados centralizada
const salvarAlteracoes = (alteracoes) => {
    character.value = { ...character.value, ...alteracoes };
    if (isSession && sessionId) {
        updateSessionCharacter(sessionId, charId, alteracoes);
    } else {
        updateCharacterData(charId, alteracoes);
    }
};

onMounted(() => {
    userId.value = localStorage.getItem('userId') || '';
    
    // Timeout para não ficar no loading infinito
    const timeout = setTimeout(() => {
        if (!character.value) {
            carregando.value = false;
            erroCarregamento.value = true;
        }
    }, 4000);

    if (isSession && sessionId) {
        unsubscribeChar = subscribeToSessionCharacters(sessionId, (chars) => {
            if (chars && chars[charId]) {
                character.value = chars[charId];
                carregando.value = false;
                erroCarregamento.value = false;
                clearTimeout(timeout);
            }
        });
        unsubscribeCombat = subscribeToSessionCombat(sessionId, (combat) => {
            combatState.value = combat || { ativo: false, ordem: [], turnoAtual: 0 };
        });
    } else {
        unsubscribeChar = subscribeToCharacter(charId, (data) => {
            if (data) {
                character.value = data;
                carregando.value = false;
                erroCarregamento.value = false;
                clearTimeout(timeout);
            }
        });
        unsubscribeCombat = subscribeToCombat((combat) => {
            combatState.value = combat || { ativo: false, ordem: [], turnoAtual: 0 };
        });
    }
});

onBeforeUnmount(() => {
    if (unsubscribeChar) unsubscribeChar();
    if (unsubscribeCombat) unsubscribeCombat();
    if (toastTimer) clearTimeout(toastTimer);
});

// --- ROLAGENS DE DADOS ---
const rolarAtributo = (attrNome, valor) => {
    const mod = Math.floor(((valor || 10) - 10) / 2);
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    mostrarToast(`Teste de ${attrNome.toUpperCase()}: 1d20 (${d20}) ${mod >= 0 ? '+' : ''}${mod} = ${total}`, d20 === 20, d20 === 1);
};

const rolarPericia = (periciaNome, bonus) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + (bonus || 0);
    mostrarToast(`Perícia ${periciaNome.toUpperCase()}: 1d20 (${d20}) ${(bonus || 0) >= 0 ? '+' : ''}${bonus || 0} = ${total}`, d20 === 20, d20 === 1);
};

const rolarArma = (arma) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const bonusAtaque = character.value?.bonus_prof || 3;
    const modAtq = Math.floor(((character.value?.destreza || 14) - 10) / 2);
    const acertoTotal = d20 + bonusAtaque + modAtq;
    mostrarToast(`⚔ Ataque com ${arma.nome}: 1d20 (${d20}) + Bônus (${bonusAtaque + modAtq}) = ${acertoTotal} | Dano: ${arma.dano}`, d20 === 20, d20 === 1);
};

// --- CONTROLE DE HP E FRASCOS ---
const alterarHP = (delta) => {
    if (!character.value) return;
    const novoHP = Math.max(0, Math.min(character.value.hp_max || 50, (character.value.hp_atual || 0) + delta));
    salvarAlteracoes({ hp_atual: novoHP });
    mostrarToast(`${delta < 0 ? '💥 Dano Sofrido' : '✨ Cura'}: HP ${character.value.hp_atual} → ${novoHP}`);
};

const aplicarDanoCuraCustom = (isCura = false) => {
    const val = Number(valorDanoCuraCustom.value);
    if (!val || val <= 0) return;
    alterarHP(isCura ? val : -val);
    valorDanoCuraCustom.value = null;
    mostrarModalHP.value = false;
};

const tomarFrascoSangue = () => {
    if (!character.value || (character.value.frascos || 0) <= 0) {
        alert('❌ Você não possui Frascos de Sangue!');
        return;
    }
    const novosFrascos = Math.max(0, (character.value.frascos || 0) - 1);
    const con = Math.floor(((character.value.constituicao || 10) - 10) / 2);
    const dado = Math.floor(Math.random() * 6) + 1;
    const cura = dado + con;
    const novoHP = Math.min(character.value.hp_max, (character.value.hp_atual || 0) + cura);
    
    salvarAlteracoes({
        frascos: novosFrascos,
        hp_atual: novoHP
    });
    mostrarToast(`🩸 Frasco de Sangue consumido! Curou ${cura} PV (1d6 [${dado}] + CON [${con}]) | Frascos restantes: ${novosFrascos}`);
    mostrarModalHP.value = false;
};

// --- GASTAR SANGUE ---
const gastarSangue = (uso) => {
    if (!character.value || (character.value.sangue ?? 3) <= 0) {
        mostrarToast('❌ Sem Sangue disponível!', false, true);
        return;
    }

    const novoSangue = (character.value.sangue ?? 3) - 1;
    const hpAntes = character.value.hp_atual;
    
    // BUGFIX: gastar sangue NÃO consome frascos - são recursos separados!
    let atualizacoes = { sangue: novoSangue };
    
    if (uso === 'cura') {
        const con = Math.floor(((character.value.constituicao || 10) - 10) / 2);
        const dado = Math.floor(Math.random() * 6) + 1;
        const cura = Math.max(1, dado + con);
        const novoHP = Math.min(character.value.hp_max, hpAntes + cura);
        atualizacoes.hp_atual = novoHP;
        atualizacoes.frenesi = Math.min(10, (character.value.frenesi || 0) + 1);
        mostrarToast(`🩸 Cura Rápida: Curou ${cura} PV (1d6[${dado}]+CON[${con}]) • +1 Frenesi`);
    } else if (uso === 'impulso') {
        atualizacoes.frenesi = Math.min(10, (character.value.frenesi || 0) + 1);
        atualizacoes.impulso_violento_ativo = true;
        mostrarToast(`⚡ Impulso Violento Ativado: +1d4 no próximo ataque • +1 Frenesi`);
    } else if (uso === 'horror') {
        atualizacoes.frenesi = Math.min(10, (character.value.frenesi || 0) + 1);
        atualizacoes.resistencia_horror_ativa = true;
        mostrarToast(`🛡️ Resistir ao Horror Ativado: Vantagem contra medo • +1 Frenesi`);
    }

    salvarAlteracoes(atualizacoes);
    mostrarModalSangue.value = false;
};

// --- MECÂNICAS DE COMBATE BLOODBORNE ---
const executarParry = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const modDes = Math.floor(((character.value?.destreza || 14) - 10) / 2);
    const resultado = d20 + modDes;
    if (resultado >= 13) {
        mostrarToast(`🎯 PARRY BEM-SUCEDIDO! (1d20 [${d20}] + ${modDes} = ${resultado}) → O alvo está ATORDUADO! Próximo ataque é Visceral (Crítico)!`, true);
    } else {
        const novoFrenesi = Math.min(10, (character.value?.frenesi || 0) + 2);
        salvarAlteracoes({ frenesi: novoFrenesi });
        mostrarToast(`❌ FALHA NO PARRY! (1d20 [${d20}] + ${modDes} = ${resultado}) → Inimigo tem vantagem e você ganha +2 Frenesi!`, false, true);
    }
};

const executarRegain = () => {
    const con = Math.floor(((character.value?.constituicao || 10) - 10) / 2);
    const d8 = Math.floor(Math.random() * 8) + 1;
    const curaRegain = d8 + Math.max(0, con);
    const novoHP = Math.min(character.value?.hp_max || 50, (character.value?.hp_atual || 0) + curaRegain);
    salvarAlteracoes({ hp_atual: novoHP });
    mostrarToast(`💪 REGAIN EXECUTADO! Revidou e recuperou ${curaRegain} PV! (1d8 [${d8}] + CON [${con}])`);
};

// --- RECURSOS ESPECÍFICOS DE CLASSE ---
// Gunslinger
const usarGrit = (custo = 1, efeito = 'Tiro Especial') => {
    if ((character.value?.grit_atual || 0) < custo) {
        alert('❌ Pontos de Grit insuficientes!');
        return;
    }
    const novoGrit = (character.value?.grit_atual || 0) - custo;
    salvarAlteracoes({ grit_atual: novoGrit });
    mostrarToast(`🎯 ${efeito} executado! (-${custo} Grit)`);
};

const recuperarGrit = () => {
    const max = character.value?.grit_max || 2;
    const novoGrit = Math.min(max, (character.value?.grit_atual || 0) + 1);
    salvarAlteracoes({ grit_atual: novoGrit });
    mostrarToast(`🎯 +1 Ponto de Grit recuperado! (${novoGrit}/${max})`);
};

const gastarMunicao = () => {
    if ((character.value?.municao || 0) <= 0) {
        alert('❌ Sem balas de mercúrio!');
        return;
    }
    const novaMunicao = (character.value?.municao || 0) - 1;
    salvarAlteracoes({ municao: novaMunicao });
    mostrarToast(`🔫 Disparo realizado! Balas restantes: ${novaMunicao}`);
};

const recarregarMunicao = () => {
    const novaMunicao = (character.value?.municao || 0) + 10;
    salvarAlteracoes({ municao: novaMunicao });
    mostrarToast(`🔧 Balas forjadas/recarregadas! Total: ${novaMunicao}`);
};

// Alchemist
const arremessarBomba = (tipo = 'Fogo') => {
    if ((character.value?.bombas_restantes || 0) <= 0) {
        alert('❌ Sem bombas restantes para arremessar!');
        return;
    }
    const novasBombas = (character.value?.bombas_restantes || 0) - 1;
    const d8_1 = Math.floor(Math.random() * 8) + 1;
    const d8_2 = Math.floor(Math.random() * 8) + 1;
    const modInt = Math.floor(((character.value?.inteligencia || 16) - 10) / 2);
    const dano = d8_1 + d8_2 + modInt;
    salvarAlteracoes({ bombas_restantes: novasBombas });
    mostrarToast(`💣 Bomba de ${tipo} arremessada! Dano: 2d8 (${d8_1}+${d8_2}) + INT (${modInt}) = ${dano} de dano! (${novasBombas} restantes)`);
};

// Blood Cursed
const ativarRitoCarmesim = () => {
    if ((character.value?.hp_atual || 0) <= 5) {
        alert('❌ Vida muito baixa para ativar o Rito Carmesim!');
        return;
    }
    const novoHP = (character.value?.hp_atual || 0) - 5;
    salvarAlteracoes({ hp_atual: novoHP, rito_carmesim_ativo: true });
    mostrarToast(`🩸 Rito Carmesim Ativado! Sofreu 5 de dano. Sua arma causa +1d6 extra necrótico em todos os golpes!`);
};

const rolarDadoSangue = () => {
    const d6 = Math.floor(Math.random() * 6) + 1;
    mostrarToast(`🩸 Dado de Sangue: 1d6 = ${d6} de dano bônus!`);
};

// Guerreiro Ressonante
const gastarRessonancia = (acao) => {
    if ((character.value?.ressonancia_atual || 0) <= 0) {
        alert('❌ Pontos de Ressonância (PR) esgotados!');
        return;
    }
    const novoPR = (character.value?.ressonancia_atual || 0) - 1;
    salvarAlteracoes({ ressonancia_atual: novoPR });
    if (acao === 'rally') {
        const d8 = Math.floor(Math.random() * 8) + 1;
        mostrarToast(`⚔ Sincronia de Alma! +1d8 (${d8}) de dano e você cura igual ao dano se foi ferido! (PR restante: ${novoPR})`);
    } else {
        mostrarToast(`🛡️ Expansão Espiritual ativada! +1 CA e resistência física por 1 min! (PR restante: ${novoPR})`);
    }
};

// Gunbreaker
const gastarCartucho = () => {
    if ((character.value?.cartuchos_atual || 0) <= 0) {
        alert('❌ Sem cartuchos de pólvora disponíveis!');
        return;
    }
    const novosCartuchos = (character.value?.cartuchos_atual || 0) - 1;
    const d8_1 = Math.floor(Math.random() * 8) + 1;
    const d8_2 = Math.floor(Math.random() * 8) + 1;
    salvarAlteracoes({ cartuchos_atual: novosCartuchos });
    mostrarToast(`💥 Quebra-Cartucho! Golpe explosivo causa +2d8 (${d8_1}+${d8_2} = ${d8_1+d8_2}) de dano de fogo! (Cartuchos: ${novosCartuchos})`);
};

const switchTab = (tab) => {
    activeTab.value = tab;
};

// Habilidades da classe para exibir na aba
const habilidadesExibidas = computed(() => {
    if (!character.value) return [];
    if (character.value.habilidades && character.value.habilidades.length > 0)
        return character.value.habilidades;
    return [];
});

const marcasDeCacador = computed(() => {
    if (!character.value) return [];
    return character.value.marcas_de_cacador || [];
});

const marcasDesbloqueadas = computed(() => {
    return character.value?.marcas_desbloqueadas || {};
});
</script>

<template>
    <div v-if="character" class="min-h-screen bg-gradient-to-b from-[#1f0505] to-[#0d0d0d] text-gray-300 font-sans pb-24">
        
        <!-- TOAST FLUTUANTE DE ROLAGEM DE DADOS -->
        <transition name="toast-slide">
            <div v-if="toastRolagem.visivel" 
                 class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-2xl border text-sm font-cinzel tracking-wider flex items-center gap-3 max-w-[90vw]"
                 :class="toastRolagem.critico ? 'bg-amber-950/98 border-amber-400 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.5)]' : toastRolagem.falha ? 'bg-red-950/98 border-red-500 text-red-200 shadow-[0_0_25px_rgba(220,38,38,0.4)]' : 'bg-zinc-900/98 border-amber-700/60 text-white'">
                <span class="text-xl flex-shrink-0">{{ toastRolagem.critico ? '★' : toastRolagem.falha ? '☠' : '🎲' }}</span>
                <span class="text-xs sm:text-sm leading-tight">{{ toastRolagem.texto }}</span>
                <button @click="toastRolagem.visivel = false" class="text-gray-400 hover:text-white ml-2 text-xs flex-shrink-0">✕</button>
            </div>
        </transition>

        <!-- HEADER FIXO -->
        <header class="bg-gradient-to-b from-[#1a0505] to-[#0d0d0d] border-b-2 border-red-900/80 p-3 sm:p-4 sticky top-0 z-30 backdrop-blur-md">
            <div class="flex justify-between items-center max-w-4xl mx-auto">
                <router-link to="/" class="text-xs text-gray-500 hover:text-amber-400 font-cinzel transition-colors flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                    <span>Sair</span>
                </router-link>

                <div class="text-center">
                    <h1 class="font-cinzel text-amber-500 text-xl sm:text-2xl tracking-[0.2em] uppercase text-shadow">
                        {{ character.nome }}
                    </h1>
                    <div class="flex justify-center items-center gap-2 text-gray-400 text-xs italic mt-0.5">
                        <span class="text-red-400 font-cinzel">{{ character.classe || 'Caçador' }}</span>
                        <span>•</span>
                        <span>Nível {{ character.nivel || character.level || 5 }}</span>
                        <span v-if="isMaster" class="text-amber-400 font-bold">• 👑 MESTRE</span>
                    </div>
                </div>

                <button @click="showArchive = true" 
                        class="text-xs px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 rounded text-amber-300 font-cinzel transition-all flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-outlined text-sm">menu_book</span>
                    <span class="hidden sm:inline">Arquivo</span>
                </button>
            </div>
        </header>

        <!-- HUD DE STATUS FIXO (HP & ATRIBUTOS PRINCIPAIS) -->
        <div class="bg-[#141414] p-3 sm:p-4 border-b border-gray-800 sticky top-[72px] sm:top-[80px] z-20 backdrop-blur-md max-w-4xl mx-auto rounded-b-lg shadow-lg">
            <!-- Barra de Vida com clique para alterar -->
            <div class="space-y-1 mb-3">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-400 font-cinzel">Pontos de Vida (PV)</span>
                    <button @click="mostrarModalHP = true" class="text-amber-400 hover:text-amber-300 font-mono text-[11px] underline">
                        Ajustar / Curar
                    </button>
                </div>
                <div @click="mostrarModalHP = true" 
                     class="relative bg-zinc-900 h-6 rounded border border-red-950 overflow-hidden cursor-pointer hover:border-red-700 transition-all">
                    <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-300"
                         :style="{ width: hpPercentage + '%', boxShadow: '0 0 10px rgba(185, 28, 28, 0.8)' }">
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white text-shadow z-10 font-mono">
                        {{ character.hp_atual || 0 }} / {{ character.hp_max || 0 }} PV ({{ Math.round(hpPercentage) }}%)
                    </div>
                </div>
            </div>

            <!-- Stats Principais em Círculos -->
            <div class="flex justify-around items-center pt-1">
                <div class="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-700/80 bg-black/40">
                    <span class="text-xl sm:text-2xl font-cinzel font-bold text-amber-500">{{ character.ca || 10 }}</span>
                    <span class="text-[9px] text-gray-400 uppercase font-cinzel">CA</span>
                </div>

                <div class="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-700/80 bg-black/40">
                    <span class="text-lg sm:text-xl font-cinzel font-bold text-amber-500">{{ (character.iniciativa || 0) >= 0 ? '+' : '' }}{{ character.iniciativa || 0 }}</span>
                    <span class="text-[9px] text-gray-400 uppercase font-cinzel">Inic.</span>
                </div>

                <div class="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-700/80 bg-black/40">
                    <span class="text-lg sm:text-xl font-cinzel font-bold text-amber-500">{{ character.deslocamento || 9 }}m</span>
                    <span class="text-[9px] text-gray-400 uppercase font-cinzel">Desl.</span>
                </div>

                <div class="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-red-700/80 bg-black/40">
                    <span class="text-lg sm:text-xl font-cinzel font-bold text-red-400">+{{ character.bonus_prof || 3 }}</span>
                    <span class="text-[9px] text-gray-400 uppercase font-cinzel">Prof.</span>
                </div>
            </div>
        </div>

        <!-- CONTEÚDO DAS ABAS -->
        <main class="max-w-4xl mx-auto p-4">

            <!-- ABA 1: STATUS -->
            <div v-show="activeTab === 'status'" class="space-y-4 animate-fadeIn">
                <!-- Grid de Atributos 3x2 (Clicáveis para rolar dado) -->
                <div>
                    <p class="text-[11px] font-cinzel text-gray-400 mb-2 uppercase flex items-center justify-between">
                        <span>Atributos (Clique para Rolar d20 + Mod)</span>
                        <span class="text-amber-500 text-[10px]">🎲 Rolagem Rápida</span>
                    </p>
                    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                        <div v-for="attr in ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma']" :key="attr"
                             @click="rolarAtributo(attr, character[attr])"
                             class="bg-zinc-950 border border-gray-800 hover:border-amber-600 rounded p-2.5 text-center cursor-pointer transition-all transform hover:scale-105 group shadow-md">
                            <div class="text-[10px] text-gray-500 uppercase font-cinzel group-hover:text-amber-400">
                                {{ { forca: 'FOR', destreza: 'DES', constituicao: 'CON', inteligencia: 'INT', sabedoria: 'SAB', carisma: 'CAR' }[attr] }}
                            </div>
                            <div class="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-300 font-cinzel">
                                {{ Math.floor(((character[attr] || 10) - 10) / 2) >= 0 ? '+' : '' }}{{ Math.floor(((character[attr] || 10) - 10) / 2) }}
                            </div>
                            <div class="text-[10px] text-gray-500 font-mono mt-0.5">
                                Base: {{ character[attr] || 10 }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Testes de Resistência -->
                <div class="bg-zinc-950 border border-gray-800 p-4 rounded relative">
                    <h3 class="font-cinzel text-amber-500 border-b border-gray-800 pb-2 mb-3 text-sm flex items-center justify-between">
                        <span>RESISTÊNCIAS</span>
                        <span class="text-[10px] text-gray-500">Clique para rolar</span>
                    </h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div v-for="(valor, nome) in resistenciasExibidas" :key="nome"
                             @click="rolarPericia(`Resistência ${nome}`, valor)"
                             class="flex justify-between items-center p-2 rounded bg-black/40 border border-gray-800/60 hover:border-amber-600/60 cursor-pointer transition-colors">
                            <span class="capitalize text-xs text-gray-300">
                                {{ { forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição', inteligencia: 'Inteligência', sabedoria: 'Sabedoria', carisma: 'Carisma' }[nome] || nome }}
                            </span>
                            <span class="font-mono text-xs font-bold text-amber-500">{{ valor >= 0 ? '+' : '' }}{{ valor }}</span>
                        </div>
                    </div>
                </div>

                <!-- Perícias -->
                <div class="bg-zinc-950 border border-gray-800 p-4 rounded relative">
                    <h3 class="font-cinzel text-amber-500 border-b border-gray-800 pb-2 mb-3 text-sm flex items-center justify-between">
                        <span>PERÍCIAS</span>
                        <span class="text-[10px] text-gray-500">Clique para rolar</span>
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                        <div v-for="(valor, nome) in periciasExibidas" :key="nome"
                             @click="rolarPericia(nome, valor)"
                             class="flex justify-between items-center p-2 rounded bg-black/40 border border-gray-800/60 hover:border-amber-600/60 cursor-pointer transition-colors">
                            <span class="capitalize text-xs text-gray-300">{{ nome }}</span>
                            <span class="font-mono text-xs font-bold text-amber-500">{{ valor >= 0 ? '+' : '' }}{{ valor }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ABA 2: COMBATE (CAÇA) -->
            <div v-show="activeTab === 'combate'" class="space-y-4 animate-fadeIn">
                <!-- RECURSOS ESPECÍFICOS DE CLASSE -->
                <!-- Gunslinger -->
                <div v-if="isGunslinger" class="bg-zinc-950 border border-amber-800/70 p-4 rounded">
                    <h3 class="font-cinzel text-amber-400 text-sm border-b border-gray-800 pb-2 mb-3 flex items-center justify-between">
                        <span>🎯 RECURSOS DO GUNSLINGER</span>
                        <span class="font-mono text-xs text-amber-500">Grit: {{ character.grit_atual || 0 }}/{{ character.grit_max || 2 }}</span>
                    </h3>
                    <div class="flex flex-wrap gap-2 mb-3">
                        <button @click="usarGrit(1, 'Tiro Desarmante')" 
                                class="flex-1 min-w-[130px] p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 rounded text-xs font-cinzel text-amber-200 text-left">
                            <strong>🎯 Tiro Desarmante</strong>
                            <p class="text-[10px] text-gray-400">Gaste 1 Grit (Alvo larga arma)</p>
                        </button>
                        <button @click="usarGrit(1, 'Tiro Perfurante')" 
                                class="flex-1 min-w-[130px] p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 rounded text-xs font-cinzel text-amber-200 text-left">
                            <strong>⚡ Tiro Perfurante</strong>
                            <p class="text-[10px] text-gray-400">Gaste 1 Grit (Ataque em linha)</p>
                        </button>
                        <button @click="recuperarGrit" 
                                class="px-3 py-2 bg-green-950/40 hover:bg-green-900/60 border border-green-700 text-green-300 rounded text-xs font-cinzel">
                            +1 Grit (Crítico/Morte)
                        </button>
                    </div>
                    <div class="flex items-center justify-between bg-black/50 p-2 rounded text-xs">
                        <span class="text-gray-400">Munição de Mercúrio: <strong class="text-blue-400 font-mono text-sm">{{ character.municao || 0 }}</strong> balas</span>
                        <div class="flex gap-2">
                            <button @click="gastarMunicao" class="px-2 py-1 bg-blue-950/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-xs">-1 Bala</button>
                            <button @click="recarregarMunicao" class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded text-xs">+10 Balas (Armeiro)</button>
                        </div>
                    </div>
                </div>

                <!-- Alchemist -->
                <div v-if="isAlchemist" class="bg-zinc-950 border border-red-800/70 p-4 rounded">
                    <h3 class="font-cinzel text-red-400 text-sm border-b border-gray-800 pb-2 mb-3 flex items-center justify-between">
                        <span>🧪 RECURSOS DO ALQUIMISTA</span>
                        <span class="font-mono text-xs text-red-400">Bombas: {{ character.bombas_restantes || 0 }}/5</span>
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        <button @click="arremessarBomba('Fogo')" class="flex-1 p-2 bg-red-950/40 hover:bg-red-900/60 border border-red-700 rounded text-xs font-cinzel text-red-200 text-left">
                            <strong>🔥 Bomba Incendiária</strong>
                            <p class="text-[10px] text-gray-400">2d8 + INT (9m de área)</p>
                        </button>
                        <button @click="arremessarBomba('Ácido')" class="flex-1 p-2 bg-green-950/40 hover:bg-green-900/60 border border-green-700 rounded text-xs font-cinzel text-green-200 text-left">
                            <strong>🧪 Bomba Ácida</strong>
                            <p class="text-[10px] text-gray-400">2d8 + INT (Corrosão)</p>
                        </button>
                    </div>
                </div>

                <!-- Blood Cursed -->
                <div v-if="isBloodCursed" class="bg-zinc-950 border border-red-800/70 p-4 rounded">
                    <h3 class="font-cinzel text-red-400 text-sm border-b border-gray-800 pb-2 mb-3">
                        🔴 PODER SANGUÍNEO & MALDIÇÕES
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        <button @click="ativarRitoCarmesim" class="flex-1 p-2 bg-red-950/60 hover:bg-red-900 border border-red-600 rounded text-xs font-cinzel text-red-200 text-left">
                            <strong>🩸 Rito Carmesim</strong>
                            <p class="text-[10px] text-gray-300">Gaste 5 HP → +1d6 dano necrótico</p>
                        </button>
                        <button @click="rolarDadoSangue" class="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-gray-700 text-red-300 rounded text-xs font-cinzel">
                            🎲 Rolar Dado Sangue (1d6)
                        </button>
                    </div>
                </div>

                <!-- Guerreiro Ressonante -->
                <div v-if="isGuerreiroRessonante" class="bg-zinc-950 border border-purple-800/70 p-4 rounded">
                    <h3 class="font-cinzel text-purple-400 text-sm border-b border-gray-800 pb-2 mb-3 flex items-center justify-between">
                        <span>⚔️ RESSONÂNCIA DA ALMA</span>
                        <span class="font-mono text-xs text-purple-400">PR: {{ character.ressonancia_atual || 0 }}/{{ character.ressonancia_max || 8 }}</span>
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        <button @click="gastarRessonancia('rally')" class="flex-1 p-2 bg-purple-950/40 hover:bg-purple-900 border border-purple-700 rounded text-xs font-cinzel text-purple-200 text-left">
                            <strong>🎵 Sincronia de Alma (Rally)</strong>
                            <p class="text-[10px] text-gray-400">-1 PR: +1d8 dano e cura se sofreu golpe</p>
                        </button>
                        <button @click="gastarRessonancia('expansao')" class="flex-1 p-2 bg-purple-950/40 hover:bg-purple-900 border border-purple-700 rounded text-xs font-cinzel text-purple-200 text-left">
                            <strong>🛡️ Expansão Espiritual</strong>
                            <p class="text-[10px] text-gray-400">-1 PR: +1 CA e resistência física</p>
                        </button>
                    </div>
                </div>

                <!-- Gunbreaker -->
                <div v-if="isGunbreaker" class="bg-zinc-950 border border-yellow-800/70 p-4 rounded">
                    <h3 class="font-cinzel text-yellow-400 text-sm border-b border-gray-800 pb-2 mb-3 flex items-center justify-between">
                        <span>⚙️ CARTUCHOS DE PÓLVORA</span>
                        <span class="font-mono text-xs text-yellow-400">Slots: {{ character.cartuchos_atual || 0 }}/{{ character.cartuchos_max || 4 }}</span>
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        <button @click="gastarCartucho" class="flex-1 p-2 bg-yellow-950/40 hover:bg-yellow-900 border border-yellow-700 rounded text-xs font-cinzel text-yellow-200 text-left">
                            <strong>💥 Quebra-Cartucho (Smite)</strong>
                            <p class="text-[10px] text-gray-400">-1 Cartucho: +2d8 dano de fogo</p>
                        </button>
                    </div>
                </div>

                <!-- AÇÕES BÁSICAS BLOODBORNE (PARRY & REGAIN) -->
                <div class="bg-zinc-950 border border-gray-800 p-4 rounded">
                    <h3 class="font-cinzel text-amber-500 border-b border-gray-800 pb-2 mb-3 text-sm">
                        ⚔️ AÇÕES ESPECIAIS DE CAÇA
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button @click="executarParry" 
                                class="p-3 bg-gradient-to-r from-amber-950/50 to-black hover:from-amber-900/60 border border-amber-700/60 rounded text-left transition-all">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-cinzel font-bold text-amber-300 text-xs">🛡️ TENTAR PARRY (Reação)</span>
                                <span class="text-[10px] text-gray-500 font-mono">1d20+DES</span>
                            </div>
                            <p class="text-[10px] text-gray-400 leading-tight">
                                Se acertar CD 13, atordoa o inimigo e garante ataque crítico!
                            </p>
                        </button>

                        <button @click="executarRegain" 
                                class="p-3 bg-gradient-to-r from-green-950/50 to-black hover:from-green-900/60 border border-green-700/60 rounded text-left transition-all">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-cinzel font-bold text-green-300 text-xs">💪 REGAIN (Rally)</span>
                                <span class="text-[10px] text-gray-500 font-mono">1d8+CON</span>
                            </div>
                            <p class="text-[10px] text-gray-400 leading-tight">
                                Revide imediatamente para recuperar parte do dano que você sofreu!
                            </p>
                        </button>
                    </div>
                </div>

                <!-- SANGUE -->
                <div class="bg-zinc-950 border border-red-900/70 p-4 rounded">
                    <h3 class="font-cinzel text-red-500 border-b border-gray-800 pb-2 mb-3 text-sm flex items-center justify-between">
                        <span>🩸 SANGUE CORROMPIDO</span>
                        <button @click="mostrarModalSangue = true" 
                                class="px-2.5 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700 rounded text-xs font-cinzel">
                            💧 Gastar Sangue
                        </button>
                    </h3>
                    <div class="flex gap-1.5 mb-2">
                        <div v-for="i in 6" :key="'sangue-' + i"
                             class="flex-1 h-5 rounded border border-red-700 transition-all"
                             :class="i <= (character.sangue ?? 3) ? 'bg-red-700 shadow-[0_0_8px_rgba(185,28,28,0.8)]' : 'bg-black/50'">
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400">Gastar Sangue concede efeitos poderosos mas aumenta seu Frenesi.</p>
                </div>

                <!-- FRENESI -->
                <div class="bg-zinc-950 border border-purple-900/70 p-4 rounded">
                    <h3 class="font-cinzel text-purple-400 border-b border-gray-800 pb-2 mb-3 text-sm flex items-center justify-between">
                        <span>👹 FRENESI (Corrupção da Besta)</span>
                        <span class="font-mono text-sm font-bold text-purple-400">{{ character.frenesi || 0 }}/10</span>
                    </h3>
                    <div class="flex gap-1 mb-2">
                        <div v-for="i in 10" :key="'frenesi-' + i"
                             class="flex-1 h-4 rounded border border-purple-700 transition-all"
                             :class="i <= (character.frenesi || 0) ? 'bg-purple-700 shadow-[0_0_6px_rgba(147,51,234,0.8)]' : 'bg-black/50'">
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400">
                        {{ (character.frenesi || 0) <= 3 ? '🟢 0–3: Controle total' : (character.frenesi || 0) <= 7 ? '🟡 4–7: Fúria Emergente (Vantagem em ataques, desvantagem em mente)' : '🔴 8–10: Besta Interior (+1d6 dano, ataca alvo mais próximo)' }}
                    </p>
                </div>

                <!-- ARMAS & ATAQUES -->
                <div class="bg-zinc-950 border border-gray-800 p-4 rounded">
                    <h3 class="font-cinzel text-amber-500 border-b border-gray-800 pb-2 mb-3 text-sm">
                        ⚔️ ARMAS EQUIPADAS
                    </h3>
                    <div v-if="armasEquipadas.length > 0" class="space-y-2">
                        <div v-for="(equip, idx) in armasEquipadas" :key="idx"
                             class="flex items-center justify-between p-2.5 rounded bg-black/50 border border-gray-800">
                            <div>
                                <span class="font-cinzel font-bold text-white text-sm">{{ equip.nome }}</span>
                                <span class="text-xs text-gray-400 ml-2 font-mono">{{ equip.dano }} • {{ equip.tipo }}</span>
                            </div>
                            <button @click="rolarArma(equip)" 
                                    class="px-3 py-1 bg-amber-900/40 hover:bg-amber-800 border border-amber-700 text-amber-200 rounded text-xs font-cinzel transition-all">
                                🎲 Atacar
                            </button>
                        </div>
                    </div>
                    <div v-else class="text-xs text-gray-500 italic py-2 text-center">Nenhuma arma equipada</div>
                </div>
            </div>

            <!-- ABA 3: INVENTÁRIO -->
            <div v-show="activeTab === 'inventario'" class="space-y-4 animate-fadeIn">
                <div class="bg-zinc-950 border border-gray-800 p-4 rounded flex justify-between items-center">
                    <span class="font-cinzel text-amber-500 text-sm">Ecos de Sangue (Moeda):</span>
                    <span class="font-mono text-xl font-bold text-amber-300">{{ character.ecos || 0 }}</span>
                </div>

                <div class="bg-zinc-950 border border-gray-800 p-4 rounded">
                    <h3 class="font-cinzel text-amber-500 border-b border-gray-800 pb-2 mb-3 text-sm">CONSUMÍVEIS & EQUIPAMENTOS</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center p-2 rounded bg-black/40 border border-gray-800">
                            <div>
                                <span class="font-cinzel text-sm text-gray-200">Frasco de Sangue</span>
                                <p class="text-[10px] text-gray-400">Cura 1d6 + CON de PV</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-sm font-bold text-red-400">x{{ character.frascos || 0 }}</span>
                                <button @click="tomarFrascoSangue" 
                                        :disabled="(character.frascos || 0) <= 0"
                                        class="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 disabled:opacity-40 text-white rounded text-xs font-cinzel">
                                    Usar
                                </button>
                            </div>
                        </div>

                        <div v-if="character.municao !== undefined" class="flex justify-between items-center p-2 rounded bg-black/40 border border-gray-800">
                            <div>
                                <span class="font-cinzel text-sm text-gray-200">Balas de Mercúrio</span>
                                <p class="text-[10px] text-gray-400">Munição para armas de fogo e ferramentas</p>
                            </div>
                            <span class="font-mono text-sm font-bold text-blue-400">x{{ character.municao || 0 }}</span>
                        </div>

                        <div class="flex justify-between items-center p-2 rounded bg-black/40 border border-gray-800">
                            <div>
                                <span class="font-cinzel text-sm text-gray-200">Traje / Armadura</span>
                                <p class="text-[10px] text-gray-400">{{ armaduraExibida }}</p>
                            </div>
                            <span class="font-cinzel text-xs text-amber-400">CA {{ character.ca || 10 }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ABA 4: NOTAS & LORE -->
            <div v-show="activeTab === 'notas'" class="space-y-4 animate-fadeIn">
                <!-- DESCRIÇÃO DA CLASSE -->
                <div class="bg-zinc-950 border border-blue-900/70 p-4 rounded">
                    <h3 class="font-cinzel text-blue-400 border-b border-gray-800 pb-2 mb-3 text-sm">
                        📖 CLASSE: {{ character.classe }}
                    </h3>
                    <p class="text-xs text-gray-300 leading-relaxed mb-3">
                        {{ character.descricao_classe || 'Especialista forjado na longa noite de Yharnam.' }}
                    </p>
                    <div v-if="character.antecedente" class="bg-black/50 p-3 rounded border-l-4 border-blue-600">
                        <h4 class="font-cinzel text-blue-300 text-xs mb-1 uppercase">{{ character.antecedente }}</h4>
                        <p class="text-xs text-gray-400">{{ getAntecedentDescricao(character.antecedente) }}</p>
                    </div>
                </div>

                <!-- TALENTOS -->
                <div v-if="talentosExibidos.length > 0" class="bg-zinc-950 border border-amber-900/70 p-4 rounded">
                    <h3 class="font-cinzel text-amber-500 border-b border-gray-800 pb-2 mb-3 text-sm">⭐ TALENTOS</h3>
                    <div class="space-y-2">
                        <div v-for="(talento, idx) in talentosExibidos" :key="idx" class="p-2.5 rounded bg-black/50 border-l-4 border-amber-600">
                            <h4 class="font-cinzel text-amber-400 text-xs font-bold">{{ talento }}</h4>
                            <p class="text-[11px] text-gray-300 mt-1">{{ getTalentoDescricao(talento) }}</p>
                        </div>
                    </div>
                </div>

                <!-- DOSSIÊ -->
                <div class="bg-zinc-950 border border-gray-800 p-4 rounded">
                    <h3 class="font-cinzel text-gray-400 border-b border-gray-800 pb-2 mb-3 text-sm">DOSSIÊ DO CAÇADOR</h3>
                    <div class="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div class="bg-black/50 p-2 rounded">
                            <span class="text-gray-500 block text-[10px] uppercase font-cinzel">Origem</span>
                            <span class="text-gray-200">{{ origemExibida }}</span>
                        </div>
                        <div class="bg-black/50 p-2 rounded">
                            <span class="text-gray-500 block text-[10px] uppercase font-cinzel">Antecedente</span>
                            <span class="text-gray-200">{{ antecedenteExibido }}</span>
                        </div>
                    </div>
                    <div v-if="backgroundFeatureExibida" class="bg-black/50 p-2.5 rounded border border-blue-900/30 text-xs">
                        <span class="text-blue-400 font-cinzel block text-[10px] uppercase mb-1">📜 Habilidade do Antecedente</span>
                        <p class="text-gray-300">{{ backgroundFeatureExibida }}</p>
                    </div>
                </div>
            </div>

            <!-- ABA 5: HABILIDADES & MARCAS -->
            <div v-show="activeTab === 'habilidades'" class="space-y-4 animate-fadeIn">
                <!-- HABILIDADES DA CLASSE -->
                <div v-if="habilidadesExibidas.length > 0" class="space-y-2">
                    <h2 class="font-cinzel text-amber-500 text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span>⚡</span> Habilidades da Classe
                    </h2>
                    <div v-for="hab in habilidadesExibidas" :key="hab.nome"
                         class="bg-zinc-950 border border-gray-800 rounded p-3 transition-colors hover:border-amber-800/60">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <span class="font-cinzel text-amber-300 text-xs font-bold">{{ hab.nome }}</span>
                            <span class="text-[10px] bg-black/60 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-mono flex-shrink-0">Nvl {{ hab.nivel }}</span>
                        </div>
                        <p class="text-[11px] text-gray-300 leading-relaxed">{{ hab.descricao }}</p>
                    </div>
                </div>
                <div v-else class="bg-zinc-950 border border-gray-800 rounded p-6 text-center">
                    <p class="text-gray-500 text-sm">Nenhuma habilidade encontrada para esta classe.</p>
                </div>

                <!-- MARCAS DE CAÇADOR -->
                <div v-if="marcasDeCacador.length > 0">
                    <h2 class="font-cinzel text-yellow-400 text-sm uppercase tracking-wider flex items-center gap-2 mb-3 mt-4">
                        <span>🏹</span> Marcas de Caçador
                        <span class="text-[10px] text-gray-500 font-sans normal-case ml-1">Desbloqueadas pelo Mestre</span>
                    </h2>
                    <div class="space-y-2">
                        <div v-for="marca in marcasDeCacador" :key="marca.id"
                             class="rounded border p-3 transition-all"
                             :class="marcasDesbloqueadas[marca.id] ? 'bg-yellow-950/30 border-yellow-700/60 shadow-[0_0_12px_rgba(234,179,8,0.15)]' : 'bg-zinc-950 border-gray-800 opacity-60'">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span v-if="marcasDesbloqueadas[marca.id]" class="text-[10px] bg-yellow-900/60 text-yellow-300 border border-yellow-700 px-1.5 py-0.5 rounded font-cinzel">✓ ATIVO</span>
                                        <span v-else class="text-[10px] bg-gray-900/60 text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded font-cinzel">🔒 Bloqueado</span>
                                    </div>
                                    <p class="font-cinzel text-xs font-bold mb-1"
                                       :class="marcasDesbloqueadas[marca.id] ? 'text-yellow-300' : 'text-gray-500'">{{ marca.nome }}</p>
                                    <p class="text-[11px] leading-relaxed"
                                       :class="marcasDesbloqueadas[marca.id] ? 'text-gray-300' : 'text-gray-600'">{{ marca.descricao }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </main>

        <!-- MODAL AJUSTAR / CURAR HP -->
        <div v-if="mostrarModalHP" class="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <div class="bg-zinc-950 border-2 border-red-800 rounded-lg p-6 max-w-sm w-full shadow-2xl animate-fadeIn">
                <h3 class="font-cinzel text-amber-400 text-lg mb-4 text-center">AJUSTAR PONTOS DE VIDA</h3>
                <div class="text-center mb-4">
                    <span class="text-2xl font-bold font-mono text-white">{{ character.hp_atual }}</span>
                    <span class="text-gray-500 font-mono"> / {{ character.hp_max }} PV</span>
                </div>

                <!-- Ações Rápidas -->
                <div class="grid grid-cols-4 gap-2 mb-4">
                    <button @click="alterarHP(-5)" class="py-2 bg-red-950/60 hover:bg-red-800 border border-red-700 text-red-300 rounded font-mono text-xs">-5 HP</button>
                    <button @click="alterarHP(-1)" class="py-2 bg-red-950/60 hover:bg-red-800 border border-red-700 text-red-300 rounded font-mono text-xs">-1 HP</button>
                    <button @click="alterarHP(1)" class="py-2 bg-green-950/60 hover:bg-green-800 border border-green-700 text-green-300 rounded font-mono text-xs">+1 HP</button>
                    <button @click="alterarHP(5)" class="py-2 bg-green-950/60 hover:bg-green-800 border border-green-700 text-green-300 rounded font-mono text-xs">+5 HP</button>
                </div>

                <!-- Customizado -->
                <div class="mb-4">
                    <label class="block text-[10px] font-cinzel text-gray-400 mb-1">Valor Personalizado:</label>
                    <div class="flex gap-2">
                        <input v-model="valorDanoCuraCustom" type="number" placeholder="Quantidade" 
                               class="flex-1 bg-black/60 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-600">
                        <button @click="aplicarDanoCuraCustom(false)" class="px-3 bg-red-900 hover:bg-red-800 text-white rounded text-xs font-cinzel">Dano</button>
                        <button @click="aplicarDanoCuraCustom(true)" class="px-3 bg-green-900 hover:bg-green-800 text-white rounded text-xs font-cinzel">Cura</button>
                    </div>
                </div>

                <!-- Tomar Frasco -->
                <button @click="tomarFrascoSangue" 
                        class="w-full py-2.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 rounded font-cinzel text-xs uppercase mb-3 flex items-center justify-center gap-1.5">
                    <span>🩸 Tomar Frasco de Sangue (Restam: {{ character.frascos || 0 }})</span>
                </button>

                <button @click="mostrarModalHP = false" 
                        class="w-full py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded font-cinzel text-xs uppercase">
                    Fechar
                </button>
            </div>
        </div>

        <!-- MODAL ESCOLHER USO DO SANGUE -->
        <div v-if="mostrarModalSangue" class="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <div class="bg-zinc-950 border-2 border-red-800 rounded-lg p-6 max-w-md w-full shadow-2xl animate-fadeIn">
                <h2 class="font-cinzel text-red-400 text-lg mb-4 text-center">GASTAR PONTO DE SANGUE</h2>
                <div class="space-y-2.5 mb-5">
                    <button @click="gastarSangue('cura')" 
                            class="w-full p-3 bg-green-950/30 hover:bg-green-900/50 border border-green-700 rounded text-left transition-colors">
                        <p class="font-cinzel text-green-400 font-bold text-xs">🏥 Cura Rápida</p>
                        <p class="text-[10px] text-gray-400">1d6 + CON HP (Ação bônus) • Ganha +1 Frenesi</p>
                    </button>
                    <button @click="gastarSangue('impulso')" 
                            class="w-full p-3 bg-yellow-950/30 hover:bg-yellow-900/50 border border-yellow-700 rounded text-left transition-colors">
                        <p class="font-cinzel text-yellow-400 font-bold text-xs">⚡ Impulso Violento</p>
                        <p class="text-[10px] text-gray-400">+1d4 no próximo ataque ou dano • Ganha +1 Frenesi</p>
                    </button>
                    <button @click="gastarSangue('horror')" 
                            class="w-full p-3 bg-purple-950/30 hover:bg-purple-900/50 border border-purple-700 rounded text-left transition-colors">
                        <p class="font-cinzel text-purple-400 font-bold text-xs">🛡️ Resistir ao Horror</p>
                        <p class="text-[10px] text-gray-400">Vantagem contra medo ou controle mental • Ganha +1 Frenesi</p>
                    </button>
                </div>
                <button @click="mostrarModalSangue = false" 
                        class="w-full py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded text-xs font-cinzel uppercase">
                    Cancelar
                </button>
            </div>
        </div>

        <!-- NAVEGAÇÃO INFERIOR FIXA -->
        <nav class="fixed bottom-0 left-0 right-0 h-16 bg-[#0f0f0f] border-t border-amber-900/80 flex justify-around items-center z-40 backdrop-blur-md">
            <button @click="switchTab('status')" 
                    class="flex-1 h-full flex flex-col items-center justify-center transition-colors"
                    :class="activeTab === 'status' ? 'text-amber-400 bg-amber-950/20 border-t-2 border-amber-500' : 'text-gray-500 hover:text-gray-300'">
                <span class="text-xl">☤</span>
                <span class="text-[10px] font-cinzel uppercase mt-0.5">Status</span>
            </button>
            
            <button @click="switchTab('combate')" 
                    class="flex-1 h-full flex flex-col items-center justify-center transition-colors"
                    :class="activeTab === 'combate' ? 'text-red-400 bg-red-950/20 border-t-2 border-red-500' : 'text-gray-500 hover:text-gray-300'">
                <span class="text-xl">⚔</span>
                <span class="text-[10px] font-cinzel uppercase mt-0.5">Caça</span>
            </button>
            
            <button @click="switchTab('habilidades')" 
                    class="flex-1 h-full flex flex-col items-center justify-center transition-colors"
                    :class="activeTab === 'habilidades' ? 'text-yellow-400 bg-yellow-950/20 border-t-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'">
                <span class="text-xl">⚡</span>
                <span class="text-[10px] font-cinzel uppercase mt-0.5">Hab.</span>
            </button>
            
            <button @click="switchTab('inventario')" 
                    class="flex-1 h-full flex flex-col items-center justify-center transition-colors"
                    :class="activeTab === 'inventario' ? 'text-amber-400 bg-amber-950/20 border-t-2 border-amber-500' : 'text-gray-500 hover:text-gray-300'">
                <span class="text-xl">🎒</span>
                <span class="text-[10px] font-cinzel uppercase mt-0.5">Itens</span>
            </button>
            
            <button @click="switchTab('notas')" 
                    class="flex-1 h-full flex flex-col items-center justify-center transition-colors"
                    :class="activeTab === 'notas' ? 'text-amber-400 bg-amber-950/20 border-t-2 border-amber-500' : 'text-gray-500 hover:text-gray-300'">
                <span class="text-xl">📜</span>
                <span class="text-[10px] font-cinzel uppercase mt-0.5">Notas</span>
            </button>
        </nav>

        <!-- TRACKER DE INICIATIVA DO COMBATE (acima da navbar) -->
        <InitiativeTracker v-if="combatState.ativo" :combat-state="combatState" :my-id="charId" />

        <!-- COMPÊNDIO / ARQUIVO DO CAÇADOR -->
        <HunterArchive v-model:open="showArchive" />
    </div>

    <!-- ESTADO DE ERRO -->
    <div v-else-if="erroCarregamento" class="fixed inset-0 min-h-screen flex items-center justify-center bg-black z-50 p-6">
        <div class="glass-panel p-8 rounded-lg max-w-md w-full border border-red-900/60 text-center animate-fadeIn">
            <div class="text-5xl mb-4">💀</div>
            <h2 class="font-cinzel text-xl text-red-400 mb-2">Caçador Não Encontrado</h2>
            <p class="text-xs text-gray-400 mb-6 leading-relaxed">
                Não conseguimos localizar os registros deste caçador. A sessão pode ter sido encerrada pelo mestre ou você está desconectado.
            </p>
            <router-link to="/" class="inline-block w-full py-3 bg-red-900 hover:bg-red-800 text-amber-100 font-cinzel text-xs uppercase tracking-wider rounded transition-colors">
                Voltar à Página Inicial
            </router-link>
        </div>
    </div>

    <!-- ESTADO DE CARREGAMENTO -->
    <div v-else class="fixed inset-0 min-h-screen flex items-center justify-center bg-black z-50">
        <div class="text-center">
            <div class="w-12 h-12 border-t-2 border-red-700 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-400 font-serif italic text-sm">Entrando no Sonho do Caçador...</p>
        </div>
    </div>
</template>

<style scoped>
.animate-fadeIn {
    animation: fadeIn 0.25s ease-in;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(6px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.text-shadow {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Toast slide animation */
.toast-slide-enter-active,
.toast-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-slide-enter-from,
.toast-slide-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-12px) scale(0.95);
}
.toast-slide-enter-to,
.toast-slide-leave-from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
}
</style>
