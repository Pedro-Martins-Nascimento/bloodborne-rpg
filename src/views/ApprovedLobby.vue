<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getDatabase, ref as dbRef, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';

const router = useRouter();
const route = useRoute();
const sessaoId = route.params.id;
const playerId = route.params.playerId;
const meuPersonagem = ref(null);
const db = getDatabase(getApp());
let unsubscribe = null;
let jaRedirecionou = false;

onMounted(() => {
    console.log('=== ApprovedLobby MONTOU ===');
    console.log('SessionID:', sessaoId);
    console.log('PlayerID:', playerId);
    
    if (sessaoId && playerId) {
        const charRef = dbRef(db, `sessoes/${sessaoId}/personagens/${playerId}`);
        const path = `sessoes/${sessaoId}/personagens/${playerId}`;
        console.log('Caminho do Firebase:', path);
        
        unsubscribe = onValue(charRef, (snapshot) => {
            const data = snapshot.val();
            console.log('📥 Firebase UPDATE recebido!');
            console.log('Dados completos:', data);
            console.log('Valor de esperando:', data?.esperando);
            meuPersonagem.value = data;
        });
        console.log('Listener do Firebase registrado');
    } else {
        console.error('❌ SessionID ou PlayerID inválido!');
    }
    console.log('==================');
});

// Watch para quando a ficha é atribuída (esperando muda para false)
const stopWatch = watch(() => meuPersonagem.value?.esperando, async (esperando, oldEsperando) => {
    console.log('=== ApprovedLobby WATCH disparado ===');
    console.log('Esperando:', esperando, 'Tipo:', typeof esperando);
    console.log('Anterior:', oldEsperando, 'Tipo:', typeof oldEsperando);
    console.log('jaRedirecionou:', jaRedirecionou);
    console.log('Inteiro objeto meuPersonagem:', meuPersonagem.value);
    console.log('==================');
    
    // Verifica se esperando é estritamente FALSE (não falsy)
    if (esperando === false && !jaRedirecionou) {
        jaRedirecionou = true;
        console.log('✅✅✅ CONDIÇÃO ATENDIDA - Parando watch e iniciando redirecionamento!');
        stopWatch(); // Para o watch para evitar múltiplas navegações
        
        try {
            if (unsubscribe) {
                console.log('🔌 Desmontando listener...');
                unsubscribe();
                unsubscribe = null;
            }
            
            // Aguarda um pouco para garantir que tudo está pronto
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('✅ Aguardou 100ms');
            console.log('✅ Tentando router.push para: /player/' + playerId);
            
            // Usa push ao invés de replace
            await router.push({
                path: `/player/${playerId}`
            });
            console.log('✅ Router.push completado!');
        } catch (error) {
            console.error('❌ Erro no router.push:', error);
            console.log('⚠️ Tentando fallback com window.location.hash');
            window.location.hash = `/player/${playerId}`;
        }
    } else if (esperando !== false) {
        console.log('⏳ Esperando ainda não é false (é', esperando + ')');
    }
}, { deep: true });

onBeforeUnmount(() => {
    if (unsubscribe) unsubscribe();
});

const voltarParaLogin = () => {
    router.push('/');
};
</script>

<template>
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <div class="w-full max-w-md">
            <h1 class="text-4xl font-gothic text-gold text-center mb-2">Sala de Jogo</h1>
            <p class="text-gray-400 text-center mb-8 text-sm">Aguardando ficha...</p>

            <!-- Status na Sala -->
            <div class="bg-yharnam-paper border border-green-600 rounded p-6 mb-6">
                <div class="flex items-center justify-center mb-4">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span class="text-gray-300 text-sm">Conectado à sessão</span>
                </div>
                
                <div class="bg-green-900/30 p-4 rounded border border-green-700 mb-4 text-center">
                    <p class="text-xs text-green-400 uppercase tracking-widest mb-2">✅ Na Sala</p>
                    <p class="text-lg font-gothic text-green-300">Você entrou na sala de jogo!</p>
                </div>

                <div class="bg-black/50 p-4 rounded border border-gray-700 mb-4">
                    <p class="text-xs text-gray-500 mb-1">ID da Sessão:</p>
                    <p class="text-xl font-mono font-bold text-gold">{{ sessaoId }}</p>
                </div>

                <div v-if="meuPersonagem" class="text-center border-t border-gray-700 pt-4 mt-4">
                    <p class="text-xs text-gray-600 mb-1">Seu Nome:</p>
                    <p class="text-lg text-blue-300 font-gothic">{{ meuPersonagem.nome }}</p>
                </div>

                <!-- Aguardando Ficha -->
                <div class="border-t border-gray-700 pt-4 mt-4 text-center">
                    <p class="text-sm text-yellow-300 animate-pulse">
                        ⏳ Mestre está escolhendo sua ficha...
                    </p>
                </div>
            </div>

            <!-- Botão Voltar -->
            <button 
                @click="voltarParaLogin"
                class="w-full text-gray-500 hover:text-gray-400 text-xs py-2 border-t border-gray-700"
            >
                Voltar para Login
            </button>
        </div>
    </div>
</template>
