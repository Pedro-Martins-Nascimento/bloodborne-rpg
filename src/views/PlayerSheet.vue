<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { subscribeToCharacter, updateCharacterData, subscribeToCombat } from '../services/firebase';
import InitiativeTracker from '../components/InitiativeTracker.vue';

const route = useRoute();
const charId = route.params.id;
const character = ref(null);
const combatState = ref({ ativo: false });

onMounted(() => {
    subscribeToCharacter(charId, (data) => {
        character.value = data;
    });
    subscribeToCombat((data) => {
        combatState.value = data;
    });
});

const alterarRecurso = (tipo, valor) => {
    if (!character.value) return;
    const novoValor = (character.value[tipo] || 0) + valor;
    if (novoValor < 0) return;
    updateCharacterData(charId, { [tipo]: novoValor });
};

const statusClasses = computed(() => {
    const s = character.value?.status || [];
    if (s.includes('frenesi')) return 'shadow-[inset_0_0_100px_rgba(180,0,0,0.6)] animate-pulse';
    if (s.includes('veneno')) return 'shadow-[inset_0_0_100px_rgba(0,100,0,0.5)]';
    if (s.includes('medo')) return 'grayscale brightness-[0.4] contrast-150';
    return '';
});
</script>

<template>
  <div> <!-- Wrapper principal -->
    <template v-if="character">
        <!-- ESTADO 1: LOBBY DE ESPERA -->
        <div v-if="character.esperando" class="min-h-screen flex flex-col items-center justify-center bg-yharnam-dark text-center p-6">
            <h2 class="text-3xl font-gothic text-gold mb-4">Olá, {{ character.nome }}</h2>
            <div class="w-12 h-12 border-t-2 border-blood rounded-full animate-spin mx-auto mb-6"></div>
            <p class="text-gray-400 font-serif italic text-lg">"Aguardando o Mestre..."</p>
        </div>

        <!-- ESTADO 2: FICHA ATIVA -->
        <div v-else class="min-h-screen transition-opacity duration-1000 pb-24" :class="statusClasses">
            <div class="relative pt-8 pb-12 px-6 text-center bg-gradient-to-b from-black/80 to-transparent">
                <h1 class="text-4xl md:text-5xl font-gothic text-transparent bg-clip-text bg-gradient-to-b from-gold to-gold-dim drop-shadow-lg tracking-widest uppercase">
                    {{ character.nome }}
                </h1>
            </div>
            <div class="max-w-md mx-auto px-4 space-y-8 relative z-10">
                 <div class="relative group">
                    <div class="flex justify-between text-gold-dim text-sm font-gothic mb-1 tracking-widest uppercase">
                        <span>Vitalidade</span>
                        <span>{{ character.hp_atual }} / {{ character.hp_max }}</span>
                    </div>
                    <div class="h-8 bg-black border border-yharnam-border rounded-sm relative overflow-hidden shadow-inner">
                        <div class="h-full bg-gradient-to-r from-blood-dark via-blood to-blood-light transition-all duration-700 ease-out shadow-[0_0_20px_rgba(138,11,11,0.8)] relative"
                             :style="{ width: (character.hp_atual / character.hp_max * 100) + '%' }">
                        </div>
                    </div>
                </div>
                 <!-- AQUI VAI O RESTO DA SUA FICHA ESTILIZADA: RECURSOS, EQUIPAMENTOS, ETC. -->
                 <!-- (O código da ficha da resposta anterior) -->
            </div>
        </div>
    </template>
    
    <!-- ESTADO 3: CARREGANDO INICIALMENTE -->
    <div v-else class="min-h-screen flex items-center justify-center bg-black text-gold font-gothic animate-pulse">
        Conectando ao Sonho...
    </div>

    <!-- O Tracker de Iniciativa fica aqui fora, para aparecer sobre qualquer estado -->
    <InitiativeTracker :combatState="combatState" :myId="charId" />
  </div>
</template>