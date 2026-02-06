<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getDatabase, ref as dbRef, onValue, get } from 'firebase/database';
import { getApp } from 'firebase/app';

const router = useRouter();
const route = useRoute();
const sessaoId = route.params.id;
const playerId = route.params.playerId;
const meuPersonagem = ref(null);
const sessaoAtiva = ref(true);
const sessaoEncerradaMensagem = ref('');
const redirectCountdown = ref(5);
const db = getDatabase(getApp());
let unsubscribe = null;
let unsubscribeSessao = null;
let jaRedirecionou = false;
let pollTimer = null;
let redirectTimer = null;

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

        // Poll a existência da sessão a cada 5s
        const sessionRef = dbRef(db, `sessoes/${sessaoId}`);
        const checkSession = async () => {
            try {
                const snap = await get(sessionRef);
                if (!snap.exists()) {
                    sessaoAtiva.value = false;
                    sessaoEncerradaMensagem.value = 'Sessão encerrada pelo mestre.';
                    if (!redirectTimer) {
                        redirectCountdown.value = 5;
                        redirectTimer = setInterval(() => {
                            redirectCountdown.value -= 1;
                            if (redirectCountdown.value <= 0) {
                                clearInterval(redirectTimer);
                                redirectTimer = null;
                                router.push('/');
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                console.error('Erro ao checar sessão:', error);
            }
        };
        checkSession();
        pollTimer = setInterval(checkSession, 5000);

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
    if (unsubscribeSessao) unsubscribeSessao();
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    if (redirectTimer) {
        clearInterval(redirectTimer);
        redirectTimer = null;
    }
});

const voltarParaLogin = () => {
    router.push('/');
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <!-- Fundo Bloodborne -->
        <div class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-gradient-to-b from-black via-red-950/10 to-black"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,0,0,0.05),transparent_70%)]"></div>
        </div>

        <div class="relative z-10 w-full max-w-lg">
            <!-- Título -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-cinzel text-amber-100 tracking-widest mb-2">SALA DE JOGO</h1>
                <div class="flex items-center justify-center gap-3 mb-4">
                    <div class="h-px w-12 bg-gradient-to-r from-transparent to-red-900/50"></div>
                    <p class="text-red-400 text-xs uppercase tracking-widest font-cinzel">Aguardando Mestre</p>
                    <div class="h-px w-12 bg-gradient-to-l from-transparent to-red-900/50"></div>
                </div>
            </div>

            <!-- Card Principal -->
            <div class="glass-panel border-2 border-red-900/50 rounded-lg p-8 mb-6">
                <!-- Sessão Encerrada -->
                <div v-if="!sessaoAtiva" class="bg-red-900/30 border border-red-700 rounded p-4 mb-6 text-center">
                    <p class="text-red-300 text-sm uppercase tracking-widest mb-2">⚠ Sessão encerrada</p>
                    <p class="text-gray-300 text-sm">{{ sessaoEncerradaMensagem }}</p>
                    <p class="text-gray-500 text-xs mt-2">Voltando ao início em {{ redirectCountdown }}s...</p>
                </div>
                <!-- Status Conectado -->
                <div class="flex items-center justify-center mb-6">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span class="text-green-400 text-xs uppercase tracking-widest font-cinzel">Conectado</span>
                </div>
                
                <!-- Badge de Sucesso -->
                <div class="bg-green-900/20 border border-green-700/50 rounded p-5 mb-6 text-center">
                    <div class="text-4xl mb-3">🗡️</div>
                    <p class="text-xs text-green-500 uppercase tracking-widest mb-2 font-cinzel">✓ Entrada Aprovada</p>
                    <p class="text-lg font-cinzel text-green-300">Você entrou na caçada!</p>
                </div>

                <!-- ID da Sessão -->
                <div class="bg-black/60 border border-gray-800 rounded p-4 mb-4">
                    <p class="text-xs text-gray-500 uppercase tracking-widest mb-2 font-cinzel">Código da Sessão</p>
                    <p class="text-3xl font-mono font-bold text-amber-300 tracking-wider select-all">{{ sessaoId }}</p>
                </div>

                <!-- Nome do Jogador -->
                <div v-if="meuPersonagem" class="bg-black/30 border border-gray-800 rounded p-4 mb-6">
                    <p class="text-xs text-gray-500 uppercase tracking-widest mb-2 font-cinzel">Hunter</p>
                    <p class="text-2xl text-amber-100 font-cinzel tracking-wide">{{ meuPersonagem.nome }}</p>
                </div>

                <!-- Aguardando Ficha -->
                <div class="border-t-2 border-red-900/50 pt-6 text-center">
                    <div class="animate-pulse mb-3">
                        <span class="text-4xl">⏳</span>
                    </div>
                    <p class="text-amber-300 font-cinzel text-sm mb-2">
                        O Mestre está preparando sua ficha...
                    </p>
                    <p class="text-gray-600 text-xs">Aguarde, caçador</p>
                </div>
            </div>

            <!-- Botão Voltar -->
            <button 
                @click="voltarParaLogin"
                class="w-full text-gray-600 hover:text-red-400 text-xs py-3 uppercase tracking-widest font-cinzel transition-colors"
            >
                ← Voltar ao Início
            </button>
        </div>
    </div>
</template>

<style scoped>
.glass-panel {
    background: linear-gradient(135deg, rgba(10, 10, 10, 0.9) 0%, rgba(26, 26, 26, 0.7) 100%);
    backdrop-filter: blur(10px);
}
</style>
