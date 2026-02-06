<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['select']);

const classes = {
    gunslinger: {
        nome: '🎯 Gunslinger',
        descricao: 'Mestre das armas de fogo, utilizando bravura e engenharia para realizar tiros impossíveis.',
        hpMax: 24,
        hp_atual: 24,
        classe: 'Gunslinger',
        nivel: 1,
        grit_max: 3,
        grit_atual: 3,
        bonus_prof: 2,
        ca: 12,
        iniciativa: 2,
        deslocamento: 9,
        forca: 10,
        destreza: 16,
        constituicao: 14,
        inteligencia: 12,
        sabedoria: 13,
        carisma: 11,
        equipamentos: [
            { nome: 'Pistola de Mercúrio', dano: '1d8', tipo: 'Balístico' },
            { nome: 'Faca de Combate', dano: '1d6', tipo: 'Cortante' }
        ],
        frascos: 5,
        municao: 10,
        ecos: 50,
        sangue: 3,
        frenesi: 0,
        habilidades: ['Proficiência em Armas de Fogo', 'Armeiro'],
        tiros_especiais: [
            { nome: 'Tiro Desarmante', custo: 1, efeito: 'Alvo solta o item que segura' },
            { nome: 'Tiro Perfurante', custo: 1, efeito: 'Ataca inimigos em linha' }
        ]
    },
    alchemist: {
        nome: '🧪 Alquimista',
        descricao: 'Um cientista de campo que lança bombas e bebe mutagênicos, sem depender de magias tradicionais.',
        hpMax: 22,
        hp_atual: 22,
        classe: 'Alchemist',
        nivel: 1,
        bonus_prof: 2,
        ca: 11,
        iniciativa: 1,
        deslocamento: 9,
        forca: 11,
        destreza: 13,
        constituicao: 15,
        inteligencia: 16,
        sabedoria: 12,
        carisma: 10,
        equipamentos: [
            { nome: 'Bomba Incendiária', dano: '1d10', tipo: 'Fogo' },
            { nome: 'Pocião de Veneno', dano: '1d8', tipo: 'Veneno' }
        ],
        frascos: 8,
        ecos: 50,
        sangue: 2,
        frenesi: 0,
        bombas_restantes: 5,
        habilidades: ['Bombas', 'Fórmulas'],
        descobertas: ['Demolição', 'Arremesso Longo']
    },
    blood_cursed: {
        nome: '🔴 Amaldiçoado pelo Sangue',
        descricao: 'Guerreiros que sacrificam a própria vitalidade para invocar maldições e potenciar seus golpes.',
        hpMax: 25,
        hp_atual: 25,
        classe: 'BloodCursed',
        nivel: 1,
        bonus_prof: 2,
        ca: 13,
        iniciativa: 1,
        deslocamento: 9,
        forca: 15,
        destreza: 12,
        constituicao: 16,
        inteligencia: 11,
        sabedoria: 14,
        carisma: 9,
        equipamentos: [
            { nome: 'Espada Sanguínea', dano: '1d8', tipo: 'Cortante' }
        ],
        frascos: 6,
        ecos: 50,
        sangue: 4,
        frenesi: 0,
        dado_sangue: '1d4',
        habilidades: ['Pacto Carmesim', 'Sentido de Sangue'],
        maldições: ['Maldição da Lentidão']
    },
    guerreiro_ressoante: {
        nome: '⚔️ Guerreiro Ressonante',
        descricao: 'A lâmina é apenas um condutor. A verdadeira arma é a alma que vibra em frequências capazes de estilhaçar ossos.',
        hpMax: 26,
        hp_atual: 26,
        classe: 'GuerreirRessonante',
        nivel: 1,
        bonus_prof: 2,
        ca: 14,
        iniciativa: 2,
        deslocamento: 9,
        forca: 16,
        destreza: 14,
        constituicao: 16,
        inteligencia: 10,
        sabedoria: 13,
        carisma: 11,
        equipamentos: [
            { nome: 'Lâmina Ressonante', dano: '1d8', tipo: 'Cortante' }
        ],
        frascos: 5,
        ecos: 50,
        sangue: 3,
        frenesi: 0,
        ressonancia_max: 2,
        ressonancia_atual: 2,
        habilidades: ['Pontos de Ressonância', 'Sincronia de Alma'],
        disciplinas: ['Disciplina do Caçador']
    },
    gunbreaker: {
        nome: '⚙️ Gunbreaker',
        descricao: 'Especialista na Lâmina-Pistola, misturando cortes de espada com explosões de munição mágica no impacto.',
        hpMax: 26,
        hp_atual: 26,
        classe: 'Gunbreaker',
        nivel: 1,
        bonus_prof: 2,
        ca: 13,
        iniciativa: 2,
        deslocamento: 9,
        forca: 15,
        destreza: 15,
        constituicao: 16,
        inteligencia: 12,
        sabedoria: 12,
        carisma: 11,
        equipamentos: [
            { nome: 'Gunblade', dano: '1d8', tipo: 'Cortante/Balístico' }
        ],
        frascos: 6,
        muniao: 8,
        ecos: 50,
        sangue: 3,
        frenesi: 0,
        cartuchos_max: 2,
        cartuchos_atual: 2,
        habilidades: ['Especialista em Gunblade', 'Municiamento'],
        juramentos: ['Coração de Leão']
    }
};

const selectedClass = ref(null);

const handleSelect = (classKey) => {
    selectedClass.value = classKey;
    emit('select', classes[classKey]);
};
</script>

<template>
    <div class="min-h-screen bg-gradient-to-b from-[#1f0505] to-[#0d0d0d] text-gray-300 p-6">
        <div class="max-w-6xl mx-auto">
            <!-- HEADER -->
            <div class="text-center mb-12">
                <h1 class="font-cinzel text-4xl text-amber-600 mb-2 tracking-widest">ESCOLHA SUA CLASSE</h1>
                <p class="text-gray-400 text-sm">Selecione um arquétipo para começar sua jornada no Sonho</p>
            </div>

            <!-- GRID DE CLASSES -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                    v-for="(classData, key) in classes" 
                    :key="key"
                    @click="handleSelect(key)"
                    class="group relative bg-[#151515] border-2 border-red-900 hover:border-red-700 rounded-lg p-6 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                    :style="{ boxShadow: selectedClass === key ? '0 0 20px rgba(220, 38, 38, 0.6)' : 'none' }">
                    
                    <!-- Background glow -->
                    <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <!-- Conteúdo -->
                    <div class="relative z-10">
                        <h2 class="font-cinzel text-2xl text-amber-400 mb-3">{{ classData.nome }}</h2>
                        <p class="text-sm text-gray-400 mb-4 leading-relaxed min-h-[60px]">
                            {{ classData.descricao }}
                        </p>

                        <!-- Stats Rápidos -->
                        <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
                            <div class="bg-black/40 p-2 rounded border border-gray-700">
                                <p class="text-gray-500">❤️ HP Máx</p>
                                <p class="text-red-400 font-bold">{{ classData.hpMax }}</p>
                            </div>
                            <div class="bg-black/40 p-2 rounded border border-gray-700">
                                <p class="text-gray-500">⚔️ CA</p>
                                <p class="text-amber-400 font-bold">{{ classData.ca }}</p>
                            </div>
                            <div class="bg-black/40 p-2 rounded border border-gray-700">
                                <p class="text-gray-500">✨ Recurso</p>
                                <p class="text-purple-400 font-bold">
                                    {{ key === 'gunslinger' ? 'Grit' : key === 'alchemist' ? 'Bombas' : key === 'blood_cursed' ? 'Sangue' : key === 'guerreiro_ressoante' ? 'Ressonância' : 'Cartuchos' }}
                                </p>
                            </div>
                            <div class="bg-black/40 p-2 rounded border border-gray-700">
                                <p class="text-gray-500">🎲 Deslocamento</p>
                                <p class="text-green-400 font-bold">{{ classData.deslocamento }}m</p>
                            </div>
                        </div>

                        <!-- Botão -->
                        <button 
                            class="w-full py-3 bg-gradient-to-r from-red-900/50 to-red-900/30 hover:from-red-800/70 hover:to-red-800/50 border border-red-700 text-amber-300 font-cinzel rounded transition-all uppercase text-sm tracking-wider"
                            :class="selectedClass === key ? 'ring-2 ring-red-500' : ''">
                            {{ selectedClass === key ? '✓ Selecionado' : 'Escolher' }}
                        </button>
                    </div>
                </button>
            </div>

            <!-- Descrição Detalhada -->
            <div v-if="selectedClass" class="mt-12 bg-[#151515] border-2 border-amber-700 rounded-lg p-8">
                <h3 class="font-cinzel text-2xl text-amber-400 mb-4">{{ classes[selectedClass].nome }}</h3>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <h4 class="text-amber-300 text-sm font-cinzel uppercase mb-3">Atributos</h4>
                        <div class="space-y-1 text-xs text-gray-400">
                            <p><span class="text-amber-500">FOR:</span> {{ classes[selectedClass].forca }}</p>
                            <p><span class="text-amber-500">DES:</span> {{ classes[selectedClass].destreza }}</p>
                            <p><span class="text-amber-500">CON:</span> {{ classes[selectedClass].constituicao }}</p>
                            <p><span class="text-amber-500">INT:</span> {{ classes[selectedClass].inteligencia }}</p>
                            <p><span class="text-amber-500">SAB:</span> {{ classes[selectedClass].sabedoria }}</p>
                            <p><span class="text-amber-500">CAR:</span> {{ classes[selectedClass].carisma }}</p>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-amber-300 text-sm font-cinzel uppercase mb-3">Habilidades Iniciais</h4>
                        <div class="space-y-1 text-xs text-gray-400">
                            <p v-for="(habilidade, idx) in classes[selectedClass].habilidades" :key="idx" class="text-green-400">
                                • {{ habilidade }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Continuar Botão -->
                <button 
                    @click="emit('confirm', classes[selectedClass])"
                    class="w-full py-4 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-cinzel rounded-lg uppercase tracking-widest font-bold transition-all">
                    ▶ Continuar com {{ classes[selectedClass].nome }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
button {
    cursor: pointer;
}
</style>
