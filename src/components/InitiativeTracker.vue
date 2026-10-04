<script setup>
import { ref } from 'vue';

defineProps({
    combatState: Object, // O objeto completo do combate
    myId: String,        // O ID do jogador para destacar quem ele é
});

const minimizado = ref(false);
</script>

<template>
    <div v-if="combatState && combatState.ativo" 
         class="fixed bottom-16 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-b border-red-900/60 transition-all duration-300 z-30 shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
        
        <!-- Header da barra com botão minimizar -->
        <div class="flex items-center justify-between px-3 py-1 bg-red-950/30 border-b border-red-900/30">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                <span class="text-[11px] font-cinzel text-amber-200 tracking-wider uppercase">
                    ⚔ Combate Ativo • Rodada {{ combatState.rodada || 1 }}
                </span>
            </div>
            
            <div class="flex items-center gap-2">
                <span v-if="combatState.ordem?.[combatState.turnoAtual]?.id === myId" 
                      class="text-[10px] bg-red-700 text-white font-cinzel px-2 py-0.5 rounded font-bold animate-pulse">
                    ⚡ SEU TURNO!
                </span>
                <button @click="minimizado = !minimizado" 
                        class="text-[10px] text-gray-400 hover:text-amber-300 font-cinzel px-1.5 py-0.5 rounded border border-gray-700 transition-colors">
                    {{ minimizado ? '▲ Expandir' : '▼ Recolher' }}
                </button>
            </div>
        </div>

        <!-- Conteúdo da ordem (quando expandido) -->
        <div v-show="!minimizado" class="p-2 sm:p-3">
            <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-thin">
                <div v-for="(p, index) in combatState.ordem" :key="p.id || index"
                     class="p-2 rounded-md transition-all duration-300 w-28 sm:w-32 flex-shrink-0 border relative"
                     :class="{
                         'bg-gradient-to-b from-amber-900/40 to-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105 z-10': index === combatState.turnoAtual,
                         'bg-zinc-950/80 border-gray-800 opacity-70': index !== combatState.turnoAtual,
                         'ring-2 ring-blue-500': p.id === myId
                     }">
                    
                    <!-- Badge de Turno Atual -->
                    <div v-if="index === combatState.turnoAtual" 
                         class="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-cinzel font-bold bg-amber-600 text-black px-1.5 rounded-full uppercase tracking-tighter">
                        Vez
                    </div>

                    <div class="text-center truncate font-cinzel text-xs font-bold pt-1" 
                         :class="{
                             'text-amber-300': index === combatState.turnoAtual,
                             'text-blue-300': p.tipo === 'jogador' && index !== combatState.turnoAtual,
                             'text-red-400': p.tipo === 'monstro' && index !== combatState.turnoAtual
                         }">
                        {{ p.nome }}
                    </div>

                    <div class="flex justify-between items-center text-[10px] font-mono mt-1 pt-1 border-t border-gray-800">
                        <span class="text-gray-400">Ini: <strong class="text-amber-400">{{ p.iniciativa }}</strong></span>
                        <span v-if="p.hp_atual !== undefined" class="text-gray-400">
                            ❤️ {{ p.hp_atual }}<span v-if="p.hp_max">/{{ p.hp_max }}</span>
                        </span>
                    </div>

                    <!-- Indicador "Você" -->
                    <div v-if="p.id === myId" class="text-[9px] text-center text-blue-400 font-cinzel mt-0.5">
                        (Você)
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
    height: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
    background: #8a0b0b;
    border-radius: 2px;
}
</style>