<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCharacter, subscribeToCharacter } from '../services/firebase';

const router = useRouter();
const nomeHunter = ref('');
const carregando = ref(false);

const entrarComoMestre = () => router.push('/mestre');

const entrarComoJogador = () => {
    if (!nomeHunter.value) return;
    carregando.value = true;
    const id = nomeHunter.value.toLowerCase().trim().replace(/\s/g, '');
    
    subscribeToCharacter(id, (data) => {
        if (!data) {
            // CRIA APENAS O NOME E O STATUS DE ESPERA
            // Nenhuma ficha é criada aqui!
            createCharacter(id, {
                nome: nomeHunter.value, 
                esperando: true, // <--- O segredo está aqui
                status: []
            });
        }
        carregando.value = false;
        router.push(`/player/${id}`);
    });
};
</script>

<template>
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
        <!-- Fundo -->
        <div class="absolute inset-0 z-0 bg-[url('https://wallpapers.com/images/hd/bloodborne-phone-hunter-silhouette-red-moon-q4k7d5k7d5k7d5k7.jpg')] bg-cover bg-center opacity-30 grayscale-[50%]"></div>
        
        <div class="relative z-10 w-full max-w-md flex flex-col items-center text-center">
            
            <!-- Título Centralizado -->
            <h1 class="text-6xl font-gothic text-blood font-bold tracking-tighter drop-shadow-[0_0_15px_rgba(138,11,11,0.8)] mb-2 w-full">
                BLOODBORNE
            </h1>
            <p class="text-gold-dim font-gothic tracking-[0.4em] text-xs uppercase border-t border-gold-dim/30 pt-2 mb-12 inline-block">
                Tabletop Companion
            </p>
            
            <!-- Caixa de Login -->
            <div class="w-full bg-black/60 backdrop-blur-md p-8 border border-gray-800 shadow-2xl rounded">
                <div class="space-y-6">
                    <div>
                        <label class="block text-gold-dim text-xs uppercase tracking-widest mb-2">Quem é você?</label>
                        <input v-model="nomeHunter" @keyup.enter="entrarComoJogador" type="text" 
                               class="w-full bg-black/50 border-b border-gray-600 text-gray-200 text-center text-xl font-gothic py-2 focus:border-blood focus:outline-none transition-colors placeholder-gray-700"
                               placeholder="Seu Nome">
                    </div>
                    
                    <button @click="entrarComoJogador" :disabled="carregando"
                            class="w-full bg-blood hover:bg-red-700 text-white py-4 font-gothic text-xl uppercase tracking-widest shadow-lg transition-all border border-white/10">
                        {{ carregando ? 'Conectando...' : 'Entrar no Sonho' }}
                    </button>
                </div>
            </div>

            <div class="mt-8">
                <button @click="entrarComoMestre" class="text-gray-600 hover:text-gold-dim text-xs font-gothic tracking-widest uppercase">
                    Acessar como Mestre
                </button>
            </div>
        </div>
    </div>
</template>