<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createSession } from '../services/firebase';

const router = useRouter();
const sessaoId = ref(null);
const carregando = ref(false);
const mestrado = 'mestre'; // ID do mestre (pode ser dinâmico depois)

const criarSessao = async () => {
    carregando.value = true;
    try {
        const id = await createSession(mestrado, {
            nome_mestre: 'Mestre Bloodborne',
            jogadores_conectados: 0
        });
        sessaoId.value = id;
    } catch (error) {
        alert('Erro ao criar sessão: ' + error.message);
    }
    carregando.value = false;
};

const irParaMestre = () => {
    if (sessaoId.value) {
        router.push(`/mestre/${sessaoId.value}`);
    }
};

const copiarId = () => {
    navigator.clipboard.writeText(sessaoId.value);
    alert('ID copiado: ' + sessaoId.value);
};
</script>

<template>
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <div class="relative z-10 w-full max-w-md flex flex-col items-center text-center">
            
            <h1 class="text-5xl font-gothic text-blood font-bold mb-8">Criar Sessão</h1>

            <div v-if="!sessaoId" class="w-full bg-black/60 border border-gray-800 p-8 rounded">
                <p class="text-gray-400 mb-6">Crie uma nova sessão para começar sua campanha</p>
                <button 
                    @click="criarSessao"
                    :disabled="carregando"
                    class="w-full bg-blood hover:bg-red-700 text-white font-gothic py-3 rounded uppercase text-lg"
                >
                    {{ carregando ? 'Criando...' : '🩸 Criar Sessão' }}
                </button>
                <router-link to="/" class="text-xs text-gray-500 hover:text-white mt-4 block">Voltar</router-link>
            </div>

            <div v-else class="w-full bg-black/60 border border-gold p-8 rounded">
                <h2 class="text-xl text-gold mb-4">Sessão Criada! 🎭</h2>
                
                <div class="bg-black/80 p-6 rounded border border-gray-700 mb-6">
                    <p class="text-gray-400 text-sm mb-2">ID da Sessão:</p>
                    <p class="text-4xl font-mono font-bold text-gold tracking-widest">{{ sessaoId }}</p>
                </div>

                <p class="text-sm text-gray-300 mb-6">Compartilhe este ID com seus jogadores para que eles entrem na sessão</p>

                <div class="space-y-3">
                    <button 
                        @click="copiarId"
                        class="w-full bg-gold/20 hover:bg-gold/30 text-gold py-2 rounded uppercase text-sm border border-gold/50"
                    >
                        📋 Copiar ID
                    </button>
                    <button 
                        @click="irParaMestre"
                        class="w-full bg-blood hover:bg-red-700 text-white font-gothic py-3 rounded uppercase text-lg"
                    >
                        ➜ Ir para Painel
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
