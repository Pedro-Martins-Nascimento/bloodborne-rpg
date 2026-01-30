<template>
  <div class="fixed inset-0 z-50 bg-black bg-opacity-70" v-if="isOpen" @click.self="close">
    <!-- PERGAMINHO ANTIGO -->
    <div class="fixed right-0 top-0 h-full w-full sm:w-96 flex flex-col overflow-hidden shadow-2xl" style="background: linear-gradient(135deg, #d4a574 0%, #c9a06a 50%, #a68860 100%);">
      <!-- Textura de pergaminho antigo -->
      <div class="absolute inset-0 opacity-30" style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><filter id=%22noise%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22/></filter><rect width=%22100%22 height=%22100%22 fill=%22%23000%22 filter=%22url(%23noise)%22/></svg>'); background-size: 200px 200px;"></div>

      <!-- Efeito de queimadura/mancha -->
      <div class="absolute top-0 right-0 w-32 h-32 opacity-20" style="background: radial-gradient(circle, rgba(139, 69, 19, 0.5), transparent); filter: blur(20px);"></div>
      <div class="absolute bottom-12 left-0 w-24 h-24 opacity-15" style="background: radial-gradient(circle, rgba(180, 82, 45, 0.5), transparent); filter: blur(15px);"></div>

      <!-- Bordas rasgadas -->
      <div class="absolute top-0 left-0 w-full h-1" style="background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%); clip-path: polygon(0 0, 2% 40%, 5% 20%, 8% 50%, 12% 30%, 15% 60%, 18% 25%, 22% 55%, 25% 35%, 28% 60%, 32% 20%, 35% 50%, 38% 30%, 42% 65%, 45% 35%, 48% 55%, 52% 25%, 55% 60%, 58% 30%, 62% 50%, 65% 20%, 68% 55%, 72% 35%, 75% 60%, 78% 25%, 82% 50%, 85% 30%, 88% 60%, 92% 20%, 95% 50%, 98% 30%, 100% 50%, 100% 0);"></div>

      <!-- Header com estilo pergaminho -->
      <div class="p-4 sm:p-6 border-b-2 flex items-center justify-between relative z-10" style="border-color: rgba(139, 69, 19, 0.6); background: rgba(255, 255, 255, 0.05);">
        <h2 class="font-cinzel text-lg sm:text-xl text-amber-900 tracking-widest drop-shadow-lg" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">HUNTER'S ARCHIVE</h2>
        <button @click="close" class="text-amber-900 hover:text-amber-800 transition-colors drop-shadow">
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <!-- Topic Tabs estilo pergaminho -->
      <div class="flex flex-wrap gap-2 p-3 sm:p-4 border-b-2 bg-opacity-30" style="border-color: rgba(139, 69, 19, 0.5); background: rgba(255, 255, 255, 0.03);">
        <button
          v-for="topic in topics"
          :key="topic.id"
          @click="selectedTopic = topic.id"
          :class="[
            'px-3 py-2 text-xs sm:text-sm font-cinzel tracking-wider transition-all',
            selectedTopic === topic.id
              ? 'text-amber-900 drop-shadow'
              : 'text-amber-800/60 hover:text-amber-700'
          ]"
          :style="selectedTopic === topic.id ? 'border-bottom: 2px solid rgba(120, 63, 4, 0.6)' : 'border-bottom: 1px solid rgba(139, 69, 19, 0.2)'"
        >
          <span class="material-symbols-outlined text-lg align-middle mr-1">{{ topic.icon }}</span>
          {{ topic.label }}
        </button>
      </div>

      <!-- Content Area estilo pergaminho -->
      <div class="flex-1 overflow-y-auto p-3 sm:p-4 relative z-10" style="background: rgba(255, 255, 255, 0.02);">
        <div v-if="currentTopicData" class="space-y-4">
          <!-- Topic Title -->
          <div class="border-b-2 pb-3" style="border-color: rgba(139, 69, 19, 0.4);">
            <h3 class="font-playfair text-lg sm:text-xl text-amber-900 italic mb-2 drop-shadow" style="text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.2);">{{ currentTopicData.title }}</h3>
            <p class="font-inter text-xs sm:text-sm text-amber-900/80 leading-relaxed">{{ currentTopicData.description }}</p>
          </div>

          <!-- Topic Content -->
          <div class="space-y-3">
            <div
              v-for="(section, idx) in currentTopicData.sections"
              :key="idx"
              class="rounded p-3 transition-all hover:shadow-md"
              style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(139, 69, 19, 0.3); backdrop-filter: blur(5px);"
            >
              <h4 class="font-cinzel text-sm text-amber-900 tracking-wider mb-2 drop-shadow">{{ section.title }}</h4>
              <p class="font-inter text-xs sm:text-sm text-amber-900/85 leading-relaxed">{{ section.content }}</p>
              <div v-if="section.effect" class="mt-2 text-xs text-amber-800 border-l-2 pl-2" style="border-color: rgba(139, 69, 19, 0.5);">
                <span class="font-cinzel font-bold">EFEITO:</span> {{ section.effect }}
              </div>
            </div>
          </div>

          <!-- Tips Section -->
          <div v-if="currentTopicData.tips" class="rounded p-3 mt-4" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06)); border: 1px solid rgba(139, 69, 19, 0.4);">
            <h4 class="font-cinzel text-sm text-amber-900 tracking-wider mb-2 drop-shadow">💡 DICA DO CAÇADOR</h4>
            <p class="font-inter text-xs sm:text-sm text-amber-900/80 leading-relaxed italic">{{ currentTopicData.tips }}</p>
          </div>
        </div>
      </div>

      <!-- Footer estilo pergaminho -->
      <div class="p-3 sm:p-4 border-t-2 text-xs text-amber-900/70 text-center font-playfair italic relative z-10" style="border-color: rgba(139, 69, 19, 0.4); background: rgba(255, 255, 255, 0.02);">
        <p>O conhecimento antigo do Velho Caçador</p>
      </div>

      <!-- Rasgos no canto inferior -->
      <div class="absolute bottom-0 right-0 w-16 h-16 opacity-20" style="background: linear-gradient(-135deg, rgba(0,0,0,0.5) 0%, transparent 70%); clip-path: polygon(100% 100%, 100% 50%, 70% 100%);"></div>
      <div class="absolute bottom-0 left-0 w-12 h-12 opacity-15" style="background: linear-gradient(45deg, rgba(0,0,0,0.4) 0%, transparent 70%); clip-path: polygon(0 100%, 0 60%, 60% 100%);"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const isOpen = defineModel('open', { type: Boolean, default: false })
const selectedTopic = ref('beasts')

const topics = [
  { id: 'beasts', label: 'BEASTS', icon: 'pets' },
  { id: 'insight', label: 'INSIGHT', icon: 'visibility' },
  { id: 'scaling', label: 'SCALING', icon: 'trending_up' },
  { id: 'combat', label: 'COMBAT', icon: 'sports_kabaddi' }
]

const archiveData = {
  beasts: {
    title: 'Beasts & Blood',
    description: 'The scourge of Yharnam and the mechanics of beast encounters',
    sections: [
      {
        title: 'Blood Echoes',
        content: 'Currency and essence of defeated foes. Collected from slain beasts, they grant experience and blood ink. Loss of blood echoes upon death is permanent unless recovered from your remains.',
        effect: 'Lost on death, recoverable at your bloodstain'
      },
      {
        title: 'Beast Status',
        content: 'Common affliction causing rapid HP loss and erratic behavior. High insight increases susceptibility. Can be cured with antidotes or specific items.',
        effect: 'Rapid HP drain during status duration'
      },
      {
        title: 'Visceral Attacks',
        content: 'Devastating close-range counter attacks performed after parrying an enemy or breaking their poise. Deal massive damage and restore significant HP.',
        effect: '+30% HP recovery on successful execution'
      }
    ],
    tips: 'Observe beast patterns before engagement. Poise breaks allow visceral attacks for devastating damage.'
  },
  insight: {
    title: 'Insight & Arcane Knowledge',
    description: 'The mysterious force that reveals hidden truths and opens forbidden paths',
    sections: [
      {
        title: 'Insight Mechanic',
        content: 'A hidden stat measuring your understanding of cosmic horrors. Increases item discovery and reveals hidden enemies. Excessive insight causes frenzy and madness.',
        effect: '+10% item discovery per 5 insight'
      },
      {
        title: 'Frenzy Susceptibility',
        content: 'Accumulated by witnessing eldritch horrors. Once maxed, triggers frenzy status causing rapid health loss. Can be temporary (reduced over time) or permanent until cured.',
        effect: 'Massive instant HP loss when status triggers'
      },
      {
        title: 'Discovery',
        content: 'Increased by higher insight values. Affects drop rates of rare items and materials from defeated enemies. Higher insight = better loot chance.',
        effect: 'Scales with current insight value'
      }
    ],
    tips: 'Balance insight gain with frenzy management. Use sedatives to reduce temporary frenzy buildup.'
  },
  scaling: {
    title: 'Attribute Scaling',
    description: 'How your attributes amplify weapon damage and ability effectiveness',
    sections: [
      {
        title: 'Strength (Vit)',
        content: 'Primary attribute for melee weapons. High strength increases carry capacity, poise, and physical damage. Essential for heavy weapons.',
        effect: 'Weapon scaling: E→D→C→B→A'
      },
      {
        title: 'Dexterity (Des)',
        content: 'Enhances speed, ranged weapon damage, and casting speed. High dexterity reduces item use time and increases critical damage.',
        effect: 'Critical damage bonus increases with level'
      },
      {
        title: 'Arcane (Arc)',
        content: 'Governs magic damage, item discovery, and resistance to arcane attacks. High arcane unlocks powerful spells and increases healing effectiveness.',
        effect: 'Item discovery +2.6 per point'
      },
      {
        title: 'Bloodtinge (Sng)',
        content: 'Special stat for blood-based attacks and weapons. Determines effectiveness of blood weapons and blood spells.',
        effect: 'Blood weapon scaling multiplier'
      }
    ],
    tips: 'Weapons show scaling letter grades. Match your build stats with your weapons for optimal damage.'
  },
  combat: {
    title: 'Combat Fundamentals',
    description: 'Core mechanics governing battles and survival in Yharnam',
    sections: [
      {
        title: 'Stamina Management',
        content: 'Every action consumes stamina: attacks, dodges, sprinting. Stamina regenerates slowly. Running out leaves you vulnerable. Poise helps defend while stamina recovers.',
        effect: 'No stamina = vulnerable period'
      },
      {
        title: 'Poise & Defense',
        content: 'Poise represents physical resilience. High poise lets you absorb hits while attacking. Defense stat reduces incoming damage. Armor affects both.',
        effect: 'Poise breaks allow visceral attacks'
      },
      {
        title: 'Regain Mechanic',
        content: 'Unique Bloodborne feature: attacking after taking damage restores some lost HP within a short window. Aggressive play is rewarded with survival.',
        effect: 'Reclaim 10-30% damage taken within 5 seconds'
      },
      {
        title: 'Rally System',
        content: 'Cooperative play mechanic. When a host summons help, all cooperators work together. Defeat common enemies to strengthen the group.',
        effect: 'Collective victory grants rewards'
      }
    ],
    tips: 'Master stamina economy. Use regain mechanic aggressively but carefully. Dodge at the right moment for i-frames.'
  }
}

const currentTopicData = computed(() => archiveData[selectedTopic.value])

const close = () => {
  isOpen.value = false
}
</script>

<style scoped>
/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(127, 29, 29, 0.6);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(127, 29, 29, 0.8);
}

/* Smooth transitions */
button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.95);
}
</style>
