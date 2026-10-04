<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { subscribeToSessionCharacters, getSession } from '../services/firebase';

const router = useRouter();
const route = useRoute();
const sessaoId = route.params.id;
const playerId = route.params.playerId;
const meuPersonagem = ref(null);
const sessaoAtiva = ref(true);
const sessaoEncerradaMensagem = ref('');
const redirectCountdown = ref(5);
let unsubscribeChars = null;
let unsubscribeSession = null;
let jaRedirecionou = false;
let redirectTimer = null;

onMounted(() => {
    if (sessaoId && playerId) {
        // Observa personagens da sessão via serviço unificado (funciona online e offline)
        unsubscribeChars = subscribeToSessionCharacters(sessaoId, (chars) => {
            const data = chars ? chars[playerId] : null;
            if (data) {
                meuPersonagem.value = data;
            }
        });

        // Observa status da sessão
        unsubscribeSession = getSession(sessaoId, (session) => {
            if (!session || session.ativa === false) {
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
        });
    } else {
        console.error('SessionID ou PlayerID inválido!');
    }
});

// Watch para quando a ficha é atribuída (esperando muda para false)
const stopWatch = watch(() => meuPersonagem.value?.esperando, async (esperando) => {
    if (esperando === false && !jaRedirecionou) {
        jaRedirecionou = true;
        stopWatch();
        
        try {
            if (unsubscribeChars) unsubscribeChars();
            if (unsubscribeSession) unsubscribeSession();
            await nextTick();
            await router.push(`/player/${playerId}`);
        } catch (error) {
            console.error('Erro na navegação para ficha:', error);
            window.location.hash = `/player/${playerId}`;
        }
    }
}, { deep: true });

onBeforeUnmount(() => {
    if (unsubscribeChars) unsubscribeChars();
    if (unsubscribeSession) unsubscribeSession();
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
                <h1 class="text-4xl sm:text-5xl font-cinzel text-amber-100 tracking-widest mb-2">SALA DE ESPERA</h1>
                <div class="flex items-center justify-center gap-3 mb-4">
                    <div class="h-px w-12 bg-gradient-to-r from-transparent to-red-900/50"></div>
                    <p class="text-red-400 text-xs uppercase tracking-widest font-cinzel">Aguardando Mestre</p>
                    <div class="h-px w-12 bg-gradient-to-l from-transparent to-red-900/50"></div>
                </div>
            </div>

            <!-- Card Principal -->
            <div class="glass-panel border-2 border-red-900/50 rounded-lg p-6 sm:p-8 mb-6 shadow-2xl">
                <!-- Sessão Encerrada -->
                <div v-if="!sessaoAtiva" class="bg-red-900/30 border border-red-700 rounded p-4 mb-6 text-center animate-pulse">
                    <p class="text-red-300 text-sm uppercase tracking-widest mb-2 font-cinzel">⚠ Sessão encerrada</p>
                    <p class="text-gray-300 text-sm">{{ sessaoEncerradaMensagem }}</p>
                    <p class="text-gray-500 text-xs mt-2 font-mono">Voltando ao início em {{ redirectCountdown }}s...</p>
                </div>

                <!-- Status Conectado -->
                <div class="flex items-center justify-center mb-6">
                    <div class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span class="text-green-400 text-xs uppercase tracking-widest font-cinzel">Conectado ao Sonho</span>
                </div>
                
                <!-- Badge de Sucesso -->
                <div class="bg-green-950/30 border border-green-700/50 rounded-lg p-5 mb-6 text-center shadow-lg">
                    <div class="text-4xl mb-2">🗡️</div>
                    <p class="text-[10px] text-green-400 uppercase tracking-widest mb-1 font-cinzel">✓ Entrada Confirmada</p>
                    <p class="text-lg font-cinzel text-green-300">Você entrou na caçada!</p>
                </div>

                <!-- ID da Sessão -->
                <div class="bg-black/60 border border-gray-800 rounded p-4 mb-4 text-center">
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-cinzel">Código da Sessão</p>
                    <p class="text-3xl font-mono font-bold text-amber-300 tracking-wider select-all">{{ sessaoId }}</p>
                </div>

                <!-- Nome do Jogador -->
                <div v-if="meuPersonagem" class="bg-black/40 border border-gray-800 rounded p-4 mb-6 text-center">
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-cinzel">Caçador</p>
                    <p class="text-2xl text-amber-100 font-cinzel tracking-wide">{{ meuPersonagem.nome }}</p>
                </div>

                <!-- Aguardando Ficha -->
                <div class="border-t-2 border-red-900/50 pt-6 text-center">
                    <div class="animate-pulse mb-3">
                        <span class="text-4xl">⏳</span>
                    </div>
                    <p class="text-amber-300 font-cinzel text-sm mb-1 font-bold">
                        O Mestre está atribuindo sua classe e ficha...
                    </p>
                    <p class="text-gray-500 text-xs font-serif italic">Assim que aprovado, sua ficha se abrirá automaticamente.</p>
                </div>
            </div>

            <!-- Botão Voltar -->
            <button 
                @click="voltarParaLogin"
                class="w-full text-gray-500 hover:text-red-400 text-xs py-3 uppercase tracking-widest font-cinzel transition-colors text-center"
            >
                ← Voltar à Página Inicial
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
