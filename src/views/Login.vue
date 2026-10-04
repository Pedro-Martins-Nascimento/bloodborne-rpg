<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { checkSessionExists, joinSession, isOfflineMode, setOfflineMode, createCharacter } from '../services/firebase';

const router = useRouter();
const nomeHunter = ref('');
const sessaoId = ref('');
const carregando = ref(false);

// Modo Offline / Firebase
const offlineAtivo = ref(isOfflineMode());
const alternarModo = () => {
    offlineAtivo.value = !offlineAtivo.value;
    setOfflineMode(offlineAtivo.value);
};

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
        mensagemErro.value = 'Digite seu nome de Caçador.';
        return;
    }
    if (!sessaoId.value.trim()) {
        mensagemErro.value = 'Digite o código da sessão (6 letras).';
        return;
    }
    
    carregando.value = true;
    mensagemErro.value = '';
    const sessionCode = sessaoId.value.toUpperCase().trim();

    try {
        const { exists, session } = await checkSessionExists(sessionCode);

        if (!exists) {
            mensagemErro.value = `Sessão "${sessionCode}" não encontrada! Verifique o código com o mestre.`;
            carregando.value = false;
            return;
        }

        if (session && session.ativa === false) {
            mensagemErro.value = 'Esta sessão foi encerrada pelo mestre.';
            carregando.value = false;
            return;
        }

        const { playerId } = await joinSession(sessionCode, nomeHunter.value);
        localStorage.setItem('userId', playerId);

        carregando.value = false;
        mostrarModalJogador.value = false;
        router.push(`/sessao-approved/${sessionCode}/${playerId}`);
    } catch (error) {
        console.error("Erro ao entrar na sessão:", error);
        mensagemErro.value = 'Erro ao conectar: ' + (error.message || 'Falha de comunicação');
        carregando.value = false;
    }
};

// Criar caçador solo de demonstração rápido
const criarCacadorSolo = async (classeKey) => {
    const charId = `char_solo_${Date.now()}`;
    localStorage.setItem('userId', charId);
    
    const defaults = {
        nome: 'Caçador Solitário',
        classe: 'Gunslinger',
        nivel: 5,
        hp_max: 50,
        hp_atual: 50,
        frascos: 3,
        municao: 10,
        sangue: 3,
        frenesi: 0,
        grit_max: 2,
        grit_atual: 2,
        ca: 15,
        iniciativa: 4,
        deslocamento: 9,
        forca: 10,
        destreza: 18,
        constituicao: 14,
        inteligencia: 12,
        sabedoria: 14,
        carisma: 8,
        equipamentos: [
            { nome: 'Pistola de Mercúrio', dano: '1d8', tipo: 'Balístico' },
            { nome: 'Cutelo Serrado', dano: '1d6+4', tipo: 'Cortante' }
        ],
        habilidades: ['Tiros de Truque', 'Armeiro', 'Sharpshooter'],
        aprovado: true,
        esperando: false
    };

    await createCharacter(charId, defaults);
    router.push(`/player/${charId}`);
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <!-- Fundo com animação -->
        <div class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-gradient-to-b from-black via-red-950/20 to-black"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,0,0,0.15),transparent_60%)]"></div>
            <div class="absolute inset-0 bg-fog-texture opacity-20 pointer-events-none"></div>
        </div>
        
        <div class="relative z-10 w-full max-w-5xl">
            <!-- Indicador de Status / Modo Offline -->
            <div class="flex justify-center mb-6">
                <button @click="alternarModo" 
                        class="px-4 py-1.5 rounded-full text-xs font-cinzel tracking-wider flex items-center gap-2 border transition-all shadow-lg"
                        :class="offlineAtivo ? 'bg-amber-950/60 border-amber-600/70 text-amber-300 hover:bg-amber-900/60' : 'bg-red-950/60 border-red-700/60 text-red-300 hover:bg-red-900/60'">
                    <span class="w-2 h-2 rounded-full animate-pulse" :class="offlineAtivo ? 'bg-amber-400' : 'bg-green-400'"></span>
                    <span>{{ offlineAtivo ? 'Modo Local / Offline (Ativo)' : 'Modo Firebase Online' }}</span>
                    <span class="text-[10px] opacity-75 underline ml-1">Alterar</span>
                </button>
            </div>

            <!-- Logo e Título -->
            <div class="text-center mb-8 sm:mb-12">
                <h1 class="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-cinzel text-amber-100 tracking-widest drop-shadow-[0_0_30px_rgba(217,119,6,0.5)] mb-2 sm:mb-4">
                    BLOODBORNE
                </h1>
                <div class="flex items-center justify-center gap-3 mb-2">
                    <div class="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-red-900/70"></div>
                    <p class="text-red-400 font-cinzel tracking-[0.3em] text-xs sm:text-sm uppercase">
                        RPG Companion
                    </p>
                    <div class="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-red-900/70"></div>
                </div>
                <p class="text-gray-500 font-serif italic text-xs sm:text-sm">"Fear the Old Blood"</p>
            </div>
            
            <!-- Cards de Escolha Principais -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto px-2">
                <!-- Card Mestre -->
                <div @click="mostrarModalMestre = true" 
                     class="group glass-panel p-6 rounded-lg border-2 border-purple-900/50 hover:border-purple-600 transition-all cursor-pointer transform hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]">
                    <div class="text-center space-y-3">
                        <div class="text-5xl mb-2 transform group-hover:scale-110 transition-transform">
                            👑
                        </div>
                        <h2 class="text-xl sm:text-2xl font-cinzel text-purple-300 tracking-wider">MESTRE</h2>
                        <p class="text-gray-400 text-xs leading-relaxed min-h-[40px]">
                            Crie sessões, gerencie caçadores, distribua classes e controle o combate de Yharnam.
                        </p>
                        <div class="pt-2">
                            <span class="text-purple-400 text-[10px] uppercase tracking-widest font-cinzel group-hover:text-purple-300">Entrar como Mestre →</span>
                        </div>
                    </div>
                </div>

                <!-- Card Jogador (Entrar em Sessão) -->
                <div @click="abrirModalJogador" 
                     class="group glass-panel p-6 rounded-lg border-2 border-red-900/50 hover:border-red-600 transition-all cursor-pointer transform hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(220,38,38,0.3)]">
                    <div class="text-center space-y-3">
                        <div class="text-5xl mb-2 transform group-hover:scale-110 transition-transform">
                            🗡️
                        </div>
                        <h2 class="text-xl sm:text-2xl font-cinzel text-red-300 tracking-wider">ENTRAR NA SESSÃO</h2>
                        <p class="text-gray-400 text-xs leading-relaxed min-h-[40px]">
                            Conecte-se com o código de 6 caracteres fornecido pelo seu mestre.
                        </p>
                        <div class="pt-2">
                            <span class="text-red-400 text-[10px] uppercase tracking-widest font-cinzel group-hover:text-red-300">Conectar Caçador →</span>
                        </div>
                    </div>
                </div>

                <!-- Card Criar Caçador / Ficha Solo -->
                <div class="group glass-panel p-6 rounded-lg border-2 border-amber-900/50 hover:border-amber-600 transition-all cursor-pointer transform hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] flex flex-col justify-between"
                     @click="router.push('/create')">
                    <div class="text-center space-y-3">
                        <div class="text-5xl mb-2 transform group-hover:scale-110 transition-transform">
                            📜
                        </div>
                        <h2 class="text-xl sm:text-2xl font-cinzel text-amber-300 tracking-wider">CRIAR FICHA</h2>
                        <p class="text-gray-400 text-xs leading-relaxed min-h-[40px]">
                            Monte seu caçador do zero escolhendo entre as 5 classes originais.
                        </p>
                        <div class="pt-2">
                            <span class="text-amber-400 text-[10px] uppercase tracking-widest font-cinzel group-hover:text-amber-300">Criar Personagem →</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rodapé / Acesso Rápido -->
            <div class="mt-8 text-center">
                <button @click="criarCacadorSolo" 
                        class="text-xs text-gray-500 hover:text-amber-300 underline font-cinzel transition-colors">
                    ⚡ Testar Ficha Rápida Demo (Sem Sessão)
                </button>
            </div>
        </div>

        <!-- Modal Mestre -->
        <div v-if="mostrarModalMestre" 
             @click.self="mostrarModalMestre = false"
             class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div class="glass-panel p-6 sm:p-8 rounded-lg max-w-md w-full border border-purple-900/70 shadow-2xl animate-fadeIn">
                <h3 class="text-xl sm:text-2xl font-cinzel text-purple-300 mb-3 text-center">Painel do Mestre</h3>
                <p class="text-gray-400 text-xs sm:text-sm text-center mb-6 leading-relaxed">
                    Você será direcionado para iniciar uma nova caçada ou retomar o controle do sonho.
                </p>
                <div class="flex gap-3">
                    <button @click="mostrarModalMestre = false" 
                            class="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 py-3 rounded font-cinzel uppercase tracking-wider text-xs transition-colors">
                        Cancelar
                    </button>
                    <button @click="entrarComoMestre" 
                            class="flex-1 bg-purple-800 hover:bg-purple-700 text-white py-3 rounded font-cinzel uppercase tracking-wider text-xs transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                        Continuar
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal Jogador -->
        <div v-if="mostrarModalJogador" 
             @click.self="mostrarModalJogador = false"
             class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div class="glass-panel p-6 sm:p-8 rounded-lg max-w-md w-full border border-red-900/70 shadow-2xl animate-fadeIn">
                <h3 class="text-xl sm:text-2xl font-cinzel text-red-300 mb-1 text-center">Entrar na Sessão</h3>
                <p class="text-gray-500 text-xs text-center mb-4 font-cinzel">Insira os dados da caçada</p>
                
                <!-- Mensagem de Erro -->
                <div v-if="mensagemErro" class="bg-red-950/60 border border-red-700 rounded p-3 mb-4 animate-shake">
                    <p class="text-red-300 text-xs sm:text-sm text-center">{{ mensagemErro }}</p>
                </div>

                <div class="space-y-4 mb-6">
                    <!-- ID da Sessão -->
                    <div>
                        <label class="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-cinzel">
                            Código da Sessão
                        </label>
                        <input v-model="sessaoId" 
                               type="text" 
                               maxlength="6"
                               placeholder="EX: ABC123"
                               @input="sessaoId = sessaoId.toUpperCase()"
                               class="w-full bg-black/60 border border-gray-700 focus:border-red-600 rounded px-4 py-3 text-gray-100 text-center text-2xl font-mono font-bold outline-none transition-colors placeholder-gray-700 tracking-widest">
                        <p class="text-gray-600 text-[10px] mt-1 text-center font-mono">6 caracteres fornecidos pelo mestre</p>
                    </div>

                    <!-- Nome do Jogador -->
                    <div>
                        <label class="block text-gray-400 text-xs uppercase tracking-widest mb-2 font-cinzel">
                            Nome do seu Caçador
                        </label>
                        <input v-model="nomeHunter" 
                               @keyup.enter="entrarSessao" 
                               type="text" 
                               placeholder="Ex: Eileen, Gehrman..."
                               class="w-full bg-black/60 border border-gray-700 focus:border-red-600 rounded px-4 py-3 text-gray-100 text-center text-base font-cinzel outline-none transition-colors placeholder-gray-700">
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button @click="mostrarModalJogador = false; mensagemErro = ''" 
                            class="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 py-3 rounded font-cinzel uppercase tracking-wider text-xs transition-colors">
                        Cancelar
                    </button>
                    <button @click="entrarSessao" 
                            :disabled="carregando || !nomeHunter.trim() || !sessaoId.trim()"
                            class="flex-1 bg-red-800 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-white py-3 rounded font-cinzel uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                        <span v-if="carregando" class="animate-spin text-sm">⏳</span>
                        <span>{{ carregando ? 'Conectando...' : 'Entrar na Caça' }}</span>
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
        transform: scale(0.96) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.25s ease-out;
}
</style>