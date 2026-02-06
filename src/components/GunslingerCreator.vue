<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  playerName: { type: String, required: true }
});

const emit = defineEmits(['update:modelValue', 'create']);

// Atributos base
const atributos = ref({
  forca: 10,
  destreza: 18,
  constituicao: 14,
  inteligencia: 12,
  sabedoria: 14,
  carisma: 8
});

// Valores derivados
const bonusProficiencia = computed(() => 3); // Nível 5

const modificadores = computed(() => ({
  forca: Math.floor((atributos.value.forca - 10) / 2),
  destreza: Math.floor((atributos.value.destreza - 10) / 2),
  constituicao: Math.floor((atributos.value.constituicao - 10) / 2),
  inteligencia: Math.floor((atributos.value.inteligencia - 10) / 2),
  sabedoria: Math.floor((atributos.value.sabedoria - 10) / 2),
  carisma: Math.floor((atributos.value.carisma - 10) / 2)
}));

const classeArmadura = computed(() => 15); // Base
const iniciativa = computed(() => modificadores.value.destreza);
const hpMax = computed(() => 44); // Nível 5: 5d10 + (CON * 5)

const fechar = () => emit('update:modelValue', false);

const confirmarCriacao = () => {
  const personagemData = {
    // Dados básicos
    nome: props.playerName,
    classe: 'Gunslinger',
    nivel: 5,
    raca: 'Humano (Variante)',
    antecedente: 'Caçador Urbano',
    tendencia: 'Neutro Sombrio',
    
    // Atributos
    ...atributos.value,
    
    // Combate
    ca: classeArmadura.value,
    iniciativa: iniciativa.value,
    deslocamento: 9,
    hp_max: hpMax.value,
    hp_atual: hpMax.value,
    dado_vida: '5d10',
    dados_vida_restantes: 5,
    
    // Bônus de Proficiência
    bonus_proficiencia: bonusProficiencia.value,
    
    // Testes de Resistência
    resistencias: {
      forca: modificadores.value.forca,
      destreza: modificadores.value.destreza + bonusProficiencia.value,
      constituicao: modificadores.value.constituicao,
      inteligencia: modificadores.value.inteligencia,
      sabedoria: modificadores.value.sabedoria + bonusProficiencia.value,
      carisma: modificadores.value.carisma
    },
    
    // Perícias
    pericias: {
      percepcao: modificadores.value.sabedoria + bonusProficiencia.value,
      intuicao: modificadores.value.sabedoria + bonusProficiencia.value,
      furtividade: modificadores.value.destreza + bonusProficiencia.value,
      investigacao: modificadores.value.inteligencia + bonusProficiencia.value,
      acrobacia: modificadores.value.destreza + bonusProficiencia.value
    },
    
    // Armas
    equipamentos: [{
      nome: 'Pistola de Caçador',
      ataque: modificadores.value.destreza + bonusProficiencia.value,
      dano: '1d10+' + modificadores.value.destreza,
      alcance: '9/36m',
      tipo: 'Arma de Fogo',
      propriedades: 'Munição, Recarga, Misfire (1)'
    }],
    
    // Recursos Gunslinger
    grit_max: 2,
    grit_atual: 2,
    municao: 20,
    
    // Habilidades de Classe
    habilidades: [
      'Proficiência em Armas de Fogo',
      'Bravura (Grit)',
      'Ataque Extra (2 ataques)',
      'Tiro Violento',
      'Tiro Perfurante',
      'Tiro Desarmante'
    ],
    
    // Tiros Especiais
    tiros_especiais: [
      { nome: 'Tiro Violento', custo: 1, efeito: '+1 dado de dano' },
      { nome: 'Tiro Perfurante', custo: 1, efeito: 'Linha de inimigos' },
      { nome: 'Tiro Desarmante', custo: 1, efeito: 'Alvo solta item (Teste FOR)' }
    ],
    
    // Talentos
    talentos: ['Atirador Especial'],
    
    // Equipamento adicional
    inventario: [
      '20 balas',
      'Couro Batido',
      'Punhal',
      'Kit de manutenção',
      'Símbolo do Caçador',
      'Pacote de aventureiro'
    ],
    
    // Proficiências e Idiomas
    proficiencias: 'Armas de Fogo, Armas Simples, Armaduras Leves, Ferramentas de Artesão (Armeiro)',
    idiomas: 'Comum, mais um à escolha',
    
    // Marca do Caçador
    marca: {
      nome: 'Marca do Olho do Caçador',
      efeito: 'Reação: disparo quando inimigo erra ataque corpo a corpo',
      custo: '1d4 dano psíquico'
    },
    
    // Personalidade
    personalidade: 'Observador, silencioso. Confia mais na arma do que nas pessoas.',
    
    // Ecos (dinheiro inicial)
    ecos: 100,
    
    // Status
    status: [],
    efeitos: [],
    condicoes: []
  };
  
  emit('create', personagemData);
  fechar();
};

const alterarAtributo = (attr, delta) => {
  const novo = atributos.value[attr] + delta;
  if (novo >= 3 && novo <= 20) {
    atributos.value[attr] = novo;
  }
};
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" 
         @click.self="fechar"
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      
      <div class="gunslinger-panel max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-lg border-2 border-amber-700/50 shadow-[0_0_50px_rgba(217,119,6,0.3)]">
        <!-- Header -->
        <div class="bg-gradient-to-b from-red-950/80 to-black/90 border-b-2 border-amber-700/30 p-6 sticky top-0 z-10">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-4xl font-cinzel text-amber-100 tracking-widest mb-2">
                GUNSLINGER
              </h2>
              <p class="text-red-400 text-sm font-cinzel tracking-wider">Nível 5 • {{ playerName }}</p>
            </div>
            <button @click="fechar" 
                    class="text-gray-500 hover:text-white transition-colors">
              <span class="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
        </div>

        <!-- Conteúdo -->
        <div class="p-6 space-y-6">
          <!-- Instruções -->
          <div class="glass-panel p-4 border-l-4 border-amber-600">
            <p class="text-gray-300 text-sm">
              🎯 <strong class="text-amber-400">Configure os atributos iniciais</strong> do Gunslinger.
              O mestre controlará a progressão de nível durante o jogo.
            </p>
          </div>

          <!-- Grid principal -->
          <div class="grid lg:grid-cols-2 gap-6">
            <!-- Coluna 1: Atributos -->
            <div class="glass-panel p-6">
              <h3 class="text-xl font-cinzel text-amber-300 border-b border-amber-700/30 pb-3 mb-4">
                ATRIBUTOS
              </h3>
              
              <div class="space-y-3">
                <div v-for="(valor, nome) in atributos" :key="nome"
                     class="flex items-center justify-between bg-black/40 p-3 rounded border border-white/10 hover:border-amber-700/50 transition-colors">
                  <div class="flex-1">
                    <span class="text-gray-400 text-sm uppercase tracking-wider font-cinzel">
                      {{ nome }}
                    </span>
                    <span class="ml-3 text-amber-300 text-xs">
                      ({{ modificadores[nome] >= 0 ? '+' : '' }}{{ modificadores[nome] }})
                    </span>
                  </div>
                  <div class="flex items-center gap-3">
                    <button @click="alterarAtributo(nome, -1)"
                            class="w-8 h-8 flex items-center justify-center bg-red-900/30 hover:bg-red-900/50 rounded border border-red-700/50 text-red-300 transition-colors">
                      −
                    </button>
                    <span class="w-12 text-center text-xl font-mono text-white font-bold">
                      {{ valor }}
                    </span>
                    <button @click="alterarAtributo(nome, 1)"
                            class="w-8 h-8 flex items-center justify-center bg-green-900/30 hover:bg-green-900/50 rounded border border-green-700/50 text-green-300 transition-colors">
                      +
                    </button>
                  </div>
                </div>
              </div>

              <!-- Estatísticas Derivadas -->
              <div class="mt-6 pt-6 border-t border-white/10">
                <h4 class="text-sm font-cinzel text-gray-400 uppercase tracking-wider mb-3">
                  Estatísticas de Combate
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-black/40 p-3 rounded border border-white/10">
                    <span class="text-gray-500 text-xs uppercase block mb-1">CA</span>
                    <span class="text-white text-xl font-mono">{{ classeArmadura }}</span>
                  </div>
                  <div class="bg-black/40 p-3 rounded border border-white/10">
                    <span class="text-gray-500 text-xs uppercase block mb-1">Iniciativa</span>
                    <span class="text-white text-xl font-mono">+{{ iniciativa }}</span>
                  </div>
                  <div class="bg-black/40 p-3 rounded border border-white/10">
                    <span class="text-gray-500 text-xs uppercase block mb-1">HP Max</span>
                    <span class="text-red-400 text-xl font-mono">{{ hpMax }}</span>
                  </div>
                  <div class="bg-black/40 p-3 rounded border border-white/10">
                    <span class="text-gray-500 text-xs uppercase block mb-1">Grit</span>
                    <span class="text-amber-400 text-xl font-mono">2</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coluna 2: Habilidades -->
            <div class="space-y-6">
              <!-- Habilidades de Classe -->
              <div class="glass-panel p-6">
                <h3 class="text-xl font-cinzel text-amber-300 border-b border-amber-700/30 pb-3 mb-4">
                  HABILIDADES (NÍVEL 5)
                </h3>
                
                <div class="space-y-3">
                  <div class="ability-card">
                    <h4 class="text-amber-300 font-cinzel text-sm mb-1">⚡ Ataque Extra</h4>
                    <p class="text-gray-400 text-xs">Dois ataques por Ação de Ataque</p>
                  </div>
                  
                  <div class="ability-card">
                    <h4 class="text-amber-300 font-cinzel text-sm mb-1">💎 Bravura (Grit)</h4>
                    <p class="text-gray-400 text-xs">2 pontos • Recupera com crítico ou kill</p>
                  </div>
                  
                  <div class="ability-card">
                    <h4 class="text-amber-300 font-cinzel text-sm mb-1">🎯 Atirador Especial</h4>
                    <p class="text-gray-400 text-xs">Ignora cobertura • -5 ataque para +10 dano</p>
                  </div>
                </div>
              </div>

              <!-- Tiros Especiais -->
              <div class="glass-panel p-6">
                <h3 class="text-xl font-cinzel text-amber-300 border-b border-amber-700/30 pb-3 mb-4">
                  TIROS ESPECIAIS
                </h3>
                
                <div class="space-y-2">
                  <div class="shot-card">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-red-400 font-cinzel text-sm">Tiro Violento</span>
                      <span class="text-amber-500 text-xs">1 Grit</span>
                    </div>
                    <p class="text-gray-400 text-xs">+1 dado de dano no ataque</p>
                  </div>
                  
                  <div class="shot-card">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-red-400 font-cinzel text-sm">Tiro Perfurante</span>
                      <span class="text-amber-500 text-xs">1 Grit</span>
                    </div>
                    <p class="text-gray-400 text-xs">Atinge todos em linha reta</p>
                  </div>
                  
                  <div class="shot-card">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-red-400 font-cinzel text-sm">Tiro Desarmante</span>
                      <span class="text-amber-500 text-xs">1 Grit</span>
                    </div>
                    <p class="text-gray-400 text-xs">Alvo faz Teste de FOR ou solta item</p>
                  </div>
                </div>
              </div>

              <!-- Marca do Caçador -->
              <div class="glass-panel p-6 border-2 border-red-900/50">
                <h3 class="text-xl font-cinzel text-red-400 border-b border-red-700/30 pb-3 mb-4">
                  🩸 MARCA DO CAÇADOR
                </h3>
                <div class="space-y-2">
                  <p class="text-amber-300 text-sm font-cinzel">Marca do Olho do Caçador</p>
                  <p class="text-gray-400 text-xs leading-relaxed">
                    <strong>Reação:</strong> quando um inimigo errar ataque corpo a corpo contra você, pode disparar.
                  </p>
                  <p class="text-red-400 text-xs">
                    <strong>Preço:</strong> sofre 1d4 de dano psíquico
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Botão Confirmar -->
          <div class="flex justify-end gap-4 pt-6 border-t border-white/10">
            <button @click="fechar"
                    class="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-cinzel uppercase tracking-wider transition-colors">
              Cancelar
            </button>
            <button @click="confirmarCriacao"
                    class="px-8 py-3 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-700 hover:to-amber-600 text-white rounded font-cinzel uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-700/50">
              Confirmar Gunslinger
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap');

.gunslinger-panel {
  background: linear-gradient(135deg, rgba(20, 14, 14, 0.98), rgba(10, 5, 5, 0.98));
  backdrop-filter: blur(10px);
}

.glass-panel {
  background: rgba(10, 10, 10, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ability-card {
  background: rgba(139, 0, 0, 0.15);
  border-left: 3px solid rgba(217, 119, 6, 0.6);
  padding: 0.75rem;
  border-radius: 0.25rem;
  transition: all 0.3s;
}

.ability-card:hover {
  background: rgba(139, 0, 0, 0.25);
  border-left-color: rgba(217, 119, 6, 0.9);
}

.shot-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(220, 38, 38, 0.3);
  padding: 0.75rem;
  border-radius: 0.25rem;
  transition: all 0.3s;
}

.shot-card:hover {
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.6);
}

.font-cinzel {
  font-family: 'Cinzel', serif;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
}
</style>
