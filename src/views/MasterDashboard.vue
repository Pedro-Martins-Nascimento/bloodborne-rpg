<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { subscribeToAllCharacters, updateCharacterData, subscribeToSessionCharacters, updateSessionCharacter, removeSessionCharacter, removeCharacter, removeSession } from '../services/firebase';
import { getDatabase, ref as dbRef, onDisconnect, update as fbUpdate, set } from 'firebase/database';
import { getApp } from 'firebase/app';
import GunslingerCreator from '../components/GunslingerCreator.vue';

const route = useRoute();
const router = useRouter();
const sessionId = route.params.sessionId; // ID da sessão (se existir)
const userId = ref(localStorage.getItem('userId') || 'mestre_' + Date.now());

// Garantir que o userId do mestre está salvo
if (!localStorage.getItem('userId') || !localStorage.getItem('userId').startsWith('mestre_')) {
    const mestreId = 'mestre_' + Date.now();
    localStorage.setItem('userId', mestreId);
    userId.value = mestreId;
}

const isMestre = computed(() => true); // No MasterDashboard, sempre é mestre
const players = ref({});
const selectedPlayer = ref(null); // Jogador selecionado para editar
const showWeaponForm = ref(false); // Mostrar formulário de arma
const newWeapon = ref({ nome: '', dano: '', tipo: '' }); // Nova arma
const searchFilter = ref(''); // Filtro de pesquisa
const showGunslingerCreator = ref(false); // Modal do Gunslinger
const currentGunslingerPlayer = ref(null); // Jogador que receberá o Gunslinger
const showClassSelector = ref(false); // Modal de seleção de classe
const showStatusEditor = ref(false); // Modal de edição de status
const playerToAssignClass = ref(null); // ID do jogador sendo atribuído à classe
const classeSelecionada = ref(null); // Classe selecionada temporariamente
const statusTemporario = ref({
    forca: 10,
    destreza: 10,
    constituicao: 10,
    inteligencia: 10,
    sabedoria: 10,
    carisma: 10
});
const jogadorEmEdicao = ref(null); // Jogador cujos atributos estão sendo editados
const db = getDatabase(getApp());
let beforeUnloadHandler = null;
let heartbeatTimer = null;

// Classes disponíveis
const classes = {
    gunslinger: {
        nome: '🎯 Gunslinger',
        descricao: 'O Atirador de Elite. Especialista em armas de fogo e tiros de precisão. Forasteiro (Intuição, Persuasão). Perícias: Acrobacia, Furtividade. | Mecânica: Pontos de Bravura (Grit) = modificador de Sabedoria. Gaste 1 para Tiros de Truque: Desarme ou Queda (Prone). | Nível 4: Sharpshooter (-5 acerto/+10 dano). | Nível 5: Ataque Extra (2x), dano enorme. Risco: 1-2 no dado encrava a arma.',
        origin: 'Humano (Variante)',
        background: 'Forasteiro',
        antecedente: 'Forasteiro',
        background_feature: 'Vantagem em testes de INT para não ser enganado por superstições locais',
        talentos: ['Atirador Especial', 'Atirador de Elite'],
        hp_max: 50,
        hp_atual: 50,
        classe: 'Gunslinger',
        nivel: 5,
        grit_max: 2,
        grit_atual: 2,
        bonus_prof: 3,
        ca: 15,
        iniciativa: 4,
        deslocamento: 9,
        forca: 10,
        destreza: 18,
        constituicao: 14,
        inteligencia: 12,
        sabedoria: 14,
        carisma: 8,
        resistencias: { destreza: 7, sabedoria: 5 },
        pericias: { intuicao: 5, persuasao: 1, acrobacia: 7, furtividade: 7 },
        equipamentos: [
            { nome: 'Pistola de Mercúrio', dano: '1d8', tipo: 'Balístico' },
            { nome: 'Faca de Combate', dano: '1d6', tipo: 'Cortante' },
            { nome: 'Casaco do Caçador (Leve)', ca: 15, tipo: 'Armadura Leve' }
        ],
        frascos: 3,
        municao: 10,
        ecos: 50,
        sangue: 3,
        frenesi: 0,
        habilidades: [
            { nome: '🔧 Armeiro', nivel: 1, descricao: 'Cria 10 balas/descanso curto. Misfire 1-2: emperra (Ação para consertar)' },
            { nome: '💪 Bravura (Grit)', nivel: 2, descricao: 'SAB pontos (2 Grit). Recupera 1 ao matar/crítico. Gaste 1: Vantagem no tiro' },
            { nome: '👁️ Olhar de Mercúrio', nivel: 3, descricao: 'Reação: se inimigo errar corpo, atire com Vantagem (3 dano psíquico)' },
            { nome: '🎯 Cálculo à Queima-Roupa', nivel: 3, descricao: 'Sem desvantagem em tiros a 1,5m' },
            { nome: '💥 FARDO: Sobrecarga', nivel: 3, descricao: 'Ao usar Olhar de Mercúrio: 3 dano psíquico' },
            { nome: '☀️ FARDO: Fotofobia', nivel: 3, descricao: 'Luz forte: Desvantagem em ataques' },
            { nome: '⭐ Atirador de Elite', nivel: 4, descricao: 'TALENTO: Ignora cobertura parcial/3/4. Antes de atacar: -5 acerto para +10 dano (Sharpshooter)' },
            { nome: '⚡ Ataque Extra', nivel: 5, descricao: '2 tiros/ação. Se errar, ainda tem Olhar de Mercúrio para 3º tiro!' },
            { nome: '🎲 Tiros de Truque', nivel: 7, descricao: 'Gaste 1 Grit: Perna (FOR ou cai) ou Desarmar (CON ou solta)' },
            { nome: '🎯 Execução Perfeita', nivel: 10, descricao: 'Crítico em 19-20' }
        ],
        marcas_de_cacador: [
            { id: 'tiro_preciso', nome: '🎯 Tiro Preciso', descricao: 'Aumente o bônus de ataque em +2 para ataques à distância por 1 rodada' },
            { id: 'recarga_relampago', nome: '⚡ Recarga Relâmpago', descricao: 'Recarregue como ação bônus uma vez por combate' },
            { id: 'disparos_mortais', nome: '💀 Disparos Mortais', descricao: 'Cada acerto crítico restaura 1d4 Grit' }
        ]
    },
    alchemist: {
        nome: '🧪 Alquimista',
        descricao: 'O Químico de Combate. Suporte tático com misturas explosivas. Médico da Igreja (Religião, Medicina). Perícias: Investigação, Arcanismo. | Mecânica: Bombas Alquímicas (ação): 2d8+INT de Fogo/Ácido a 9m em área pequena. | Nível 5: Potência Alquímica (+INT em dano/cura). Cura Maximizado: poções curam valor máximo sem rolar dados.',
        origin: 'Anão',
        background: 'Servo da Igreja',
        antecedente: 'Servo da Igreja',
        background_feature: 'Acesso a áreas restritas da Igreja da Cura',
        talentos: ['Curandeiro'],
        hp_max: 50,
        hp_atual: 50,
        classe: 'Alchemist',
        nivel: 5,
        bonus_prof: 3,
        ca: 14,
        iniciativa: 2,
        deslocamento: 9,
        forca: 10,
        destreza: 14,
        constituicao: 14,
        inteligencia: 18,
        sabedoria: 12,
        carisma: 8,
        resistencias: { inteligencia: 7, constituicao: 5 },
        pericias: { religiao: 7, medicina: 7, investigacao: 7, arcanismo: 7 },
        equipamentos: [
            { nome: 'Bomba Incendiária', dano: '2d8+4', tipo: 'Fogo' },
            { nome: 'Bomba Ácida', dano: '2d8+4', tipo: 'Ácido' },
            { nome: 'Vestes da Igreja (Leve)', ca: 14, tipo: 'Armadura Leve' }
        ],
        frascos: 3,
        ecos: 50,
        sangue: 2,
        frenesi: 0,
        bombas_restantes: 5,
        cd_bomba: 15,
        habilidades: [
            { nome: '💣 Alquimia de Combate', nivel: 1, descricao: 'Bomba 9m área 1,5m: 2d8+INT. DEX para metade. 3d8 nvl 5, 4d8 nvl 10' },
            { nome: '💉 Infusões Rápidas', nivel: 2, descricao: '2 elixires/descanso (Curar Ferimentos, Raio Doença, Escudo Fé)' },
            { nome: '💪 Injeção de Adrenalina', nivel: 3, descricao: 'Ação bônus: aliado +3m deslocamento +1d6 dano' },
            { nome: '🔬 Cirurgião de Combate', nivel: 3, descricao: 'INT para ataque/dano Acuidade. Poções curam máximo' },
            { nome: '💥 FARDO: Toxicidade', nivel: 3, descricao: 'Curado/buffado por você: -2 CA próx turno' },
            { nome: '💀 FARDO: Abstinência', nivel: 3, descricao: 'Se 1h sem usar item/magia: Envenenado até usar' },
            { nome: '⭐ Curandeiro', nivel: 4, descricao: 'TALENTO: Kit de Cura estabiliza E cura 1d6+4+Nível da criatura (economiza poções)' },
            { nome: '⚗️ Potência Alquímica', nivel: 5, descricao: 'Soma +INT em dano/cura de magias e bombas' },
            { nome: '🩹 Restauração Experimental', nivel: 9, descricao: 'Restauração Menor INT vezes/dia sem gastar slot' },
            { nome: '💉 Mestre da Agulha', nivel: 10, descricao: 'Injeção dá 2d6+INT PV temporários' }
        ],
        marcas_de_cacador: [
            { id: 'explosao_concentrada', nome: '💥 Explosão Concentrada', descricao: 'Bombas causam 50% de dano adicional se atingem área sem aliados' },
            { id: 'transmutacao', nome: '🧬 Transmutação', descricao: 'Transmute veneno em cura: 1d8 HP por Bomba consumida' },
            { id: 'catalisador_vivo', nome: '✨ Catalisador Vivo', descricao: 'A cada acerto, seu próximo ataque de magia tem +1d4 dano' }
        ]
    },
    blood_cursed: {
        nome: '🔴 Amaldiçoado pelo Sangue',
        descricao: 'O Amaldiçoado. Usa o próprio sangue para aumentar poder de ataque. Sobrevivente (Natureza, Medicina). Perícias: Intimidação, Percepção. | Mecânica: Rito Carmesim (Ação Bónus): sacrifica vida para +1d6 dano extra em todos os ataques. | Nível 2: Ataque Imprudente (Vantagem, mas inimigos ganham Vantagem). | Nível 5: Resistência Natural (metade do dano físico em Fúria de Sangue).',
        origin: 'Tiefling',
        background: 'Sobrevivente da Praga',
        antecedente: 'Sobrevivente da Praga',
        background_feature: 'Identifica infectados pelo cheiro',
        talentos: ['Duradouro'],
        hp_max: 80,
        hp_atual: 80,
        classe: 'BloodCursed',
        nivel: 5,
        bonus_prof: 3,
        ca: 16,
        iniciativa: 2,
        deslocamento: 9,
        forca: 14,
        destreza: 14,
        constituicao: 14,
        inteligencia: 13,
        sabedoria: 12,
        carisma: 10,
        resistencias: { constituicao: 5, forca: 5 },
        pericias: { natureza: 4, medicina: 4, intimidacao: 3, percepcao: 4 },
        equipamentos: [
            { nome: 'Espada Grande', dano: '2d6', tipo: 'Cortante' },
            { nome: 'Couro Endurecido da Besta (Média)', ca: 16, tipo: 'Armadura Média' }
        ],
        frascos: 3,
        ecos: 50,
        sangue: 4,
        frenesi: 0,
        dado_sangue: '1d6',
        habilidades: [
            { nome: '🩸 Rito Carmesim', nivel: 1, descricao: 'Ação bônus: sofre 5 dano, arma +1d6 necrótico (nvl 5)' },
            { nome: '💢 Imprudência', nivel: 2, descricao: 'Vantagem nos ataques, inimigos Vantagem contra você' },
            { nome: '😈 Euforia da Dor', nivel: 3, descricao: '≤50% HP: +1 dado dano (2d6→3d6)' },
            { nome: '🛡️ Sangue Vivo', nivel: 3, descricao: '≤50% HP: Resistência dano físico (metade!)' },
            { nome: '💥 FARDO: Rejeição', nivel: 3, descricao: 'Magias/poções curam metade' },
            { nome: '🧠 FARDO: Sede', nivel: 3, descricao: '≤50% HP com inimigo ferido 9m: SAB CD 15 ou atacar' },
            { nome: '⭐ Duradouro', nivel: 4, descricao: 'TALENTO: +2 HP por nível (+10 HP no total = 80 HP). Vital para compensar auto-dano!' },
            { nome: '⚡ Ataque Extra', nivel: 5, descricao: '2 ataques: 3d6+1d6(Rito)+FOR cada = MAIOR DANO BRUTO!' },
            { nome: '🔗 Maldição do Vínculo', nivel: 7, descricao: 'Ação bônus 9m: não cura. Se morrer cura nível+CON' },
            { nome: '🔥 Sangue Fervente', nivel: 10, descricao: 'Ao matar: Reação ataca adjacente' }
        ],
        marcas_de_cacador: [
            { id: 'pacto_sanguineo', nome: '🩸 Pacto Sanguíneo', descricao: 'Gaste 2 HP para ter vantagem no próximo teste' },
            { id: 'dreno_vital', nome: '💉 Dreno Vital', descricao: 'Ataques contra alvos afetados por Maldição restauram 1d4 HP' },
            { id: 'forma_bestial', nome: '👹 Forma Bestial', descricao: 'Transforme-se em besta: +2 FOR, +1d6 dano, mas deve atacar' }
        ]
    },
    guerreiro_ressoante: {
        nome: '⚔️ Guerreiro Ressonante',
        descricao: 'O mestre do ritmo que cura enquanto bate. Veterano (Atletismo, Sobrevivência). Perícias: Percepção, Intuição. | Mecânica: 5 Pontos de Ressonância. Sincronia de Alma (Rally): +1d8 dano, recupera vida igual ao d8 se sofreu dano. | Nível 2: Expansão Espiritual (Ação Bónus): +1 CA e Resistência a dano físico. | Nível 5: Ataque Extra (2x/ação), pode causar muito dano e curar duas vezes.',
        origin: 'Humano',
        background: 'Veterano da Caçada',
        antecedente: 'Veterano da Caçada',
        background_feature: 'Você encontra abrigo seguro em Yharnam facilmente',
        talentos: ['Sentinela'],
        hp_max: 65,
        hp_atual: 65,
        classe: 'GuerreirRessonante',
        nivel: 5,
        bonus_prof: 3,
        ca: 18,
        iniciativa: 1,
        deslocamento: 9,
        forca: 16,
        destreza: 12,
        constituicao: 16,
        inteligencia: 10,
        sabedoria: 14,
        carisma: 8,
        resistencias: { forca: 6, constituicao: 6 },
        pericias: { atletismo: 6, sobrevivencia: 6, percepcao: 5, intuicao: 5 },
        equipamentos: [
            { nome: 'Lâmina Ressonante', dano: '1d8', tipo: 'Cortante' },
            { nome: 'Armadura do Caçador (Pesada)', ca: 18, tipo: 'Armadura Pesada' }
        ],
        frascos: 3,
        ecos: 50,
        sangue: 3,
        frenesi: 0,
        ressonancia_max: 8,
        ressonancia_atual: 8,
        cd_ressonancia: 14,
        habilidades: [
            { nome: '⚔️ Sincronia de Alma', nivel: 1, descricao: 'Gaste 1 PR: +1d8 dano. Se sofreu dano, cura igual ao d8 (Rally). PR = Nível+CON (5 PR no nvl 5)' },
            { nome: '🛡️ Expansão Espiritual', nivel: 2, descricao: 'Ação bônus 1min: +1 CA e resistência a dano físico não-mágico' },
            { nome: '🩸 Sintonia de Sangue', nivel: 3, descricao: 'Ao recuperar PV, move 4,5m sem oportunidade adjacente a inimigo' },
            { nome: '🎯 Marca do Maestro', nivel: 3, descricao: 'Ao acertar, aliados ganham Vantagem contra mesmo alvo. Seu 2º ataque terá Vantagem!' },
            { nome: '💥 FARDO: Silêncio Inquietante', nivel: 3, descricao: 'Se não atacar no turno: -2 CA até próx turno' },
            { nome: '⭐ Sentinela', nivel: 4, descricao: 'TALENTO: Ataque de oportunidade reduz deslocamento inimigo a 0. Reação para atacar quem bater em aliado adjacente' },
            { nome: '⚡ Ataque Extra', nivel: 5, descricao: 'Ataca 2 vezes. 1º acerto dá Vantagem no 2º (Maestro) = Rally consistente!' },
            { nome: '🛡️ Paragem Ressonante', nivel: 7, descricao: 'Reação + 1 PR: +3 CA. Se errar, inimigo perde Reação' },
            { nome: '⚔️ Golpe Ressonante', nivel: 9, descricao: 'Gaste 3 PR: ataque força CD ou Atordoado 1 turno' },
            { nome: '👑 Mestre da Ressonância', nivel: 10, descricao: 'Ao usar Sincronia: aliados 3m recuperam metade do d8 rolado' }
        ],
        marcas_de_cacador: [
            { id: 'amplificacao_vibracao', nome: '📡 Amplificação Vibratória', descricao: 'Ressonâncias afetam inimigos em 10m ao invés de 5m' },
            { id: 'sincronizacao_inimigos', nome: '🔗 Sincronização', descricao: 'Maldiga um inimigo com sua vibração: ele sofre -1 CA' },
            { id: 'ressoancia_eterna', nome: '♾️ Ressonância Eterna', descricao: 'Uma vez por dia, sua próxima Ressonância não custa recursos' }
        ]
    },
    gunbreaker: {
        nome: '⚙️ Gunbreaker',
        descricao: 'O Tanque de Pólvora. Combina força bruta com explosões de curto alcance. Aprendiz de Oficina (História, Investigação). Perícias: Atletismo, Intimidação. | Mecânica: Cartuchos de Pólvora (slots especiais): gaste 1 ao acertar corpo a corpo para +2d8 dano de fogo. | Nível 2: Sentido de Perigo (Vantagem em DEX contra efeitos visíveis). | CA mais alta do grupo, pilar defensivo da equipe.',
        origin: 'Meio-Orc',
        background: 'Aprendiz da Oficina',
        antecedente: 'Aprendiz da Oficina',
        background_feature: 'Pode consertar armas e armaduras em descanso curto',
        talentos: ['Mestre de Armas Grandes'],
        hp_max: 60,
        hp_atual: 60,
        classe: 'Gunbreaker',
        nivel: 5,
        bonus_prof: 3,
        ca: 17,
        iniciativa: 1,
        deslocamento: 9,
        forca: 16,
        destreza: 13,
        constituicao: 15,
        inteligencia: 10,
        sabedoria: 12,
        carisma: 8,
        resistencias: { forca: 6, destreza: 4 },
        pericias: { historia: 3, investigacao: 3, atletismo: 6, intimidacao: 2 },
        equipamentos: [
            { nome: 'Gunblade', dano: '1d8', tipo: 'Cortante/Trovejante' },
            { nome: 'Armadura Mecanizada da Oficina (Pesada)', ca: 17, tipo: 'Armadura Pesada' }
        ],
        frascos: 3,
        municao: 8,
        ecos: 50,
        sangue: 3,
        frenesi: 0,
        cartuchos_max: 4,
        cartuchos_atual: 4,
        habilidades: [
            { nome: '💥 Cartuchos de Pólvora', nivel: 1, descricao: 'Slots como Paladino (4 slots nvl 5). Usa para explosões' },
            { nome: '🔥 Quebra-Cartucho', nivel: 2, descricao: 'Ao acertar: 1 Cartucho +2d8 fogo/trovejante (Smite explosivo!)' },
            { nome: '🚂 Motor a Vapor', nivel: 3, descricao: 'Carga 6m linha: +2d6 fogo, FOR ou Prone (derruba!)' },
            { nome: '🛡️ Blindagem Ablativa', nivel: 3, descricao: 'Reduz 3 de todo dano físico não-mágico' },
            { nome: '💥 FARDO: Superaquecimento', nivel: 3, descricao: 'Ao usar Motor: Cego até próx turno (vapor cega!)' },
            { nome: '🐢 FARDO: Desajeitado', nivel: 3, descricao: 'Desvantagem em DEX e Furtividade' },
            { nome: '⭐ Mestre de Armas Grandes', nivel: 4, descricao: 'TALENTO: Ao matar/crítico, ataque extra com Ação Bônus. Antes atacar: -5 acerto para +10 dano' },
            { nome: '⚡ Ataque Extra', nivel: 5, descricao: 'Motor derruba no 1º golpe → Vantagem no 2º → Smite garantido!' },
            { nome: '🔥 Zona de Explosão', nivel: 7, descricao: 'Você e aliados 3m: Resistência fogo/trovejante' },
            { nome: '🛡️ Superbolide', nivel: 10, descricao: 'Ação: HP→1, Invulnerável 1 turno (1x/descanso)' }
        ],
        marcas_de_cacador: [
            { id: 'sincronizacao_perfeita', nome: '⚡ Sincronização Perfeita', descricao: 'Combine lâmina e pistola: +2d6 dano uma vez por combate' },
            { id: 'cartuchos_infernais', nome: '🔥 Cartuchos Infernais', descricao: 'Cartuchos causam 1d4 dano adicional de fogo' },
            { id: 'reflexo_letal', nome: '💀 Reflexo Letal', descricao: 'Quando um inimigo falha no ataque, faça um contra-ataque como reação' }
        ]
    }
};

// Templates de Fichas
const templates = {
    cacador_machado: { esperando: false, hp_max: 24, hp_atual: 24, frascos: 5, balas: 5, status: [], equipamentos: [{ nome: "Machado de Caçador", dano: "1d8+2" }] },
    cacador_cutelo: { esperando: false, hp_max: 20, hp_atual: 20, frascos: 5, balas: 5, status: [], equipamentos: [{ nome: "Cutelo Cerrado", dano: "1d6+3" }] },
    cacador_bengala: { esperando: false, hp_max: 18, hp_atual: 18, frascos: 5, balas: 8, status: [], equipamentos: [{ nome: "Bengala Enroscada", dano: "1d6+2" }] }
};

// Função para APROVAR entrada do jogador
const aprovarJogador = (id) => {
    const jogadorAtual = players.value[id];
    if (!jogadorAtual) return;
    
    console.log('Aprovando jogador:', id);
    playerToAssignClass.value = id;
    showClassSelector.value = true;
};

// Função para atribuir classe ao jogador
const atribuirClasse = (classKey) => {
    classeSelecionada.value = classKey;
    const classData = classes[classKey];
    
    // Inicializa com os atributos padrão da classe
    statusTemporario.value = {
        forca: classData.forca ?? 10,
        destreza: classData.destreza ?? 10,
        constituicao: classData.constituicao ?? 10,
        inteligencia: classData.inteligencia ?? 10,
        sabedoria: classData.sabedoria ?? 10,
        carisma: classData.carisma ?? 10
    };
    
    showClassSelector.value = false;
    showStatusEditor.value = true;
};

// Função para finalizar a atribuição com os status definidos
const finalizarAtribuicao = () => {
    const jogadorAtual = players.value[playerToAssignClass.value];
    if (!jogadorAtual || !classeSelecionada.value) return;

    const classData = classes[classeSelecionada.value];
    
    // Inicializar marcas de caçador como bloqueadas
    const marcasDesbloqueadas = {};
    if (classData.marcas_de_cacador) {
        classData.marcas_de_cacador.forEach(marca => {
            marcasDesbloqueadas[marca.id] = false;
        });
    }
    
    const fichaCompleta = {
        ...classData,
        nome: jogadorAtual.nome,
        origin: jogadorAtual.origin ?? jogadorAtual.origem ?? jogadorAtual.raca ?? classData.origin ?? 'Desconhecida',
        background: jogadorAtual.background ?? jogadorAtual.antecedente ?? classData.background ?? 'Nenhum',
        antecedente: jogadorAtual.antecedente ?? jogadorAtual.background ?? classData.antecedente,
        personalidade: jogadorAtual.personalidade ?? classData.personalidade ?? '',
        talentos: jogadorAtual.talentos ?? classData.talentos ?? [],
        descricao_classe: classData.descricao,
        resistencias: jogadorAtual.resistencias ?? classData.resistencias ?? {},
        pericias: jogadorAtual.pericias ?? classData.pericias ?? {},
        // Aplicar status definidos
        forca: statusTemporario.value.forca,
        destreza: statusTemporario.value.destreza,
        constituicao: statusTemporario.value.constituicao,
        inteligencia: statusTemporario.value.inteligencia,
        sabedoria: statusTemporario.value.sabedoria,
        carisma: statusTemporario.value.carisma,
        aprovado: true,
        esperando: false,
        frascos: 3, // Frascos de Sangue iniciais
        marcas_desbloqueadas: marcasDesbloqueadas
    };

    if (sessionId) {
        updateSessionCharacter(sessionId, playerToAssignClass.value, fichaCompleta);
    } else {
        updateCharacterData(playerToAssignClass.value, fichaCompleta);
    }

    showStatusEditor.value = false;
    playerToAssignClass.value = null;
    classeSelecionada.value = null;
    alert(`✅ Classe ${classData.nome} atribuída com sucesso!`);
};

// Abre editor de atributos para um jogador já com ficha
const abrirEditorAtributos = (id) => {
    jogadorEmEdicao.value = id;
    const jogador = players.value[id];
    statusTemporario.value = {
        forca: jogador.forca || 10,
        destreza: jogador.destreza || 10,
        constituicao: jogador.constituicao || 10,
        inteligencia: jogador.inteligencia || 10,
        sabedoria: jogador.sabedoria || 10,
        carisma: jogador.carisma || 10
    };
    showStatusEditor.value = true;
};

// Salva atributos editados
const salvarAtributosEditados = () => {
    if (!jogadorEmEdicao.value) return;
    
    const atualizacoes = {
        forca: statusTemporario.value.forca,
        destreza: statusTemporario.value.destreza,
        constituicao: statusTemporario.value.constituicao,
        inteligencia: statusTemporario.value.inteligencia,
        sabedoria: statusTemporario.value.sabedoria,
        carisma: statusTemporario.value.carisma
    };

    if (sessionId) {
        updateSessionCharacter(sessionId, jogadorEmEdicao.value, atualizacoes);
    } else {
        updateCharacterData(jogadorEmEdicao.value, atualizacoes);
    }

    showStatusEditor.value = false;
    jogadorEmEdicao.value = null;
    alert('✅ Atributos atualizados com sucesso!');
};

// Função para EXPULSAR um jogador da sala
const expulsarJogador = async (id) => {
    const jogador = players.value[id];
    if (!jogador) return;
    
    const confirmed = confirm(`⚠️ Tem certeza que deseja EXPULSAR "${jogador.nome}" da sessão?\n\nEsta ação é irreversível.`);
    if (confirmed) {
        console.log('Expulsando jogador:', id, jogador.nome);

        const backup = { ...jogador };

        // Remove localmente primeiro para feedback imediato
        delete players.value[id];

        try {
            // Remove no Firebase para garantir que não volte
            if (sessionId) {
                await removeSessionCharacter(sessionId, id);
            } else {
                await removeCharacter(id);
            }
            alert(`✅ ${jogador.nome} foi expulso da sessão.`);
        } catch (error) {
            console.error('Erro ao expulsar jogador:', error);
            players.value[id] = backup;
            alert('❌ Erro ao expulsar jogador. Verifique o console.');
        }
    }
};

// Função para RECUSAR entrada do jogador
const recusarJogador = (id) => {
    // Implementar lógica de recusa (remover jogador ou marcar como recusado)
    console.log('Jogador recusado:', id);
};

// Função para ATRIBUIR ficha ao jogador já aprovado
const aplicarTemplate = (id, tipo) => {
    console.log('MasterDashboard - Iniciando aplicação de template');
    console.log('MasterDashboard - ID recebido:', id);
    console.log('MasterDashboard - Tipo:', tipo);
    
    const jogadorAtual = players.value[id];
    if (!jogadorAtual) {
        console.error('MasterDashboard - Jogador não encontrado:', id);
        console.error('MasterDashboard - IDs disponíveis:', Object.keys(players.value));
        alert(`❌ Erro: Jogador não encontrado!\n\nID procurado: ${id}\nIDs disponíveis: ${Object.keys(players.value).join(', ')}`);
        return;
    }
    
    console.log('MasterDashboard - Jogador encontrado:', jogadorAtual);
    
    // Cria ficha COMPLETA com dados do template + nome e sessão
    const fichaCriada = {
        nome: jogadorAtual.nome,
        sessaoId: jogadorAtual.sessaoId,
        aprovado: true,
        esperando: false, // ✅ CRÍTICO: Muda para false para sair do ApprovedLobby
        ...templates[tipo]
    };
    
    console.log('MasterDashboard - Dados da ficha a enviar:', fichaCriada);
    
    // Atualiza localmente primeiro para feedback imediato
    players.value[id] = fichaCriada;
    
    try {
        // Depois atualiza no Firebase
        if (sessionId) {
            console.log('MasterDashboard - Modo Sessão: updateSessionCharacter');
            updateSessionCharacter(sessionId, id, fichaCriada);
        } else {
            console.log('MasterDashboard - Modo Clássico: updateCharacterData');
            updateCharacterData(id, fichaCriada);
        }
        console.log('MasterDashboard - Ficha enviada para Firebase com sucesso!');
        alert(`✅ Ficha de ${jogadorAtual.nome} atribuída com sucesso!`);
    } catch (error) {
        console.error('Erro ao atribuir ficha:', error);
        alert('❌ Erro ao atribuir ficha. Verifique o console.');
    }
};

// Função para abrir criador do Gunslinger
const abrirGunslingerCreator = (id) => {
    currentGunslingerPlayer.value = id;
    showGunslingerCreator.value = true;
};

// Função para criar personagem Gunslinger
const criarGunslinger = (personagemData) => {
    const id = currentGunslingerPlayer.value;
    const jogadorAtual = players.value[id];
    
    if (!jogadorAtual) {
        alert('❌ Erro: Jogador não encontrado!');
        return;
    }
    
    const fichaCriada = {
        ...personagemData,
        nome: jogadorAtual.nome,
        sessaoId: jogadorAtual.sessaoId,
        aprovado: true,
        esperando: false
    };
    
    // Atualiza localmente primeiro
    players.value[id] = fichaCriada;
    
    try {
        // Depois atualiza no Firebase
        if (sessionId) {
            updateSessionCharacter(sessionId, id, fichaCriada);
        } else {
            updateCharacterData(id, fichaCriada);
        }
        alert(`✅ Gunslinger ${jogadorAtual.nome} criado com sucesso!`);
    } catch (error) {
        console.error('Erro ao criar Gunslinger:', error);
        alert('❌ Erro ao criar Gunslinger. Verifique o console.');
    }
};

// Progressão de nível Gunslinger (Níveis 5 → 10)
const gunslingerProgressao = {
    6: {
        descricao: 'Caçador Experiente',
        habilidades: ['Recarga Rápida', 'Sangue Frio'],
        hp_adicional: 6, // +1d10 (média 6)
        dados_vida_total: 6
    },
    7: {
        descricao: 'Técnica Aprimorada',
        habilidades: ['Tiro Incapacitante', 'Mira Perfeita'],
        hp_adicional: 6,
        dados_vida_total: 7,
        novo_tiro: { nome: 'Tiro Incapacitante', custo: 1, efeito: 'Alvo faz teste CON ou fica com deslocamento 0' }
    },
    8: {
        descricao: 'Aprimoramento',
        habilidades: ['Controle de Misfire'],
        hp_adicional: 6,
        dados_vida_total: 8,
        opcao_atributo: true // Jogador pode escolher +2 DEX ou talento
    },
    9: {
        descricao: 'Executor',
        habilidades: ['Crítico Brutal', 'Mobilidade Letal'],
        hp_adicional: 6,
        dados_vida_total: 9
    },
    10: {
        descricao: 'Mestre da Caçada',
        habilidades: ['Reparo Rápido', 'Marca Evoluída'],
        hp_adicional: 6,
        dados_vida_total: 10,
        novo_tiro: { nome: 'Tiro da Execução', custo: 2, efeito: 'Vantagem contra alvos <50% HP' },
        grit_max: 3 // Aumenta Grit máximo
    }
};

// Função genérica para subir nível de qualquer classe
const subirNivel = (id) => {
    const jogador = players.value[id];
    if (!jogador) {
        alert('❌ Jogador não encontrado!');
        return;
    }
    
    const nivelAtual = jogador.nivel || 5;
    const proximoNivel = nivelAtual + 1;
    
    if (proximoNivel > 10) {
        alert('❌ Nível máximo atingido (10)!');
        return;
    }
    
    // HP adicional baseado no dado de vida da classe
    let hpAdicional = 0;
    if (['Gunslinger', 'Alchemist', 'BloodCursed'].includes(jogador.classe)) {
        hpAdicional = 8; // d8
    } else if (['GuerreirRessonante', 'Gunbreaker'].includes(jogador.classe)) {
        hpAdicional = 10; // d10
    }
    
    // Adiciona modificador de CON
    const modCon = Math.floor((jogador.constituicao - 10) / 2);
    hpAdicional += modCon;
    
    const confirmed = confirm(
        `⬆️ Subir ${jogador.nome} para Nível ${proximoNivel}?\n\n` +
        `❤️ HP: +${hpAdicional} (${jogador.hp_max} → ${jogador.hp_max + hpAdicional})\n` +
        `🎯 Bônus Prof: ${proximoNivel >= 9 ? 4 : 3}\n\n` +
        `Confirmar?`
    );
    
    if (!confirmed) return;
    
    const novoHpMax = jogador.hp_max + hpAdicional;
    const dadosAtualizados = {
        nivel: proximoNivel,
        hp_max: novoHpMax,
        hp_atual: Math.min(jogador.hp_atual + hpAdicional, novoHpMax),
        bonus_prof: proximoNivel >= 9 ? 4 : 3
    };
    
    // Atualiza localmente
    players.value[id] = { ...jogador, ...dadosAtualizados };
    
    // Atualiza no Firebase
    try {
        if (sessionId) {
            updateSessionCharacter(sessionId, id, dadosAtualizados);
        } else {
            updateCharacterData(id, dadosAtualizados);
        }
        
        alert(`✅ ${jogador.nome} subiu para Nível ${proximoNivel}!\n\n❤️ HP: ${jogador.hp_max} → ${novoHpMax}`);
    } catch (error) {
        console.error('Erro ao subir nível:', error);
        alert('❌ Erro ao subir nível. Verifique o console.');
    }
};

// Função para subir nível do Gunslinger (mantida para compatibilidade)
const subirNivelGunslinger = (id) => {
    subirNivel(id);
};

// Função para resetar jogador (volta para aguardando ficha)
const resetarJogador = (id) => {
    const jogador = players.value[id];
    if (!jogador) return;
    
    const confirmed = confirm(`🔄 Resetar "${jogador.nome}"?\n\nEle voltará para aguardar atribuição de ficha.`);
    if (confirmed) {
        console.log('Resetando jogador:', id, jogador.nome);
        
        // Atualiza localmente primeiro
        players.value[id] = { 
            ...players.value[id], 
            esperando: true,
            hp_atual: players.value[id].hp_max || 20,
            frascos: 3,
            balas: 5,
            status: []
        };
        
        // Depois atualiza no Firebase
        const resetData = {
            esperando: true,
            hp_atual: jogador.hp_max || 20,
            frascos: 3,
            balas: 5,
            status: []
        };
        
        if (sessionId) {
            updateSessionCharacter(sessionId, id, resetData);
        } else {
            updateCharacterData(id, resetData);
        }
        
        alert(`✅ ${jogador.nome} foi resetado!`);
    }
};

// Função para atualizar HP
const atualizarHP = (id, novoHP) => {
    // Apenas mestre pode alterar
    if (!sessionId && !route.path.includes('mestre')) return;
    
    // Atualiza localmente primeiro para feedback instantâneo
    if (players.value[id]) {
        players.value[id].hp_atual = novoHP;
    }
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { hp_atual: novoHP });
    } else {
        updateCharacterData(id, { hp_atual: novoHP });
    }
};

// Função para alterar Sangue
const alterarSangue = (id, valor) => {
    // Apenas mestre pode alterar
    if (!sessionId && !route.path.includes('mestre')) return;
    
    const player = players.value[id];
    if (!player) return;
    
    const novoSangue = Math.max(0, Math.min(6, (player.sangue || 3) + valor));
    
    // Atualiza localmente
    players.value[id].sangue = novoSangue;
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { sangue: novoSangue });
    } else {
        updateCharacterData(id, { sangue: novoSangue });
    }
};

// Função para alterar Frenesi
const alterarFrenesi = (id, valor) => {
    // Apenas mestre pode alterar
    if (!sessionId && !route.path.includes('mestre')) return;
    
    const player = players.value[id];
    if (!player) return;
    
    const novoFrenesi = Math.max(0, Math.min(10, (player.frenesi || 0) + valor));
    
    // Atualiza localmente
    players.value[id].frenesi = novoFrenesi;
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { frenesi: novoFrenesi });
    } else {
        updateCharacterData(id, { frenesi: novoFrenesi });
    }
};

// Função para corrigir frascos de todos os jogadores para 3
const corrigirFrascosTodos = () => {
    const confirmed = confirm('🔧 Corrigir frascos de TODOS os jogadores para 3 (Frascos de Sangue)?\n\nIsso vai atualizar todos os personagens.');
    if (!confirmed) return;
    
    Object.keys(players.value).forEach(id => {
        const jogador = players.value[id];
        if (jogador && !jogador.esperando) {
            // Atualiza localmente
            players.value[id].frascos = 3;
            
            // Atualiza no Firebase
            if (sessionId) {
                updateSessionCharacter(sessionId, id, { frascos: 3 });
            } else {
                updateCharacterData(id, { frascos: 3 });
            }
        }
    });
    
    alert('✅ Frascos de Sangue corrigidos para 3 em todos os jogadores!');
};

// Função para iniciar combate

// Função para liberar marca de caçador
const liberarMarca = (id, marcaId) => {
    const jogador = players.value[id];
    if (!jogador) return;
    
    const marcasDesbloqueadas = jogador.marcas_desbloqueadas || {};
    marcasDesbloqueadas[marcaId] = true;
    
    // Atualiza localmente
    players.value[id].marcas_desbloqueadas = marcasDesbloqueadas;
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { marcas_desbloqueadas: marcasDesbloqueadas });
    } else {
        updateCharacterData(id, { marcas_desbloqueadas: marcasDesbloqueadas });
    }
    
    // Encontra o nome da marca
    const classKey = Object.keys(classes).find(key => {
        return classes[key].marcas_de_cacador?.some(m => m.id === marcaId);
    });
    
    if (classKey) {
        const marca = classes[classKey].marcas_de_cacador.find(m => m.id === marcaId);
        if (marca) {
            alert(`✅ Marca de Caçador liberada!\n\n${marca.nome}\n${marca.descricao}`);
        }
    }
};

// Função para alterar recursos específicos de classe
const alterarRecursoClasse = (id, recurso, valor) => {
    // Apenas mestre pode alterar
    if (!sessionId && !route.path.includes('mestre')) return;
    
    const jogador = players.value[id];
    if (!jogador) return;
    
    const atual = jogador[recurso] || 0;
    let novoValor;
    
    // Recursos sem máximo (munição, bombas_restantes)
    if (recurso === 'municao' || recurso === 'bombas_restantes') {
        novoValor = Math.max(0, atual + valor);
    } else {
        // Recursos com máximo (grit_atual, ressonancia_atual, cartuchos_atual)
        const max = jogador[`${recurso.replace('_atual', '')}_max`] || 10;
        novoValor = Math.max(0, Math.min(max, atual + valor));
    }
    
    // Atualiza localmente
    players.value[id][recurso] = novoValor;
    
    // Atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, id, { [recurso]: novoValor });
    } else {
        updateCharacterData(id, { [recurso]: novoValor });
    }
};

onMounted(() => {
    console.log('MasterDashboard montado! SessionId:', sessionId);
    
    // Verificar se é mestre (se a URL contém /mestre ou é modo sessão, assume que é mestre)
    // Se não for mestre, redirecionar
    if (!sessionId && !route.path.includes('mestre')) {
        console.warn('Acesso negado: usuário não é mestre');
        router.push('/');
        return;
    }
    
    if (sessionId) {
        const sessionRef = dbRef(db, `sessoes/${sessionId}`);
        const now = new Date().toISOString();

        // Marca sessão ativa enquanto o mestre estiver online
        fbUpdate(sessionRef, { ativa: true, ultima_atividade: now });

        // Heartbeat para manter sessão viva
        heartbeatTimer = setInterval(() => {
            fbUpdate(sessionRef, { ativa: true, ultima_atividade: new Date().toISOString() });
        }, 15000);

        // Fecha a sessão automaticamente se o mestre desconectar
        const disconnectRef = onDisconnect(sessionRef);
        disconnectRef.update({ ativa: false, encerrada_em: new Date().toISOString() });

        beforeUnloadHandler = () => {
            fbUpdate(sessionRef, { ativa: false, encerrada_em: new Date().toISOString() });
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);

        // Modo Sessão
        subscribeToSessionCharacters(sessionId, (data) => {
            console.log('MasterDashboard - Jogadores da sessão atualizados:', data);
            console.log('MasterDashboard - IDs dos jogadores:', data ? Object.keys(data) : 'nenhum');
            players.value = data || {};
        });
    } else {
        // Modo Clássico
        console.log('MasterDashboard - Modo clássico (sem sessão)');
        subscribeToAllCharacters((data) => { 
            console.log('MasterDashboard - Todos os personagens:', data);
            players.value = data; 
        });
        subscribeToCombat((data) => { combatState.value = data; });
    }
});

onBeforeUnmount(() => {
    if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        beforeUnloadHandler = null;
    }
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    if (sessionId) {
        const sessionRef = dbRef(db, `sessoes/${sessionId}`);
        fbUpdate(sessionRef, { ativa: false, encerrada_em: new Date().toISOString() });
    }
});

// LÓGICA DE GERENCIAMENTO
// (aplicarTemplate, resetarJogador estão acima)

// Encerrar sessão manualmente
const encerrarSessao = async () => {
    if (!sessionId) return;

    const confirmed = confirm('⚠️ Encerrar a sessão agora?\n\nTodos serão desconectados.');
    if (!confirmed) return;

    try {
        await setSessionCombatState(sessionId, { ativo: false, ordem: [], turnoAtual: 0 });
        await removeSession(sessionId);

        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }

        alert('✅ Sessão encerrada e removida do banco.');
        router.push('/');
    } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
        alert('❌ Erro ao encerrar sessão. Verifique o console.');
    }
};

// Computado para filtrar jogadores NA SALA aguardando ficha
const jogadoresNaSala = computed(() => {
    return Object.entries(players.value).filter(([id, char]) => 
        char.esperando === true && !char.expulso
    );
});

const jogadoresConectados = computed(() => {
    return Object.entries(players.value).filter(([id, char]) => 
        char.esperando === false && !char.expulso
    );
});

// Jogadores conectados filtrados pela busca
const jogadoresFiltrados = computed(() => {
    return jogadoresConectados.value.filter(([id, char]) => 
        char.nome.toLowerCase().includes(searchFilter.value.toLowerCase())
    );
});

// Função para adicionar arma
const adicionarArma = (playerId) => {
    if (!newWeapon.value.nome || !newWeapon.value.dano) return;
    
    const player = players.value[playerId];
    if (!player) return;
    
    const equipamentos = [...(player.equipamentos || [])];
    equipamentos.push({ ...newWeapon.value });
    
    // Atualiza localmente primeiro
    players.value[playerId] = { ...player, equipamentos };
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, playerId, { equipamentos });
    } else {
        updateCharacterData(playerId, { equipamentos });
    }
    
    newWeapon.value = { nome: '', dano: '', tipo: '' };
    showWeaponForm.value = false;
};

// Função para remover arma
const removerArma = (playerId, armaIndex) => {
    const player = players.value[playerId];
    if (!player) return;
    
    const equipamentos = [...(player.equipamentos || [])];
    equipamentos.splice(armaIndex, 1);
    
    // Atualiza localmente primeiro
    players.value[playerId] = { ...player, equipamentos };
    
    // Depois atualiza no Firebase
    if (sessionId) {
        updateSessionCharacter(sessionId, playerId, { equipamentos });
    } else {
        updateCharacterData(playerId, { equipamentos });
    }
};

// Computado para obter armas do jogador selecionado
const selectedPlayerArmas = computed(() => {
    if (!selectedPlayer.value) return [];
    return (players.value[selectedPlayer.value]?.equipamentos || []);
});

// Computado para retornar cor baseada no HP
const hpStatus = (char) => {
    const pct = (char.hp_atual / char.hp_max) * 100;
    if (pct >= 75) return 'green';
    if (pct >= 50) return 'yellow';
    if (pct >= 25) return 'orange';
    return 'red';
};

</script>

<template>
<div class="min-h-screen bg-black text-gray-300 p-6" style="min-width: 1200px;">
    <!-- HEADER -->
    <div class="flex justify-between items-center mb-8 border-b border-red-900/50 pb-6">
        <div>
            <h1 class="text-4xl text-amber-100 font-cinzel tracking-widest">PAINEL DO MESTRE</h1>
            <p v-if="sessionId" class="text-sm text-gray-500 mt-2 font-mono">Sessão: <span class="text-red-400">{{ sessionId }}</span></p>
        </div>
        <div class="flex items-center gap-3">
            <button v-if="sessionId" @click="encerrarSessao"
                    class="text-sm text-red-300 hover:text-red-100 transition-colors px-4 py-2 border border-red-900/50 rounded hover:border-red-700 bg-red-900/20">
                <span class="material-symbols-outlined align-middle mr-1">power_settings_new</span>Encerrar Sessão
            </button>
            <button @click="corrigirFrascosTodos"
                    class="text-sm text-green-300 hover:text-green-100 transition-colors px-4 py-2 border border-green-900/50 rounded hover:border-green-700 bg-green-900/20"
                    title="Corrigir frascos para 5 em todos os jogadores">
                <span class="material-symbols-outlined align-middle mr-1">healing</span>Corrigir Frascos
            </button>
            <router-link to="/" class="text-sm text-gray-400 hover:text-amber-100 transition-colors px-4 py-2 border border-gray-700 rounded hover:border-amber-700">
                <span class="material-symbols-outlined align-middle mr-1">exit_to_app</span>Sair
            </router-link>
        </div>
    </div>

    <!-- LAYOUT PRINCIPAL (3 COLUNAS DESKTOP) -->
    <div class="grid grid-cols-3 gap-6">
        <!-- COLUNA CENTRAL: JOGADORES NA SALA -->
        <div class="col-span-3">
            <!-- AGUARDANDO FICHA -->
            <div v-if="jogadoresNaSala.length > 0" class="mb-8">
                <h2 class="font-cinzel text-xl text-blue-400 tracking-wider mb-4 uppercase flex items-center gap-2">
                    <span class="material-symbols-outlined">person_add</span> Aguardando Ficha ({{ jogadoresNaSala.length }})
                </h2>
                <div class="grid grid-cols-2 gap-4">
                    <div v-for="([id, char]) in jogadoresNaSala" :key="id" 
                         class="glass-panel p-4 rounded border border-blue-900/50 hover:border-blue-700/50 transition-colors">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-cinzel text-blue-300 text-lg">{{ char.nome }}</h3>
                                <p class="text-xs text-gray-500 mt-1">⏳ Aguardando atribuição de ficha</p>
                            </div>
                            <button @click="expulsarJogador(id)" 
                                    class="text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-700 text-red-300 hover:text-red-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                    title="Expulsar este jogador">
                                <span class="material-symbols-outlined text-sm">person_remove</span>
                            </button>
                        </div>
                        
                        <button @click.stop="aprovarJogador(id)" class="w-full bg-gradient-to-r from-green-900/60 to-green-900/40 hover:from-green-800/80 hover:to-green-800/60 border border-green-700 text-green-300 hover:text-green-100 py-3 px-3 rounded text-sm transition-all uppercase font-cinzel tracking-wide flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined">check</span> APROVAR E ESCOLHER CLASSE
                        </button>
                    </div>
                </div>
            </div>

            <!-- JOGADORES CONECTADOS -->
            <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h2 class="font-cinzel text-xl text-green-400 tracking-wider uppercase flex items-center gap-2">
                        <span class="material-symbols-outlined">check_circle</span> Jogadores Conectados ({{ jogadoresConectados.length }})
                    </h2>
                    <input v-model="searchFilter" 
                           type="text" 
                           placeholder="Filtrar jogadores..." 
                           class="w-64 bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                </div>
                
                <div v-if="jogadoresConectados.length === 0" class="glass-panel p-8 rounded text-center text-gray-500">
                    <p class="text-sm">Nenhum jogador conectado ainda...</p>
                </div>

                <div v-else-if="jogadoresFiltrados.length === 0" class="glass-panel p-8 rounded text-center text-gray-500">
                    <p class="text-sm">Nenhum jogador encontrado com o filtro "{{ searchFilter }}"</p>
                </div>

                <div v-else class="grid grid-cols-2 gap-4" style="max-height: calc(100vh - 250px); overflow-y-auto;">
                    <div v-for="([id, char]) in jogadoresFiltrados" :key="id" 
                         @click="selectedPlayer = selectedPlayer === id ? null : id"
                         class="glass-panel p-4 rounded border transition-all cursor-pointer"
                         :class="selectedPlayer === id ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700/50 hover:border-gray-600'">
                        
                        <!-- Cabeçalho -->
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-cinzel text-amber-100 text-lg">{{ char.nome }}</h3>
                                <div class="flex gap-2 items-center mt-1">
                                    <p class="text-xs text-gray-500">
                                        <span v-if="char.classe === 'Gunslinger'" class="text-amber-400">🎯 </span>
                                        Nível {{ char.nivel || char.level || 1 }}
                                    </p>
                                    <div v-if="char.equipamentos && char.equipamentos.length > 0" class="text-[10px] bg-amber-900/30 border border-amber-700/50 text-amber-300 px-2 py-0.5 rounded">
                                        {{ char.equipamentos[0].nome.split(' ').slice(0, 2).join(' ') }}
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-1">
                                <!-- Botão Subir Nível (TODAS AS CLASSES) -->
                                <button v-if="(char.nivel || 5) < 10" 
                                        @click.stop="subirNivel(id)" 
                                        class="text-xs bg-amber-900/50 hover:bg-amber-900/80 border border-amber-700/50 text-amber-400 hover:text-amber-200 px-2 py-1 rounded transition-colors"
                                        title="Subir de Nível">
                                    <span class="material-symbols-outlined text-sm align-middle">arrow_upward</span>
                                </button>
                                <!-- Botão Resetar -->
                                <button @click.stop="resetarJogador(id)" class="text-xs bg-gray-900/50 hover:bg-gray-900/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 px-2 py-1 rounded transition-colors">
                                    <span class="material-symbols-outlined text-sm align-middle">refresh</span>
                                </button>
                            </div>
                        </div>

                        <!-- Stats Rápido -->
                        <div class="space-y-2 mb-3">
                            <!-- HP Bar Visual -->
                            <div class="space-y-1">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-400">Vida</span>
                                    <span :class="hpStatus(char) === 'green' ? 'text-green-400' : hpStatus(char) === 'yellow' ? 'text-yellow-400' : hpStatus(char) === 'orange' ? 'text-orange-400' : 'text-red-400'" 
                                          class="font-mono">{{ char.hp_atual }}/{{ char.hp_max }}</span>
                                </div>
                                <div class="w-full h-3 bg-black/50 rounded overflow-hidden border border-gray-700">
                                    <div :style="{ width: (char.hp_atual / char.hp_max * 100) + '%' }"
                                         :class="hpStatus(char) === 'green' ? 'bg-green-600' : hpStatus(char) === 'yellow' ? 'bg-yellow-600' : hpStatus(char) === 'orange' ? 'bg-orange-600' : 'bg-red-600'"
                                         class="h-full transition-all duration-300 rounded"></div>
                                </div>
                            </div>

                            <!-- Frascos e Munição -->
                            <div class="grid gap-2 text-xs" :class="char.municao !== undefined ? 'grid-cols-2' : 'grid-cols-1'">
                                <div class="bg-green-900/20 border border-green-700/30 rounded p-2">
                                    <p class="text-gray-500 text-[10px] uppercase">🩸 Frascos</p>
                                    <p class="text-green-400 font-mono">{{ Math.min(char.frascos || 0, 3) }}/3</p>
                                </div>
                                <div v-if="char.municao !== undefined" class="bg-blue-900/20 border border-blue-700/30 rounded p-2">
                                    <p class="text-gray-500 text-[10px] uppercase">🔫 Munição</p>
                                    <p class="text-blue-400 font-mono">{{ char.municao || 0 }}</p>
                                </div>
                            </div>
                            
                            <!-- RECURSOS ESPECÍFICOS POR CLASSE -->
                            <!-- Gunslinger: Grit -->
                            <div v-if="char.classe === 'Gunslinger' && char.grit_max" class="bg-amber-900/20 border border-amber-700/30 rounded p-2 text-xs">
                                <p class="text-gray-500 text-[10px] uppercase">🎯 Grit</p>
                                <p class="text-amber-400 font-mono">{{ char.grit_atual || 0 }}/{{ char.grit_max }}</p>
                            </div>
                            
                            <!-- Alchemist: Bombas -->
                            <div v-if="char.classe === 'Alchemist' && char.bombas_restantes !== undefined" class="bg-red-900/20 border border-red-700/30 rounded p-2 text-xs">
                                <p class="text-gray-500 text-[10px] uppercase">💣 Bombas</p>
                                <p class="text-red-400 font-mono">{{ char.bombas_restantes || 0 }}/5</p>
                            </div>
                            
                            <!-- Blood Cursed: Dado de Sangue -->
                            <div v-if="char.classe === 'BloodCursed' && char.dado_sangue" class="bg-red-900/20 border border-red-700/30 rounded p-2 text-xs">
                                <p class="text-gray-500 text-[10px] uppercase">🩸 Dado Sangue</p>
                                <p class="text-red-400 font-mono">{{ char.dado_sangue }}</p>
                            </div>
                            
                            <!-- Guerreiro Ressonante: Ressonância -->
                            <div v-if="char.classe === 'GuerreirRessonante' && char.ressonancia_max" class="bg-purple-900/20 border border-purple-700/30 rounded p-2 text-xs">
                                <p class="text-gray-500 text-[10px] uppercase">⚡ Ressonância</p>
                                <p class="text-purple-400 font-mono">{{ char.ressonancia_atual || 0 }}/{{ char.ressonancia_max }}</p>
                            </div>
                            
                            <!-- Gunbreaker: Cartuchos -->
                            <div v-if="char.classe === 'Gunbreaker' && char.cartuchos_max" class="bg-yellow-900/20 border border-yellow-700/30 rounded p-2 text-xs">
                                <p class="text-gray-500 text-[10px] uppercase">💥 Cartuchos</p>
                                <p class="text-yellow-400 font-mono">{{ char.cartuchos_atual || 0 }}/{{ char.cartuchos_max }}</p>
                            </div>
                        </div>

                        <!-- Controle HP (visível ao expandir ou sempre) -->
                        <div v-if="selectedPlayer === id" class="mb-3 pt-3 border-t border-gray-700 space-y-3">
                            <!-- HP Slider -->
                            <div class="space-y-2">
                                <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
                                    <span>Ajustar HP</span>
                                    <span class="text-amber-400">{{ char.hp_atual }}</span>
                                </div>
                                <input type="range" min="0" :max="char.hp_max" :value="char.hp_atual" 
                                       @input="e => atualizarHP(id, parseInt(e.target.value))"
                                       class="w-full h-2 bg-gray-800 rounded appearance-none cursor-pointer accent-red-700">
                            </div>

                            <!-- Sangue Control -->
                            <div class="space-y-2">
                                <div class="flex justify-between items-center text-xs text-gray-400">
                                    <span class="text-red-400">🩸 Sangue</span>
                                    <span class="text-red-500 font-mono font-bold">{{ char.sangue || 3 }}/6</span>
                                </div>
                                <div class="flex gap-1 items-center">
                                    <button @click.stop="alterarSangue(id, -1)" class="w-6 h-6 flex items-center justify-center bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 rounded text-sm transition-colors">−</button>
                                    <div class="flex-1 flex gap-0.5">
                                        <div v-for="i in 6" :key="'sangue-' + i"
                                             class="flex-1 h-3 rounded border border-red-700 transition-all"
                                             :class="i <= (char.sangue || 3) ? 'bg-red-700' : 'bg-black/40'">
                                        </div>
                                    </div>
                                    <button @click.stop="alterarSangue(id, 1)" class="w-6 h-6 flex items-center justify-center bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 rounded text-sm transition-colors">+</button>
                                </div>
                            </div>

                            <!-- Frenesi Control -->
                            <div class="space-y-2">
                                <div class="flex justify-between items-center text-xs text-gray-400">
                                    <span class="text-purple-400">👹 Frenesi</span>
                                    <span class="text-purple-500 font-mono font-bold">{{ char.frenesi || 0 }}/10</span>
                                </div>
                                <div class="flex gap-1 items-center">
                                    <button @click.stop="alterarFrenesi(id, -1)" class="w-6 h-6 flex items-center justify-center bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700 text-purple-400 rounded text-sm transition-colors">−</button>
                                    <div class="flex-1 flex gap-0.5">
                                        <div v-for="i in 10" :key="'frenesi-' + i"
                                             class="flex-1 h-3 rounded border border-purple-700 transition-all"
                                             :class="i <= (char.frenesi || 0) ? 'bg-purple-700' : 'bg-black/40'">
                                        </div>
                                    </div>
                                    <button @click.stop="alterarFrenesi(id, 1)" class="w-6 h-6 flex items-center justify-center bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700 text-purple-400 rounded text-sm transition-colors">+</button>
                                </div>
                                <p class="text-[10px] text-gray-500">
                                    <span :class="(char.frenesi || 0) <= 3 ? 'text-green-400' : (char.frenesi || 0) <= 7 ? 'text-yellow-400' : 'text-red-400'">
                                        {{ (char.frenesi || 0) <= 3 ? 'Controle' : (char.frenesi || 0) <= 7 ? 'Fúria Emergente' : 'Besta Interior' }}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <!-- Expandido -->
                        <div v-if="selectedPlayer === id" class="border-t border-gray-700 pt-3 space-y-3">
                            
                            <!-- CONTROLES DE RECURSOS ESPECÍFICOS -->
                            <div class="space-y-3">
                                <!-- Munição (Gunslinger e Gunbreaker) -->
                                <div v-if="char.municao !== undefined" class="space-y-2">
                                    <div class="flex justify-between items-center text-xs text-gray-400">
                                        <span class="text-blue-400">🔫 Munição</span>
                                        <span class="text-blue-500 font-mono font-bold">{{ char.municao || 0 }}</span>
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <button @click.stop="alterarRecursoClasse(id, 'municao', -1)" class="flex-1 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700 text-blue-400 py-1 rounded text-xs transition-colors">− Gastar</button>
                                        <button @click.stop="alterarRecursoClasse(id, 'municao', 1)" class="flex-1 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700 text-blue-400 py-1 rounded text-xs transition-colors">+ Recarregar</button>
                                    </div>
                                </div>
                                
                                <!-- Gunslinger: Controle de Grit -->
                                <div v-if="char.classe === 'Gunslinger' && char.grit_max" class="space-y-2">
                                    <div class="flex justify-between items-center text-xs text-gray-400">
                                        <span class="text-amber-400">🎯 Grit</span>
                                        <span class="text-amber-500 font-mono font-bold">{{ char.grit_atual || 0 }}/{{ char.grit_max }}</span>
                                    </div>
                                    <div class="flex gap-1 items-center">
                                        <button @click.stop="alterarRecursoClasse(id, 'grit_atual', -1)" class="w-6 h-6 flex items-center justify-center bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700 text-amber-400 rounded text-sm transition-colors">−</button>
                                        <div class="flex-1 flex gap-0.5">
                                            <div v-for="i in char.grit_max" :key="'grit-' + i"
                                                 class="flex-1 h-3 rounded border border-amber-700 transition-all"
                                                 :class="i <= (char.grit_atual || 0) ? 'bg-amber-700' : 'bg-black/40'">
                                            </div>
                                        </div>
                                        <button @click.stop="alterarRecursoClasse(id, 'grit_atual', 1)" class="w-6 h-6 flex items-center justify-center bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700 text-amber-400 rounded text-sm transition-colors">+</button>
                                    </div>
                                </div>
                                
                                <!-- Alchemist: Controle de Bombas -->
                                <div v-if="char.classe === 'Alchemist' && char.bombas_restantes !== undefined" class="space-y-2">
                                    <div class="flex justify-between items-center text-xs text-gray-400">
                                        <span class="text-red-400">💣 Bombas</span>
                                        <span class="text-red-500 font-mono font-bold">{{ char.bombas_restantes || 0 }}/5</span>
                                    </div>
                                    <div class="flex gap-1 items-center">
                                        <button @click.stop="alterarRecursoClasse(id, 'bombas_restantes', -1)" class="w-6 h-6 flex items-center justify-center bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 rounded text-sm transition-colors">−</button>
                                        <div class="flex-1 flex gap-0.5">
                                            <div v-for="i in 5" :key="'bomba-' + i"
                                                 class="flex-1 h-3 rounded border border-red-700 transition-all"
                                                 :class="i <= (char.bombas_restantes || 0) ? 'bg-red-700' : 'bg-black/40'">
                                            </div>
                                        </div>
                                        <button @click.stop="alterarRecursoClasse(id, 'bombas_restantes', 1)" class="w-6 h-6 flex items-center justify-center bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 rounded text-sm transition-colors">+</button>
                                    </div>
                                </div>
                                
                                <!-- Guerreiro Ressonante: Controle de Ressonância -->
                                <div v-if="char.classe === 'GuerreirRessonante' && char.ressonancia_max" class="space-y-2">
                                    <div class="flex justify-between items-center text-xs text-gray-400">
                                        <span class="text-purple-400">⚡ Ressonância</span>
                                        <span class="text-purple-500 font-mono font-bold">{{ char.ressonancia_atual || 0 }}/{{ char.ressonancia_max }}</span>
                                    </div>
                                    <div class="flex gap-1 items-center">
                                        <button @click.stop="alterarRecursoClasse(id, 'ressonancia_atual', -1)" class="w-6 h-6 flex items-center justify-center bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700 text-purple-400 rounded text-sm transition-colors">−</button>
                                        <div class="flex-1 flex gap-0.5">
                                            <div v-for="i in char.ressonancia_max" :key="'ress-' + i"
                                                 class="flex-1 h-3 rounded border border-purple-700 transition-all"
                                                 :class="i <= (char.ressonancia_atual || 0) ? 'bg-purple-700' : 'bg-black/40'">
                                            </div>
                                        </div>
                                        <button @click.stop="alterarRecursoClasse(id, 'ressonancia_atual', 1)" class="w-6 h-6 flex items-center justify-center bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700 text-purple-400 rounded text-sm transition-colors">+</button>
                                    </div>
                                </div>
                                
                                <!-- Gunbreaker: Controle de Cartuchos -->
                                <div v-if="char.classe === 'Gunbreaker' && char.cartuchos_max" class="space-y-2">
                                    <div class="flex justify-between items-center text-xs text-gray-400">
                                        <span class="text-yellow-400">💥 Cartuchos</span>
                                        <span class="text-yellow-500 font-mono font-bold">{{ char.cartuchos_atual || 0 }}/{{ char.cartuchos_max }}</span>
                                    </div>
                                    <div class="flex gap-1 items-center">
                                        <button @click.stop="alterarRecursoClasse(id, 'cartuchos_atual', -1)" class="w-6 h-6 flex items-center justify-center bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-700 text-yellow-400 rounded text-sm transition-colors">−</button>
                                        <div class="flex-1 flex gap-0.5">
                                            <div v-for="i in char.cartuchos_max" :key="'cart-' + i"
                                                 class="flex-1 h-3 rounded border border-yellow-700 transition-all"
                                                 :class="i <= (char.cartuchos_atual || 0) ? 'bg-yellow-700' : 'bg-black/40'">
                                            </div>
                                        </div>
                                        <button @click.stop="alterarRecursoClasse(id, 'cartuchos_atual', 1)" class="w-6 h-6 flex items-center justify-center bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-700 text-yellow-400 rounded text-sm transition-colors">+</button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Armas -->
                            <div>
                                <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-700/50">
                                    <label class="text-xs uppercase tracking-widest text-amber-400 font-cinzel">⚔ Armas ({{ char.equipamentos?.length || 0 }})</label>
                                    <button @click.stop="showWeaponForm = !showWeaponForm" 
                                            class="w-7 h-7 flex items-center justify-center bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/50 text-amber-400 rounded transition-colors">
                                        <span class="material-symbols-outlined text-sm">{{ showWeaponForm ? 'remove' : 'add' }}</span>
                                    </button>
                                </div>

                                <!-- Formulário Nova Arma -->
                                <div v-if="showWeaponForm && selectedPlayer === id" class="weapon-form bg-black/50 rounded-lg p-3 mb-3 space-y-2 border-2 border-amber-700/50 backdrop-blur-sm">
                                    <div class="space-y-2">
                                        <input v-model="newWeapon.nome" 
                                               placeholder="Nome da arma" 
                                               class="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                                        <div class="grid grid-cols-2 gap-2">
                                            <input v-model="newWeapon.dano" 
                                                   placeholder="Dano (1d8+2)" 
                                                   class="bg-black/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                                            <input v-model="newWeapon.tipo" 
                                                   placeholder="Tipo" 
                                                   class="bg-black/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-amber-600 outline-none transition-colors">
                                        </div>
                                        <button @click.stop="adicionarArma(id)" 
                                                class="w-full bg-amber-700 hover:bg-amber-600 text-white font-cinzel py-2 rounded text-xs tracking-wider transition-colors uppercase">
                                            <span class="material-symbols-outlined text-sm align-middle mr-1">add_circle</span>Adicionar
                                        </button>
                                    </div>
                                </div>

                                <!-- Lista Armas -->
                                <div v-if="selectedPlayer === id" class="space-y-1 max-h-48 overflow-y-auto">
                                    <div v-for="(arma, idx) in selectedPlayerArmas" :key="idx" 
                                         class="bg-gradient-to-r from-amber-900/20 to-amber-900/10 hover:from-amber-900/30 hover:to-amber-900/20 rounded-lg p-3 flex justify-between items-start border border-amber-700/30 transition-all">
                                        <div class="flex-1">
                                            <p class="text-gray-200 font-cinzel text-sm flex items-center gap-2">
                                                <span class="material-symbols-outlined text-base">swords</span>
                                                {{ arma.nome }}
                                            </p>
                                            <p class="text-gray-500 text-[11px] mt-1">
                                                <span class="text-amber-400 font-mono">{{ arma.dano }}</span> 
                                                <span v-if="arma.tipo" class="ml-2 text-gray-600">{{ arma.tipo }}</span>
                                            </p>
                                        </div>
                                        <button @click.stop="removerArma(id, idx)" 
                                                class="ml-3 text-red-600/70 hover:text-red-500 transition-colors flex-shrink-0">
                                            <span class="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                    <div v-if="selectedPlayerArmas.length === 0" class="text-center text-gray-600 text-xs py-4">
                                        <span class="material-symbols-outlined text-base align-middle">info</span> Sem armas
                                    </div>
                                </div>
                            </div>

                            <!-- EDIÇÃO DE ATRIBUTOS (APENAS MESTRE) -->
                            <div v-if="selectedPlayer === id && isMestre && char.classe" class="mt-3 pt-3 border-t border-amber-700/50 space-y-3">
                                <div class="bg-amber-900/20 border border-amber-700/50 rounded p-3">
                                    <h4 class="font-cinzel text-amber-400 text-sm mb-3 uppercase">📊 Atributos</h4>
                                    <div class="grid grid-cols-3 gap-2">
                                        <div class="bg-black/40 rounded p-2 text-center">
                                            <p class="text-xs text-gray-500">FOR</p>
                                            <p class="text-lg font-bold text-red-400">{{ char.forca || 10 }}</p>
                                        </div>
                                        <div class="bg-black/40 rounded p-2 text-center">
                                            <p class="text-xs text-gray-500">DES</p>
                                            <p class="text-lg font-bold text-blue-400">{{ char.destreza || 10 }}</p>
                                        </div>
                                        <div class="bg-black/40 rounded p-2 text-center">
                                            <p class="text-xs text-gray-500">CON</p>
                                            <p class="text-lg font-bold text-green-400">{{ char.constituicao || 10 }}</p>
                                        </div>
                                        <div class="bg-black/40 rounded p-2 text-center">
                                            <p class="text-xs text-gray-500">INT</p>
                                            <p class="text-lg font-bold text-purple-400">{{ char.inteligencia || 10 }}</p>
                                        </div>
                                        <div class="bg-black/40 rounded p-2 text-center">
                                            <p class="text-xs text-gray-500">SAB</p>
                                            <p class="text-lg font-bold text-yellow-400">{{ char.sabedoria || 10 }}</p>
                                        </div>
                                        <div class="bg-black/40 rounded p-2 text-center">
                                            <p class="text-xs text-gray-500">CAR</p>
                                            <p class="text-lg font-bold text-pink-400">{{ char.carisma || 10 }}</p>
                                        </div>
                                    </div>
                                    <button @click.stop="abrirEditorAtributos(id)" class="w-full mt-3 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700 text-amber-400 py-2 rounded text-xs uppercase font-cinzel transition-colors">
                                        ✏️ Editar Atributos
                                    </button>
                                </div>
                            </div>

                            <!-- Status -->
                            <div v-if="char.status && char.status.length > 0">
                                <label class="text-xs uppercase tracking-widest text-gray-400 block mb-1">Status Ativos</label>
                                <div class="flex flex-wrap gap-1">
                                    <span v-for="status in char.status" :key="status" class="bg-red-900/30 border border-red-700/50 text-red-300 text-xs px-2 py-1 rounded">
                                        {{ status }}
                                    </span>
                                </div>
                            </div>

                            <!-- MARCAS DE CAÇADOR -->
                            <div v-if="char.marcas_de_cacador && char.marcas_de_cacador.length > 0" class="mt-3 pt-3 border-t border-gray-700/50">
                                <label class="text-xs uppercase tracking-widest text-yellow-400 font-cinzel block mb-3">🏹 Marcas de Caçador</label>
                                <div class="space-y-2">
                                    <div v-for="marca in char.marcas_de_cacador" :key="marca.id" 
                                         class="bg-black/40 rounded p-2 border"
                                         :class="(char.marcas_desbloqueadas?.[marca.id]) ? 'border-yellow-700 bg-yellow-900/20' : 'border-gray-700 bg-gray-900/20'">
                                        
                                        <div class="flex justify-between items-start gap-2">
                                            <div class="flex-1 text-[10px]">
                                                <p class="font-cinzel text-xs mb-1" 
                                                   :class="(char.marcas_desbloqueadas?.[marca.id]) ? 'text-yellow-300' : 'text-gray-500'">
                                                    {{ marca.nome }}
                                                </p>
                                                <p class="text-gray-400 leading-tight">{{ marca.descricao }}</p>
                                            </div>
                                            
                                            <button v-if="!char.marcas_desbloqueadas?.[marca.id]"
                                                    @click.stop="liberarMarca(id, marca.id)"
                                                    class="flex-shrink-0 text-xs bg-yellow-900/40 hover:bg-yellow-900/70 border border-yellow-700 text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded transition-colors whitespace-nowrap font-cinzel">
                                                🔓 Liberar
                                            </button>
                                            <div v-else class="flex-shrink-0 text-xs bg-green-900/40 border border-green-700 text-green-400 px-2 py-1 rounded whitespace-nowrap font-cinzel">
                                                ✅ Liberada
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Seleção de Classe -->
    <div v-if="showClassSelector" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div class="bg-[#1a1a1a] border-2 border-red-700 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 class="font-cinzel text-red-400 text-2xl mb-6 text-center">ESCOLHER CLASSE PARA {{ players[playerToAssignClass]?.nome || 'JOGADOR' }}</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div 
                    v-for="(classData, key) in classes" 
                    :key="key"
                    class="group relative bg-[#151515] border-2 border-red-900 hover:border-red-700 rounded-lg p-4 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    @click="atribuirClasse(key)">
                    
                    <h3 class="font-cinzel text-xl text-amber-400 mb-2">{{ classData.nome }}</h3>
                    
                    <div class="grid grid-cols-2 gap-2 text-[10px] mb-3">
                        <div class="bg-black/40 p-1 rounded">
                            <p class="text-gray-500">❤️ HP</p>
                            <p class="text-red-400 font-bold">{{ classData.hp_max }}</p>
                        </div>
                        <div class="bg-black/40 p-1 rounded">
                            <p class="text-gray-500">⚔️ CA</p>
                            <p class="text-amber-400 font-bold">{{ classData.ca }}</p>
                        </div>
                    </div>

                    <div class="w-full py-2 bg-gradient-to-r from-red-900/50 to-red-900/30 hover:from-red-800/70 hover:to-red-800/50 border border-red-700 text-amber-300 font-cinzel rounded text-xs transition-all uppercase text-center pointer-events-none">
                        Selecionar
                    </div>
                </div>
            </div>

            <button 
                @click="showClassSelector = false"
                class="w-full py-3 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 text-gray-300 rounded text-sm transition-colors">
                Cancelar
            </button>
        </div>
    </div>

    <!-- Modal de Edição de Status -->
    <div v-if="showStatusEditor" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div class="bg-[#1a1a1a] border-2 border-amber-700 rounded-lg p-6 max-w-2xl w-full shadow-2xl">
            <h2 class="font-cinzel text-amber-400 text-2xl mb-6 text-center">
                {{ jogadorEmEdicao ? 'EDITAR ATRIBUTOS' : 'DEFINIR ATRIBUTOS' }} - {{ jogadorEmEdicao ? players[jogadorEmEdicao]?.nome : players[playerToAssignClass]?.nome }} {{ !jogadorEmEdicao ? 'JOGADOR' : ''}}
            </h2>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <!-- Força -->
                <div class="bg-[#151515] border border-gray-700 rounded p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-cinzel text-red-400">💪 FORÇA</label>
                        <span class="text-xl font-bold text-red-400">{{ statusTemporario.forca }}</span>
                    </div>
                    <input v-model.number="statusTemporario.forca" type="range" min="3" max="20" class="w-full">
                    <p class="text-xs text-gray-500 mt-1">Modificador: {{ Math.floor((statusTemporario.forca - 10) / 2) }}</p>
                </div>

                <!-- Destreza -->
                <div class="bg-[#151515] border border-gray-700 rounded p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-cinzel text-blue-400">🎯 DESTREZA</label>
                        <span class="text-xl font-bold text-blue-400">{{ statusTemporario.destreza }}</span>
                    </div>
                    <input v-model.number="statusTemporario.destreza" type="range" min="3" max="20" class="w-full">
                    <p class="text-xs text-gray-500 mt-1">Modificador: {{ Math.floor((statusTemporario.destreza - 10) / 2) }}</p>
                </div>

                <!-- Constituição -->
                <div class="bg-[#151515] border border-gray-700 rounded p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-cinzel text-green-400">❤️ CONSTITUIÇÃO</label>
                        <span class="text-xl font-bold text-green-400">{{ statusTemporario.constituicao }}</span>
                    </div>
                    <input v-model.number="statusTemporario.constituicao" type="range" min="3" max="20" class="w-full">
                    <p class="text-xs text-gray-500 mt-1">Modificador: {{ Math.floor((statusTemporario.constituicao - 10) / 2) }}</p>
                </div>

                <!-- Inteligência -->
                <div class="bg-[#151515] border border-gray-700 rounded p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-cinzel text-purple-400">🧠 INTELIGÊNCIA</label>
                        <span class="text-xl font-bold text-purple-400">{{ statusTemporario.inteligencia }}</span>
                    </div>
                    <input v-model.number="statusTemporario.inteligencia" type="range" min="3" max="20" class="w-full">
                    <p class="text-xs text-gray-500 mt-1">Modificador: {{ Math.floor((statusTemporario.inteligencia - 10) / 2) }}</p>
                </div>

                <!-- Sabedoria -->
                <div class="bg-[#151515] border border-gray-700 rounded p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-cinzel text-yellow-400">👁️ SABEDORIA</label>
                        <span class="text-xl font-bold text-yellow-400">{{ statusTemporario.sabedoria }}</span>
                    </div>
                    <input v-model.number="statusTemporario.sabedoria" type="range" min="3" max="20" class="w-full">
                    <p class="text-xs text-gray-500 mt-1">Modificador: {{ Math.floor((statusTemporario.sabedoria - 10) / 2) }}</p>
                </div>

                <!-- Carisma -->
                <div class="bg-[#151515] border border-gray-700 rounded p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-cinzel text-pink-400">✨ CARISMA</label>
                        <span class="text-xl font-bold text-pink-400">{{ statusTemporario.carisma }}</span>
                    </div>
                    <input v-model.number="statusTemporario.carisma" type="range" min="3" max="20" class="w-full">
                    <p class="text-xs text-gray-500 mt-1">Modificador: {{ Math.floor((statusTemporario.carisma - 10) / 2) }}</p>
                </div>
            </div>

            <div class="flex gap-3">
                <button 
                    @click="jogadorEmEdicao ? salvarAtributosEditados() : finalizarAtribuicao()"
                    class="flex-1 py-3 bg-gradient-to-r from-green-900/60 to-green-900/40 hover:from-green-800/80 hover:to-green-800/60 border border-green-700 text-green-300 rounded text-sm transition-colors uppercase font-cinzel font-bold">
                    ✓ {{ jogadorEmEdicao ? 'Salvar' : 'Confirmar' }}
                </button>
                <button 
                    @click="showStatusEditor = false; if (!jogadorEmEdicao) showClassSelector = true; jogadorEmEdicao = null"
                    class="flex-1 py-3 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 text-gray-300 rounded text-sm transition-colors uppercase">
                    {{ jogadorEmEdicao ? 'Cancelar' : 'Voltar' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Modal do Gunslinger Creator -->
    <GunslingerCreator 
        v-model="showGunslingerCreator"
        :player-name="currentGunslingerPlayer ? (players[currentGunslingerPlayer]?.nome || 'Caçador') : 'Caçador'"
        @create="criarGunslinger"
    />
</div>
</template>

<style scoped>
/* Animação de expansão */
.player-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-card.selected {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0.9;
        max-height: 150px;
    }
    to {
        opacity: 1;
        max-height: 500px;
    }
}

/* Range Input Customizado */
input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    background: #2a2a2a;
    border-radius: 5px;
    outline: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #d97706, #b45309);
    border: 2px solid #f59e0b;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(217, 119, 6, 0.4);
    transition: all 0.2s;
}

input[type="range"]::-webkit-slider-thumb:hover {
    width: 18px;
    height: 18px;
    box-shadow: 0 0 12px rgba(217, 119, 6, 0.6);
}

input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #d97706, #b45309);
    border: 2px solid #f59e0b;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(217, 119, 6, 0.4);
    transition: all 0.2s;
}

input[type="range"]::-moz-range-thumb:hover {
    width: 18px;
    height: 18px;
    box-shadow: 0 0 12px rgba(217, 119, 6, 0.6);
}

/* Efeito de hover em botões */
button {
    position: relative;
    overflow: hidden;
}

button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
}

button:hover::before {
    left: 100%;
}

/* Estilos para modal de armas */
.weapon-form {
    animation: fadeInDown 0.3s ease-out;
}

@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Cards com glassmorphism melhorado */
.glass-card {
    background: linear-gradient(135deg, rgba(10, 10, 10, 0.5) 0%, rgba(26, 26, 26, 0.3) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(217, 119, 6, 0.1);
    transition: all 0.3s ease;
}

.glass-card:hover {
    border-color: rgba(217, 119, 6, 0.3);
    box-shadow: 0 8px 32px rgba(217, 119, 6, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.05);
}

/* Scroll suave para listas */
.overflow-y-auto {
    scroll-behavior: smooth;
}

/* Tooltip-like effect */
.stat-badge {
    position: relative;
    transition: all 0.2s ease;
}

.stat-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>