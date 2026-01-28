<script setup>
defineProps({
    combatState: Object, // O objeto completo do combate
    myId: String,        // O ID do jogador para destacar quem ele é
});
</script>

<template>
    <div v-if="combatState && combatState.ativo" 
         class="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-yharnam-border p-3 shadow-2xl z-50">
        <h3 class="text-center text-xs font-gothic text-blood uppercase tracking-widest mb-2">Ordem de Combate</h3>
        <div class="flex items-center justify-center gap-3 overflow-x-auto pb-2">
            <div v-for="(p, index) in combatState.ordem" :key="p.id"
                 class="p-2 rounded-md transition-all duration-300 w-32 flex-shrink-0"
                 :class="{
                     'bg-gold/20 border-2 border-gold shadow-gold-glow scale-110': index === combatState.turnoAtual, // É o turno dele
                     'bg-yharnam-paper border border-yharnam-border': index !== combatState.turnoAtual, // Não é o turno
                     'ring-2 ring-blue-400': p.id === myId && p.tipo === 'jogador' // Destaca se for o seu personagem
                 }">
                <div class="text-center truncate font-gothic text-sm" 
                     :class="{
                         'text-gold': index === combatState.turnoAtual,
                         'text-blue-300': p.tipo === 'jogador',
                         'text-red-400': p.tipo === 'monstro'
                     }">
                    {{ p.nome }}
                </div>
                <div class="text-center text-xs font-mono"
                     :class="{
                         'text-white': index === combatState.turnoAtual,
                         'text-gray-500': index !== combatState.turnoAtual,
                     }">
                    Ini: {{ p.iniciativa }}
                </div>
            </div>
        </div>
    </div>
</template>