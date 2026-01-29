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

const entrarComoMestre = () => router.push('/sessao');

const entrarSessao = async () => {
    if (!nomeHunter.value || !sessaoId.value) {
        alert('Preencha nome e ID da sessão');
        return;
    }
    carregando.value = true;
    
    // Verificar se a sessão existe
    getSession(sessaoId.value, async (session) => {
        if (!session) {
            alert('Sessão não encontrada!');
            carregando.value = false;
            return;
        }

        const playerId = `${sessaoId.value}_${nomeHunter.value.toLowerCase().trim().replace(/\s/g, '')}`;
        const charRef = dbRef(db, `sessoes/${sessaoId.value}/personagens/${playerId}`);
        
        try {
            // Verifica se o personagem JÁ EXISTE
            const snapshot = await get(charRef);
            
            if (!snapshot.exists()) {
                // SÓ REGISTRA - SEM FICHA, JÁ ENTRA NA SALA
                await set(charRef, {
                    nome: nomeHunter.value,
                    esperando: true,
                    sessaoId: sessaoId.value
                });
                console.log('Jogador entrou na sala:', playerId);
            } else {
                console.log('Jogador já estava na sala:', playerId);
            }
            
            carregando.value = false;
            // ✅ Já entra direto na sala (ApprovedLobby)
            router.push(`/sessao-approved/${sessaoId.value}/${playerId}`);
        } catch (error) {
            alert('Erro ao entrar na sessão: ' + error.message);
            carregando.value = false;
        }
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
                    <!-- Opção 1: Mestre -->
                    <div class="space-y-3">
                        <p class="text-gold-dim text-xs uppercase tracking-widest font-gothic">Você é o Mestre?</p>
                        <button @click="entrarComoMestre" class="w-full bg-purple-900 hover:bg-purple-800 text-white py-4 font-gothic text-lg uppercase tracking-widest shadow-lg transition-all border border-purple-700/50"
                        >
                            👑 Criar/Acessar Sessão
                        </button>
                    </div>

                    <div class="border-t border-gray-700 my-6"></div>

                    <!-- Opção 2: Jogador -->
                    <div class="space-y-4">
                        <p class="text-gold-dim text-xs uppercase tracking-widest font-gothic">Você é um Jogador?</p>
                        
                        <div>
                            <label class="block text-gray-400 text-xs uppercase tracking-widest mb-2">ID da Sessão</label>
                            <input v-model="sessaoId" type="text" 
                                   class="w-full bg-black/50 border-b border-gray-600 text-gray-200 text-center text-2xl font-mono font-bold py-2 focus:border-blood focus:outline-none transition-colors placeholder-gray-700 uppercase"
                                   placeholder="ABC123">
                        </div>

                        <div>
                            <label class="block text-gray-400 text-xs uppercase tracking-widest mb-2">Seu Nome</label>
                            <input v-model="nomeHunter" @keyup.enter="entrarSessao" type="text" 
                                   class="w-full bg-black/50 border-b border-gray-600 text-gray-200 text-center text-xl font-gothic py-2 focus:border-blood focus:outline-none transition-colors placeholder-gray-700"
                                   placeholder="Seu Nome">
                        </div>
                        
                        <button @click="entrarSessao" :disabled="carregando || !nomeHunter || !sessaoId"
                                class="w-full bg-blood hover:bg-red-700 text-white py-4 font-gothic text-lg uppercase tracking-widest shadow-lg transition-all border border-white/10 disabled:opacity-50"
                        >
                            {{ carregando ? 'Conectando...' : 'Entrar na Sessão' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>