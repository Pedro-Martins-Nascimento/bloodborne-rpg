<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCharacter, subscribeToCharacter } from '../services/firebase';
import { getDatabase, ref as dbRef, set, get } from 'firebase/database';
import { getApp } from 'firebase/app';

const router = useRouter();
const nomeHunter = ref('');
const sessaoId = ref('');
const carregando = ref(false);
const db = getDatabase(getApp());

// Estados de modal
const mostrarModalMestre = ref(false);
const mostrarModalJogador = ref(false);
const mensagemErro = ref('');

const entrarComoMestre = () => {
    const mestreId = 'mestre_' + Date.now();
    localStorage.setItem('userId', mestreId);
    mostrarModalMestre.value = false;
    router.push('/sessao');
};

const abrirModalJogador = () => {
    mostrarModalJogador.value = true;
    mensagemErro.value = '';
    nomeHunter.value = '';
    sessaoId.value = '';
};

const entrarSessao = async () => {
    if (!nomeHunter.value.trim()) {
        mensagemErro.value = 'Digite seu nome';
        return;
    }
    if (!sessaoId.value.trim()) {
        mensagemErro.value = 'Digite o ID da sessão';
        return;
    }
    
    carregando.value = true;
    mensagemErro.value = '';
    
    // Verificar se a sessão existe (one-shot)
    const sessionCode = sessaoId.value.toUpperCase().trim();
    const sessionRef = dbRef(db, `sessoes/${sessionCode}`);
    let timeoutHit = false;
    const timeout = setTimeout(() => {
        timeoutHit = true;
        mensagemErro.value = 'Tempo de resposta excedido. Tente novamente.';
        carregando.value = false;
    }, 5000);

    try {
        const sessionSnap = await get(sessionRef);
        if (timeoutHit) return;
        clearTimeout(timeout);

        if (!sessionSnap.exists()) {
            mensagemErro.value = 'Sessão não encontrada! Verifique o código.';
            carregando.value = false;
            return;
        }

        const session = sessionSnap.val();
        if (session?.ativa === false) {
            mensagemErro.value = 'Sessão encerrada pelo mestre.';
            carregando.value = false;
            return;
        }

        const playerId = `${sessionCode}_${nomeHunter.value.toLowerCase().trim().replace(/\s/g, '')}`;
        const charRef = dbRef(db, `sessoes/${sessionCode}/personagens/${playerId}`);

        const snapshot = await get(charRef);
        if (!snapshot.exists()) {
            await set(charRef, {
                nome: nomeHunter.value.trim(),
                esperando: true,
                sessaoId: sessionCode
            });
        }

        carregando.value = false;
        router.push(`/sessao-approved/${sessionCode}/${playerId}`);
    } catch (error) {
        if (!timeoutHit) {
            mensagemErro.value = 'Erro ao conectar: ' + error.message;
            carregando.value = false;
        }
    }
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <!-- Fundo com animação -->
        <div class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-gradient-to-b from-black via-red-950/20 to-black"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,0,0,0.1),transparent_50%)]"></div>
        </div>
        
        <div class="relative z-10 w-full max-w-6xl">
            <!-- Logo e Título -->
            <div class="text-center mb-8 sm:mb-12 md:mb-16">
                <h1 class="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-cinzel text-amber-100 tracking-widest drop-shadow-[0_0_30px_rgba(217,119,6,0.5)] mb-2 sm:mb-4">
                    BLOODBORNE
                </h1>
                <div class="flex items-center justify-center gap-2 sm:gap-4 mb-2">
                    <div class="h-px w-12 sm:w-24 bg-gradient-to-r from-transparent to-red-900/50"></div>
                    <p class="text-red-400 font-cinzel tracking-[0.3em] text-[10px] sm:text-xs md:text-sm uppercase">
                        RPG Companion
                    </p>
                    <div class="h-px w-12 sm:w-24 bg-gradient-to-l from-transparent to-red-900/50"></div>
                </div>
                <p class="text-gray-600 text-[10px] sm:text-xs mt-2 sm:mt-4">Fear the Old Blood</p>
            </div>
            
            <!-- Cards de Escolha -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 max-w-3xl mx-auto px-2 sm:px-0">
                <!-- Card Mestre -->
                <div @click="mostrarModalMestre = true" 
                     class="group glass-panel p-4 sm:p-6 rounded border-2 border-purple-900/50 hover:border-purple-700 transition-all cursor-pointer transform hover:scale-105 hover:shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                    <div class="text-center space-y-3 sm:space-y-4">
                        <div class="text-4xl sm:text-5xl mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">
                            👑
                        </div>
                        <h2 class="text-lg sm:text-2xl font-cinzel text-purple-300 tracking-wider">MESTRE</h2>
                        <p class="text-gray-400 text-[11px] sm:text-xs leading-relaxed">
                            Crie e gerencie sessões. Controle combates.
                        </p>
                        <div class="pt-2 sm:pt-3">
                            <span class="text-purple-400 text-[9px] sm:text-[10px] uppercase tracking-widest">Clique para entrar</span>
                        </div>
                    </div>
                </div>

                <!-- Card Jogador -->
                <div @click="abrirModalJogador" 
                     class="group glass-panel p-4 sm:p-6 rounded border-2 border-red-900/50 hover:border-red-700 transition-all cursor-pointer transform hover:scale-105 hover:shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                    <div class="text-center space-y-3 sm:space-y-4">
                        <div class="text-4xl sm:text-5xl mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">
                            🗡️
                        </div>
                        <h2 class="text-lg sm:text-2xl font-cinzel text-red-300 tracking-wider">SESSÃO</h2>
                        <p class="text-gray-400 text-[11px] sm:text-xs leading-relaxed">
                            Entre em uma sessão existente. Conecte ao mestre.
                        </p>
                        <div class="pt-3">
                            <span class="text-red-400 text-[10px] uppercase tracking-widest">Clique para entrar</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Mestre -->
        <div v-if="mostrarModalMestre" 
             @click.self="mostrarModalMestre = false"
             class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div class="glass-panel p-6 sm:p-8 rounded-lg max-w-md w-full border border-purple-900/50 animate-fadeIn">
                <h3 class="text-xl sm:text-2xl font-cinzel text-purple-300 mb-4 sm:mb-6 text-center">Painel do Mestre</h3>
                <p class="text-gray-400 text-xs sm:text-sm text-center mb-6 sm:mb-8">
                    Você será redirecionado para criar ou acessar suas sessões.
                </p>
                <div class="flex gap-3 sm:gap-4">
                    <button @click="mostrarModalMestre = false" 
                            class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 sm:py-3 rounded font-cinzel uppercase tracking-wider text-xs sm:text-sm transition-colors">
                        Cancelar
                    </button>
                    <button @click="entrarComoMestre" 
                            class="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-2 sm:py-3 rounded font-cinzel uppercase tracking-wider text-xs sm:text-sm transition-colors">
                        Continuar
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal Jogador -->
        <div v-if="mostrarModalJogador" 
             @click.self="mostrarModalJogador = false"
             class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div class="glass-panel p-6 sm:p-8 rounded-lg max-w-md w-full border border-red-900/50 animate-fadeIn">
                <h3 class="text-xl sm:text-2xl font-cinzel text-red-300 mb-1 sm:mb-2 text-center">Entrar como Jogador</h3>
                <p class="text-gray-500 text-[10px] sm:text-xs text-center mb-4 sm:mb-6">Conecte-se a uma sessão existente</p>
                
                <!-- Mensagem de Erro -->
                <div v-if="mensagemErro" class="bg-red-900/30 border border-red-700 rounded p-3 mb-4">
                    <p class="text-red-300 text-xs sm:text-sm text-center">{{ mensagemErro }}</p>
                </div>

                <div class="space-y-4 sm:space-y-5 mb-6">
                    <!-- ID da Sessão -->
                    <div>
                        <label class="block text-gray-400 text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-cinzel">
                            Código da Sessão
                        </label>
                        <input v-model="sessaoId" 
                               type="text" 
                               maxlength="6"
                               @input="sessaoId = sessaoId.toUpperCase()"
                               class="w-full bg-black/50 border border-gray-700 focus:border-red-600 rounded px-3 sm:px-4 py-2 sm:py-3 text-gray-200 text-center text-lg sm:text-2xl font-mono font-bold outline-none transition-colors placeholder-gray-700">
                        <p class="text-gray-600 text-[9px] sm:text-xs mt-1 text-center">6 caracteres (fornecido pelo mestre)</p>
                    </div>

                    <!-- Nome do Jogador -->
                    <div>
                        <label class="block text-gray-400 text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-cinzel">
                            Seu Nome
                        </label>
                        <input v-model="nomeHunter" 
                               @keyup.enter="entrarSessao" 
                               type="text" 
                               class="w-full bg-black/50 border border-gray-700 focus:border-red-600 rounded px-3 sm:px-4 py-2 sm:py-3 text-gray-200 text-center text-sm sm:text-lg font-cinzel outline-none transition-colors placeholder-gray-700">
                    </div>
                </div>
                
                <div class="flex gap-3 sm:gap-4 mt-6">
                    <button @click="mostrarModalJogador = false; mensagemErro = ''" 
                            class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 sm:py-3 rounded font-cinzel uppercase tracking-wider text-xs sm:text-sm transition-colors">
                        Cancelar
                    </button>
                    <button @click="entrarSessao" 
                            :disabled="carregando || !nomeHunter.trim() || !sessaoId.trim()"
                            class="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 sm:py-3 rounded font-cinzel uppercase tracking-wider text-xs sm:text-sm transition-colors flex items-center justify-center gap-2">
                        <span v-if="carregando" class="animate-spin">⏳</span>
                        <span>{{ carregando ? 'Conectando...' : 'Entrar' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
}

/* Glass panel effect */
.glass-panel {
    background: linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(26, 26, 26, 0.6) 100%);
    backdrop-filter: blur(10px);
}
</style>