<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createSession } from '../services/firebase';

const router = useRouter();
const sessaoId = ref(null);
const carregando = ref(false);
const copiado = ref(false);
const mestrado = 'mestre';

const criarSessao = async () => {
    carregando.value = true;
    try {
        // Garantir que o userId do mestre está salvo
        if (!localStorage.getItem('userId') || !localStorage.getItem('userId').startsWith('mestre_')) {
            const mestreId = 'mestre_' + Date.now();
            localStorage.setItem('userId', mestreId);
        }
        
        const id = await createSession(mestrado, {
            nome_mestre: 'Mestre Bloodborne',
            jogadores_conectados: 0
        });
        sessaoId.value = id;
    } catch (error) {
        console.error('Erro ao criar sessão:', error);
    }
    carregando.value = false;
};

const irParaMestre = () => {
    if (sessaoId.value) {
        router.push(`/mestre/${sessaoId.value}`);
    }
};

const copiarId = async () => {
    try {
        await navigator.clipboard.writeText(sessaoId.value);
        copiado.value = true;
        setTimeout(() => copiado.value = false, 2000);
    } catch (error) {
        console.error('Erro ao copiar:', error);
    }
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <!-- Fundo Bloodborne -->
        <div class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-gradient-to-b from-black via-red-950/15 to-black"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,0,0,0.08),transparent_60%)]"></div>
            <!-- Névoa -->
            <div class="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-red-950/20 to-transparent"></div>
        </div>

        <div class="relative z-10 w-full max-w-2xl">
            <!-- Estado: Antes de criar -->
            <div v-if="!sessaoId" class="text-center">
                <div class="mb-12">
                    <h1 class="text-6xl font-cinzel text-amber-100 tracking-widest mb-4 drop-shadow-[0_0_30px_rgba(217,119,6,0.4)]">
                        PAINEL DO MESTRE
                    </h1>
                    <div class="flex items-center justify-center gap-4">
                        <div class="h-px w-16 bg-gradient-to-r from-transparent to-red-900/50"></div>
                        <p class="text-red-400 text-xs uppercase tracking-widest font-cinzel">Criar Nova Sessão</p>
                        <div class="h-px w-16 bg-gradient-to-l from-transparent to-red-900/50"></div>
                    </div>
                </div>

                <div class="glass-panel p-10 rounded-lg border-2 border-red-900/50 shadow-2xl">
                    <div class="text-7xl mb-8">👑</div>
                    <p class="text-gray-400 mb-8 leading-relaxed">
                        Crie uma nova sessão e receba um código único.<br>
                        Compartilhe-o com seus jogadores para iniciarem a aventura.
                    </p>
                    
                    <button 
                        @click="criarSessao"
                        :disabled="carregando"
                        class="w-full bg-red-800 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-amber-100 font-cinzel py-4 rounded-lg uppercase text-lg tracking-wider transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(139,0,0,0.5)] hover:shadow-[0_0_50px_rgba(139,0,0,0.7)]"
                    >
                        <span v-if="carregando" class="animate-spin text-2xl">⏳</span>
                        <span v-else class="text-2xl">🩸</span>
                        <span>{{ carregando ? 'Criando Sessão...' : 'Iniciar Caçada' }}</span>
                    </button>

                    <router-link to="/" class="inline-block mt-6 text-xs text-gray-600 hover:text-red-400 transition-colors uppercase tracking-wider font-cinzel">
                        ← Voltar ao Início
                    </router-link>
                </div>
            </div>

            <!-- Estado: Sessão Criada -->
            <div v-else class="text-center animate-fadeIn">
                <div class="mb-8">
                    <div class="text-6xl mb-4 animate-bounce">🩸</div>
                    <h2 class="text-4xl font-cinzel text-amber-100 tracking-wider mb-2 drop-shadow-[0_0_20px_rgba(217,119,6,0.5)]">Caçada Iniciada!</h2>
                    <p class="text-gray-500 text-sm font-cinzel">A noite de caça começou</p>
                </div>

                <div class="glass-panel p-8 rounded-lg border-2 border-amber-700/50 mb-6 relative overflow-hidden shadow-[0_0_50px_rgba(217,119,6,0.3)]">
                    <!-- Efeito de brilho -->
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer"></div>
                    
                    <div class="relative">
                        <p class="text-gray-500 text-xs uppercase tracking-widest mb-3 font-cinzel">Código da Sessão</p>
                        <div class="bg-black/60 py-6 px-8 rounded border border-amber-900/50 mb-4 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-amber-900/0 via-amber-500/10 to-amber-900/0"></div>
                            <p class="text-5xl md:text-6xl font-mono font-bold text-amber-300 tracking-[0.3em] select-all relative z-10">
                                {{ sessaoId }}
                            </p>
                        </div>
                        
                        <div class="bg-red-900/20 border border-red-700/50 rounded p-4 mb-4">
                            <p class="text-red-300 text-sm font-cinzel">
                                🔥 Compartilhe este código com seus caçadores
                            </p>
                        </div>

                        <button 
                            @click="copiarId"
                            class="w-full bg-amber-900/30 hover:bg-amber-800/40 border-2 border-amber-700/50 hover:border-amber-600 text-amber-300 py-3 rounded font-cinzel uppercase text-sm tracking-wider transition-all mb-3 flex items-center justify-center gap-2"
                        >
                            <span class="text-xl">{{ copiado ? '✓' : '📋' }}</span>
                            <span>{{ copiado ? 'Código Copiado!' : 'Copiar Código' }}</span>
                        </button>
                    </div>
                </div>

                <button 
                    @click="irParaMestre"
                    class="w-full bg-red-800 hover:bg-red-700 text-amber-100 font-cinzel py-5 rounded-lg uppercase text-xl tracking-wider transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(139,0,0,0.6)] hover:shadow-[0_0_60px_rgba(139,0,0,0.8)]"
                >
                    <span class="text-2xl">⚔️</span>
                    <span>Entrar no Painel de Controle</span>
                    <span class="text-2xl">→</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
}

.animate-shimmer {
    animation: shimmer 3s infinite;
}

.glass-panel {
    background: linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(26, 26, 26, 0.6) 100%);
    backdrop-filter: blur(10px);
}

button:disabled {
    cursor: not-allowed;
}
</style>