<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCharacter, subscribeToCharacter, getSession } from '../services/firebase';
import { getDatabase, ref as dbRef, onValue, set, get } from 'firebase/database';
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
    
    // Verificar se a sessão existe
    getSession(sessaoId.value.toUpperCase().trim(), async (session) => {
        if (!session) {
            mensagemErro.value = 'Sessão não encontrada! Verifique o código.';
            carregando.value = false;
            return;
        }

        const playerId = `${sessaoId.value.toUpperCase().trim()}_${nomeHunter.value.toLowerCase().trim().replace(/\s/g, '')}`;
        const charRef = dbRef(db, `sessoes/${sessaoId.value.toUpperCase().trim()}/personagens/${playerId}`);
        
        try {
            const snapshot = await get(charRef);
            
            if (!snapshot.exists()) {
                await set(charRef, {
                    nome: nomeHunter.value.trim(),
                    esperando: true,
                    sessaoId: sessaoId.value.toUpperCase().trim()
                });
            }
            
            carregando.value = false;
            router.push(`/sessao-approved/${sessaoId.value.toUpperCase().trim()}/${playerId}`);
        } catch (error) {
            mensagemErro.value = 'Erro ao conectar: ' + error.message;
            carregando.value = false;
        }
    });
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
            <div class="text-center mb-16">
                <h1 class="text-7xl md:text-8xl font-cinzel text-amber-100 tracking-widest drop-shadow-[0_0_30px_rgba(217,119,6,0.5)] mb-4">
                    BLOODBORNE
                </h1>
                <div class="flex items-center justify-center gap-4 mb-2">
                    <div class="h-px w-24 bg-gradient-to-r from-transparent to-red-900/50"></div>
                    <p class="text-red-400 font-cinzel tracking-[0.3em] text-sm uppercase">
                        RPG Companion
                    </p>
                    <div class="h-px w-24 bg-gradient-to-l from-transparent to-red-900/50"></div>
                </div>
                <p class="text-gray-600 text-xs mt-4">Fear the Old Blood</p>
            </div>
            
            <!-- Cards de Escolha -->
            <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <!-- Card Mestre -->
                <div @click="mostrarModalMestre = true" 
                     class="group glass-panel p-8 rounded border-2 border-purple-900/50 hover:border-purple-700 transition-all cursor-pointer transform hover:scale-105 hover:shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                    <div class="text-center space-y-6">
                        <div class="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                            👑
                        </div>
                        <h2 class="text-3xl font-cinzel text-purple-300 tracking-wider">MESTRE</h2>
                        <p class="text-gray-400 text-sm leading-relaxed">
                            Crie e gerencie sessões.<br>
                            Controle combates e jogadores.
                        </p>
                        <div class="pt-4">
                            <span class="text-purple-400 text-xs uppercase tracking-widest">Clique para entrar</span>
                        </div>
                    </div>
                </div>

                <!-- Card Jogador -->
                <div @click="abrirModalJogador" 
                     class="group glass-panel p-8 rounded border-2 border-red-900/50 hover:border-red-700 transition-all cursor-pointer transform hover:scale-105 hover:shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                    <div class="text-center space-y-6">
                        <div class="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                            🗡️
                        </div>
                        <h2 class="text-3xl font-cinzel text-red-300 tracking-wider">JOGADOR</h2>
                        <p class="text-gray-400 text-sm leading-relaxed">
                            Entre em uma sessão existente.<br>
                            Conecte-se ao mestre.
                        </p>
                        <div class="pt-4">
                            <span class="text-red-400 text-xs uppercase tracking-widest">Clique para entrar</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Mestre -->
        <div v-if="mostrarModalMestre" 
             @click.self="mostrarModalMestre = false"
             class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div class="glass-panel p-8 rounded-lg max-w-md w-full mx-4 border border-purple-900/50 animate-fadeIn">
                <h3 class="text-2xl font-cinzel text-purple-300 mb-6 text-center">Painel do Mestre</h3>
                <p class="text-gray-400 text-center mb-8">
                    Você será redirecionado para criar ou acessar suas sessões.
                </p>
                <div class="flex gap-4">
                    <button @click="mostrarModalMestre = false" 
                            class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded font-cinzel uppercase tracking-wider transition-colors">
                        Cancelar
                    </button>
                    <button @click="entrarComoMestre" 
                            class="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-3 rounded font-cinzel uppercase tracking-wider transition-colors">
                        Continuar
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal Jogador -->
        <div v-if="mostrarModalJogador" 
             @click.self="mostrarModalJogador = false"
             class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div class="glass-panel p-8 rounded-lg max-w-md w-full mx-4 border border-red-900/50 animate-fadeIn">
                <h3 class="text-2xl font-cinzel text-red-300 mb-2 text-center">Entrar como Jogador</h3>
                <p class="text-gray-500 text-xs text-center mb-6">Conecte-se a uma sessão existente</p>
                
                <!-- Mensagem de Erro -->
                <div v-if="mensagemErro" class="bg-red-900/30 border border-red-700 rounded p-3 mb-4">
                    <p class="text-red-300 text-sm text-center">{{ mensagemErro }}</p>
                </div>

                <div class="space-y-5 mb-6">
                    <!-- ID da Sessão -->
                    <div>
                        <label class="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-cinzel">
                            Código da Sessão
                        </label>
                        <input v-model="sessaoId" 
                               type="text" 
                               maxlength="6"
                               @input="sessaoId = sessaoId.toUpperCase()"
                               class="w-full bg-black/50 border border-gray-700 focus:border-red-600 rounded px-4 py-3 text-gray-200 text-center text-2xl font-mono font-bold outline-none transition-colors placeholder-gray-700"
                               placeholder="ABC123">
                        <p class="text-gray-600 text-xs mt-1 text-center">6 caracteres (fornecido pelo mestre)</p>
                    </div>

                    <!-- Nome do Jogador -->
                    <div>
                        <label class="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-cinzel">
                            Seu Nome
                        </label>
                        <input v-model="nomeHunter" 
                               @keyup.enter="entrarSessao" 
                               type="text" 
                               class="w-full bg-black/50 border border-gray-700 focus:border-red-600 rounded px-4 py-3 text-gray-200 text-center text-xl font-cinzel outline-none transition-colors placeholder-gray-700"
                               placeholder="Digite seu nome">
                    </div>
                </div>
                
                <div class="flex gap-4">
                    <button @click="mostrarModalJogador = false; mensagemErro = ''" 
                            class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded font-cinzel uppercase tracking-wider transition-colors">
                        Cancelar
                    </button>
                    <button @click="entrarSessao" 
                            :disabled="carregando || !nomeHunter.trim() || !sessaoId.trim()"
                            class="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded font-cinzel uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
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