<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ClassSelector from './ClassSelector.vue';
import { updateCharacterData } from '../services/firebase';

const router = useRouter();
const step = ref('class'); // 'class' ou 'details'
const selectedClass = ref(null);
const characterName = ref('');
const characterOrigin = ref('');
const characterBackground = ref('');

const handleClassSelect = (classData) => {
    selectedClass.value = classData;
};

const handleConfirm = async (classData) => {
    step.value = 'details';
    selectedClass.value = classData;
};

const createCharacter = async () => {
    if (!characterName.value.trim()) {
        alert('❌ Digite um nome para o personagem!');
        return;
    }

    if (!selectedClass.value) {
        alert('❌ Selecione uma classe!');
        return;
    }

    const newCharacter = {
        ...selectedClass.value,
        nome: characterName.value,
        origin: characterOrigin.value || 'Desconhecida',
        background: characterBackground.value || 'Nenhum',
        personalidade: '',
        talentos: [],
        resistencias: {},
        pericias: {},
        aprovado: true,
        esperando: false,
        criado_em: new Date().toISOString()
    };

    try {
        const charId = `char_${Date.now()}`;
        await updateCharacterData(charId, newCharacter);
        alert(`✅ ${characterName.value} criado com sucesso!`);
        router.push(`/character/${charId}`);
    } catch (error) {
        console.error('Erro ao criar personagem:', error);
        alert('❌ Erro ao criar personagem. Verifique o console.');
    }
};

const goBack = () => {
    step.value = 'class';
    selectedClass.value = null;
    characterName.value = '';
};
</script>

<template>
    <div v-if="step === 'class'">
        <ClassSelector @select="handleClassSelect" @confirm="handleConfirm" />
    </div>

    <div v-else class="min-h-screen bg-gradient-to-b from-[#1f0505] to-[#0d0d0d] text-gray-300 p-6">
        <div class="max-w-2xl mx-auto">
            <!-- HEADER -->
            <div class="text-center mb-8">
                <h1 class="font-cinzel text-3xl text-amber-600 mb-2">CRIAR PERSONAGEM</h1>
                <p class="text-gray-400">{{ selectedClass.nome }}</p>
            </div>

            <!-- FORM -->
            <div class="bg-[#151515] border-2 border-red-900 rounded-lg p-8 space-y-6">
                <!-- Nome -->
                <div>
                    <label class="block text-sm font-cinzel text-amber-400 mb-2">NOME DO CAÇADOR</label>
                    <input 
                        v-model="characterName"
                        type="text"
                        placeholder="Digite o nome do seu personagem"
                        class="w-full bg-black/50 border border-gray-700 rounded px-4 py-2 text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors"
                    >
                </div>

                <!-- Origem -->
                <div>
                    <label class="block text-sm font-cinzel text-amber-400 mb-2">ORIGEM</label>
                    <input 
                        v-model="characterOrigin"
                        type="text"
                        placeholder="Ex: Noble, Comum, Exilado"
                        class="w-full bg-black/50 border border-gray-700 rounded px-4 py-2 text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors"
                    >
                </div>

                <!-- Antecedente -->
                <div>
                    <label class="block text-sm font-cinzel text-amber-400 mb-2">ANTECEDENTE</label>
                    <input 
                        v-model="characterBackground"
                        type="text"
                        placeholder="Ex: Soldado, Mercador, Aprendiz"
                        class="w-full bg-black/50 border border-gray-700 rounded px-4 py-2 text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors"
                    >
                </div>

                <!-- Preview -->
                <div class="bg-black/40 border border-gray-700 rounded p-4">
                    <h4 class="text-amber-400 font-cinzel text-sm mb-3">PRÉVIA</h4>
                    <div class="space-y-2 text-xs text-gray-400">
                        <p><span class="text-amber-500">Nome:</span> {{ characterName || '(não definido)' }}</p>
                        <p><span class="text-amber-500">Classe:</span> {{ selectedClass.nome }}</p>
                        <p><span class="text-amber-500">HP:</span> {{ selectedClass.hpMax }}</p>
                        <p><span class="text-amber-500">Origem:</span> {{ characterOrigin || '(não definida)' }}</p>
                        <p><span class="text-amber-500">Antecedente:</span> {{ characterBackground || '(não definido)' }}</p>
                    </div>
                </div>

                <!-- Botões -->
                <div class="grid grid-cols-2 gap-4">
                    <button 
                        @click="goBack"
                        class="py-3 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 text-gray-300 font-cinzel rounded transition-all uppercase">
                        ← Voltar
                    </button>
                    <button 
                        @click="createCharacter"
                        class="py-3 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-cinzel rounded transition-all uppercase">
                        ✓ Criar Personagem
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
