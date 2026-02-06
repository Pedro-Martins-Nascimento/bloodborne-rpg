<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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
let jaRedirecionou = false; // Previne múltiplos redirects
let pollTimer = null;
let redirectTimer = null;

onMounted(() => {
    console.log('SessionLobby montado - SessionID:', sessaoId, 'PlayerID:', playerId);
    
    if (sessaoId && playerId) {
        // Observa apenas o personagem específico
        const charRef = dbRef(db, `sessoes/${sessaoId}/personagens/${playerId}`);
        console.log('Observando:', `sessoes/${sessaoId}/personagens/${playerId}`);
        
        unsubscribe = onValue(charRef, (snapshot) => {
            const data = snapshot.val();
            console.log('SessionLobby - Dados recebidos:', data);
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
    } else {
        console.error('SessionID ou PlayerID está vazio!');
    }
});

// Watch para quando jogador é aprovado
watch(() => meuPersonagem.value?.aprovado, async (aprovado, oldAprovado) => {
    console.log('SessionLobby - Watch detectou mudança em aprovado:', aprovado, 'Anterior:', oldAprovado);
    if (aprovado === true && !jaRedirecionou) {
        jaRedirecionou = true;
        console.log('✅ Jogador foi aprovado! Saindo do lobby para ApprovedLobby...');
        
        try {
            if (unsubscribe) {
                console.log('🔌 Desmontando listener do Firebase...');
                unsubscribe();
                unsubscribe = null;
            }
            
            await nextTick();
            console.log('✅ Redirecionando para ApprovedLobby...');
            await router.replace(`/sessao-approved/${sessaoId}/${playerId}`);
            console.log('✅ Navegação para ApprovedLobby concluída');
        } catch (error) {
            console.error('❌ Erro ao navegar para ApprovedLobby:', error);
            window.location.hash = `/sessao-approved/${sessaoId}/${playerId}`;
        }
    }
});

// Watch para quando a ficha é atribuída
watch(() => meuPersonagem.value?.esperando, async (esperando, oldEsperando) => {
    console.log('SessionLobby - Watch detectou mudança em esperando:', esperando, 'Anterior:', oldEsperando);
    if (esperando === false && !jaRedirecionou) {
        jaRedirecionou = true;
        console.log('✅ Ficha atribuída! Iniciando navegação para PlayerSheet:', playerId);
        
        try {
            // CRÍTICO: Desmontar listener ANTES de navegar
            if (unsubscribe) {
                console.log('🔌 Desmontando listener do Firebase...');
                unsubscribe();
                unsubscribe = null;
            }
            
            await nextTick();
            console.log('✅ NextTick concluído, executando replace...');
            await router.replace(`/player/${playerId}`);
            console.log('✅ Router.replace concluído');
        } catch (error) {
            console.error('❌ Erro ao navegar:', error);
            // Fallback: tenta com window.location
            console.log('⚠️ Tentando fallback com window.location...');
            window.location.hash = `/player/${playerId}`;
        }
    }
});

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

const irParaFicha = () => {
    console.log('Indo para ficha manualmente:', playerId);
    router.push(`/player/${playerId}`);
};
</script>

<template>
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <div class="w-full max-w-md">
            <h1 class="text-4xl font-gothic text-blood text-center mb-2">Aguardando Ficha</h1>
            <p class="text-gray-400 text-center mb-8 text-sm">O mestre está atribuindo sua ficha...</p>

            <!-- Sessão Encerrada -->
            <div v-if="!sessaoAtiva" class="bg-red-900/30 border border-red-700 rounded p-4 mb-6 text-center">
                <p class="text-red-300 text-sm uppercase tracking-widest mb-2">⚠ Sessão encerrada</p>
                <p class="text-gray-300 text-sm">{{ sessaoEncerradaMensagem }}</p>
                <p class="text-gray-500 text-xs mt-2">Voltando ao início em {{ redirectCountdown }}s...</p>
            </div>

            <!-- Status de Conexão -->
            <div class="bg-yharnam-paper border border-gray-700 rounded p-6 mb-6">
                <div class="flex items-center justify-center mb-4">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span class="text-gray-300 text-sm">Conectado à sessão</span>
                </div>
                
                <div class="bg-black/50 p-4 rounded border border-gray-700 mb-4">
                    <p class="text-xs text-gray-500 mb-1">ID da Sessão:</p>
                    <p class="text-xl font-mono font-bold text-gold">{{ sessaoId }}</p>
                </div>

                <div v-if="meuPersonagem" class="text-center border-t border-gray-700 pt-4 mt-4">
                    <p class="text-xs text-gray-600 mb-1">Seu Nome:</p>
                    <p class="text-lg text-blue-300 font-gothic">{{ meuPersonagem.nome }}</p>
                </div>

                <!-- Status de Aprovação -->
                <div class="border-t border-gray-700 pt-4 mt-4">
                    <p v-if="!meuPersonagem?.aprovado" class="text-xs text-yellow-400 text-center animate-pulse">
                        ⏳ Aguardando aprovação do mestre...
                    </p>
                    <p v-else class="text-xs text-green-400 text-center">
                        ✅ Você foi aprovado! Entrando na sala...
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
            
            <!-- Botão de teste -->
            <button 
                @click="irParaFicha"
                class="w-full bg-blue-600 text-white text-xs py-2 mt-2 hover:bg-blue-700 transition-colors"
            >
                [TESTE] Ir para ficha manualmente
            </button>
        </div>
    </div>
</template>
