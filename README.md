# 🩸 Bloodborne: Tabletop Companion

<div align="center">
  <img src="./src/assets/yharnam-hero.png" alt="Bloodborne - A Hunter stands before Yharnam" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
</div>

> **Um aplicativo web realtime para mestres e jogadores de RPG de mesa temático de Bloodborne**

Um aplicativo web moderno e responsivo construído para auxiliar mestres e jogadores em campanhas de RPG de mesa temáticas de Bloodborne. O objetivo é substituir fichas de papel por uma interface digital interativa e imersiva.

**Características principais:**
- 📱 Interface totalmente responsiva (celulares, tablets, desktops)
- 🎮 Painel completo para mestres (gerenciamento de sessões e personagens)
- ⚡ Sincronização em tempo real com Firebase Realtime Database
- 🎭 Design temático gótico com estética Soulslike inspirada em Yharnam
- 🔄 Sistema de sessões com IDs únicos para múltiplos grupos
- 🎲 Suporte para múltiplos jogadores por sessão

**Stack tecnológico:** Vite + Vue 3 + Tailwind CSS + Firebase Realtime Database + Composition API

---

## 🌐 Demo ao Vivo

**[Acesse o aplicativo aqui](https://bloodborne-rpg.vercel.app/#/)** *(Vercel)*

---

## ✨ Funcionalidades

### Sistema de Sessões 🔐
- **Criação de Sessão pelo Mestre:** Gera um ID único de 6 caracteres
- **Entrada de Jogadores:** Jogadores entram com ID da sessão + nome do personagem
- **Sincronização em Tempo Real:** Todos os dados são sincronizados instantaneamente via Firebase
- **Auto-Redirect:** Jogadores são redirecionados automaticamente quando a ficha é atribuída
- **Gerenciamento de Personagens:** Mestre pode atribuir fichas e remover jogadores

### Jogador 👤
- **Ficha de Personagem Responsiva:** Visualize e acompanhe Vida, Frascos de Sangue, Balas de Prata e Status
- **Design Mobile-First:** Interface otimizada para celulares com breakpoints para tablet e desktop
- **Sincronização Instantânea:** Qualquer mudança do mestre aparece em tempo real na ficha
- **Smooth Scrolling:** Navegação suave entre seções da ficha
- **Indicadores Visuais:** Barras de status animadas e efeitos especiais destacados
- **Atributos Adaptáveis:** Labels abreviados em dispositivos móveis para melhor legibilidade
- **Proteção de Atributos:** Jogadores não podem modificar atributos (apenas mestre pode editar pós-atribuição)
- **Aba de Notas Expandida:** 
  - 📖 Descrição detalhada da classe (mecânicas e estratégias)
  - ⭐ Talentos com descrições individuais para melhor compreensão das habilidades
- **Sem Botões de Ação Não-Autorizados:** Botões de rolar dados e modificadores removidos para jogadores

### Mestre 🎭
- **Painel de Controle Completo:** Gerencie vida, aplicar efeitos especiais e controlar sessões
- **Templates de Ficha:** Atribua arquétipos pré-definidos com um clique
- **Tracker de Iniciativa Sincronizado:** Sistema de combate integrado com ordem de turnos
- **Lobby de Sessão:** Gerenciar entrada de jogadores e atribuição de personagens
- **Efeitos Especiais:** Aplique status como Frenesi, Veneno e outros em tempo real
- **Dashboard Intuitivo:** Interface organizada com múltiplos painéis para controle total
- **Edição Pós-Atribuição:** Mestres podem editar atributos de jogadores após a atribuição inicial
- **Interface Limpa:** Descrições mecânicas removidas do modal de atribuição para melhor usabilidade

#### ✨ Master Dashboard - Melhorias Recentes (v1.1.0)
- **🔍 Filtro de Pesquisa:** Busque jogadores em tempo real por nome
- **📊 HP Bar Dinâmica:** Barra visual com cores que mudam com HP (Verde → Amarelo → Laranja → Vermelho)
- **⚔ Gerenciamento de Armas Aprimorado:** Interface intuitiva para adicionar/remover equipamentos
- **🎯 Indicador de Arquétipo:** Visualize a primeira arma/classe de cada jogador no card
- **🎨 Glassmorphism Redesignado:** Painéis com efeitos visuais aprimorados e animações suaves
- **📱 Responsividade 4-Coluna:** Layout otimizado (1 combate sticky + 3 colunas de jogadores)
- **⚡ Slider de HP Customizado:** Controle de HP com efeitos de brilho e cores Bloodborne

Veja [MASTER_DASHBOARD_IMPROVEMENTS.md](./MASTER_DASHBOARD_IMPROVEMENTS.md) para detalhes completos.

### 🎲 Sistema de Combate Detalhado

O sistema de combate é baseado em rodadas com iniciativa e ações organizadas em turnos. Aqui está como funciona:

#### **Iniciativa & Ordem de Turnos**
- **Cálculo:** Rolagem de `1d20 + modificador de Destreza`
- **Função:** Determina a ordem de ação dos combatentes
- **UI:** Tracker de iniciativa sincronizado em tempo real mostra quem passa
- **Mestre controla:** Inicia combate, define ordem, avança turnos

#### **Recursos de Combate por Classe**

**🔫 Gunslinger - Grit (Bravura)**
- **Máximo:** Modificador de Sabedoria (geralmente 2-3 pontos)
- **Quando Recupera:**
  - Ao matar um inimigo +1 ponto
  - Ao acertar um crítico (19-20) +1 ponto
  - Ao completar descanso curto volta ao máximo
- **O que Faz:** Gaste 1 Grit para...
  - **Tiros de Truque:** Desarmação (CON) ou Queda Prone (FOR)
  - **Vantagem em Tiro:** Próximo ataque à distância rola 2d20 (pega maior)
  - **Olhar de Mercúrio:** Reação se inimigo errar atacar corpo, você tira (3 dano psíquico)
- **Mecânica Única:** Se errar com Olhar de Mercúrio, sofre 3 dano psíquico (fardo)

**🧪 Alchemist - Bombas Alquímicas**
- **Ação:** Jogar bomba (ação, não ação bônus)
- **Alcance:** 30 pés (9 metros)
- **Dano:** `2d8 + INT modificador` de Fogo ou Ácido (escolhe antes de jogar)
- **Área:** 5x5 pés (pequena explosão)
- **Frequência:** Sem limite por rodada, mas limita por disponibilidade de bombas
- **Salva:** Alvo dentro da área faz salvação de DEX para metade do dano
- **Construir Bombas:** Descanso curto cria 3 bombas novas (materiais da Igreja)

**🩸 Blood Cursed - Transformação & Frenesi**
- **Transformação:** Ação de bônus, dura concentração (até 1 minuto)
  - Ganhar +1d6 em dano de ataque corpo-a-corpo
  - Auto-dano: 1d4 dano por rodada (inevitável)
  - Bônus de força temporário +2
  - Pode manter concentração em combate
- **Frenesi (Medidor de Sangue):** 0-10 pontos
  - **0-3:** Nenhum efeito
  - **4-7:** Vantagem em ataques, desvantagem em testes mentais
  - **8-10:** Sai do controle, ataca aliados também (role INT CD 15 pra evitar)
- **Redução:** Descanso curto (CD 14) reduz 3 pontos | Descanso longo volta a 0

**⚔️ Guerreiro Ressonante - Reação de Sentinela**
- **Habilidade:** Reação (não custa ação, reage ao evento)
  - Quando inimigo se move perto: ataque de oportunidade **reduz movimento pra 0**
  - Quando aliado é atacado: reação pra contraatacar inimigo
- **Frequência:** Uma reação por rodada (depois precisa descansar)
- **Tática:** Bloqueia movimento inimigo, protege aliados

**🔧 Gunbreaker - Armas Grandes & Mecanismo**
- **Dano:** +1d6 com armas de duas mãos (além do d8/d10 normal)
- **Reparação:** Descanso curto conserta armas quebradas (precisa ferramentas)
- **Criação:** Pode fabricar munição especial durante descanso (10 balas por descanso)
- **Ofício:** Vantagem em testes com mecanismos (explosivos, armadilhas)

#### **Ações por Turno**
- **Ação Principal:** Ataque, Magia, Habilidade (Bomba, Transformação, etc.)
- **Ação Bônus:** Movimento extra, Interação simples
- **Reação:** Resposta a evento (Olhar de Mercúrio, Sentinela, esquivar)
- **Deslocamento:** Por turno (varia por classe, 9-30 pés)

#### **Sangramentos & Efeitos Contínuos**
- **Sangue Gasto:** Quando usa Cura Rápida, Impulso ou Resistência ao Horror
  - Recupera todos no descanso longo (8 horas)
  - Pode gastar máximo 3 por combate normalmente
- **Status Aplicáveis:** Mestre aplica via Dashboard
  - Envenenado: Desvantagem em ataques, 1d4 dano no fim do turno
  - Fraturado: Movimento reduzido à metade, DEX reduzida
  - Cegueira: Desvantagm em ataques a distância

#### **Mestre - Como Controlar Combate**
1. **Iniciar Combate** → Clica em "Iniciar Combate" no Dashboard
2. **Definir Ordem** → Sistema calcula iniciativas automático
3. **Avançar Rodada** → Clica "Próximo Turno" a cada ação importante
4. **Aplicar Efeitos** → Mestre modifica HP, Status, Frenesi em tempo real
5. **Terminar Combate** → Cenas finalizam quando inimigos são derrotados

#### **Sincronização Realtime**
- Qualquer mudança do mestre aparece **instantaneamente** na ficha do jogador
- Jogador vê HP, Status, Efeitos atualizar em tempo real (sem refresh)
- Combate fica justo e transparente para todos

### Design & Estética 🎨
- **Soulslike Visual:** Fontes Cinzel (títulos), Playfair Display (descrições), Material Symbols (ícones)
- **Glassmorphism:** Painéis com efeito de vidro e bordas ornamentadas
- **Responsividade Completa:** 5 níveis de breakpoints (xs, sm, md, lg, xl)
  - Login totalmente responsivo com modais adaptativos
  - Layouts fluidos que funcionam em qualquer dispositivo
- **Smooth Animations:** Transições suaves e comportamento de scroll otimizado
- **Dark Theme:** Design escuro imersivo inspirado em Yharnam
- **Acessibilidade:** Contraste adequado e tamanhos de fonte adaptativos
- **Favicon Personalizado:** Logo SVG como favicon da aba do navegador

---

## 🛠️ Tech Stack

| Área | Tecnologia | Descrição |
|------|-----------|-----------|
| **Framework** | [Vue 3](https://vuejs.org/) | Composition API para componentes reativos |
| **Build** | [Vite](https://vitejs.dev/) | Build tool rápido e moderno |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |
| **Roteamento** | [Vue Router](https://router.vuejs.org/) | Navegação entre views |
| **Banco de Dados** | [Firebase Realtime DB](https://firebase.google.com/products/realtime-database) | Sincronização realtime |
| **Hospedagem** | Firebase Hosting | (Planejado) |

---

## 🚀 Guia de Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18.0 ou superior
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Conta no [Firebase](https://firebase.google.com/) (gratuita)

### Passos para Configuração

#### 1️⃣ Clone o repositório

```bash
git clone https://github.com/SEU-USUARIO/bloodborne-rpg.git
cd bloodborne-rpg
```

#### 2️⃣ Instale as dependências

```bash
npm install
```

#### 3️⃣ Configure o Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto (ou use um existente)
3. Ative o **Realtime Database** no modo de teste
4. Copie suas credenciais
5. Renomeie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
6. Preencha as variáveis com suas credenciais do Firebase:
   ```env
   VITE_API_KEY=sua_api_key
   VITE_AUTH_DOMAIN=seu_project.firebaseapp.com
   VITE_DATABASE_URL=https://seu_project.firebaseio.com
   VITE_PROJECT_ID=seu_project_id
   VITE_STORAGE_BUCKET=seu_project.appspot.com
   VITE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_APP_ID=seu_app_id
   ```

⚠️ **Nunca compartilhe o arquivo `.env`** - Ele contém credenciais sensíveis e está no `.gitignore`

#### 4️⃣ Inicie o servidor de desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

---

## 📦 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento (Vite)
npm run build    # Compila para produção
npm run preview  # Previsualiza build de produção localmente
```

## 📋 Estrutura do Projeto

```
bloodborne-rpg/
├── src/
│   ├── components/               # Componentes Vue reutilizáveis
│   │   ├── InitiativeTracker.vue # Tracker de iniciativa integrado
│   │   ├── CharacterCreator.vue  # Criador de personagem
│   │   ├── ClassSelector.vue     # Seletor de classe
│   │   ├── GunslingerCreator.vue # Creator específico para Gunslinger
│   │   ├── HunterArchive.vue     # Arquivo de caçadores
│   ├── views/                    # Páginas principais
│   │   ├── Login.vue             # Seleção Mestre/Jogador (Responsivo)
│   │   ├── SessionSetup.vue      # Criação de sessão (Mestre)
│   │   ├── SessionLobby.vue      # Lobby de sessão
│   │   ├── ApprovedLobby.vue     # Sala de espera (Jogador)
│   │   ├── MasterDashboard.vue   # Dashboard do Mestre com edição de atributos
│   │   ├── PlayerSheet.vue       # Ficha responsiva do Jogador (protegida)
│   │   └── PlayerSheet.vue.backup # Backup da ficha
│   ├── router/                   # Configuração de rotas (Vue Router)
│   ├── services/                 # Integração com Firebase
│   │   └── firebase.js           # Funções realtime + CRUD
│   ├── assets/                   # Imagens, ícones, logos
│   │   ├── yharnam-hero.png      # Imagem hero do Bloodborne
│   │   └── logo.svg              # Logo personalizado
│   ├── App.vue                   # Componente raiz
│   ├── main.js                   # Arquivo de entrada
│   └── style.css                 # Estilos globais + smooth scroll
├── classes/                      # Arquivos de definição de classes (ignorado no git)
├── fichas/                       # Arquivos de fichas de personagem (ignorado no git)
├── marca_cacador/                # Arquivos de marcas de caçador (ignorado no git)
├── index.html                    # HTML principal com favicon SVG
├── .env.example                  # Variáveis de ambiente (template)
├── .gitignore                    # Arquivos ignorados pelo Git (inclui classes/, fichas/, marca_cacador/)
├── tailwind.config.js            # Configuração Tailwind CSS
├── vite.config.js                # Configuração Vite
├── postcss.config.js             # Configuração PostCSS
├── package.json                  # Dependências e scripts
└── README.md                     # Este arquivo
```

---

## 📝 Roadmap & Próximos Passos

Este projeto está em desenvolvimento ativo. Aqui estão as funcionalidades planejadas:

### ✅ Concluído
- [x] Sistema de sessões com IDs únicos
- [x] Sincronização realtime com Firebase
- [x] Ficha de personagem responsiva
- [x] Dashboard do mestre funcional
- [x] Tracker de iniciativa integrado
- [x] Design Soulslike com estética profissional
- [x] Responsividade completa (mobile-first) - Login incluído
- [x] Smooth scrolling e animações
- [x] **5 Classes com Descrições Detalhadas** (Gunslinger, Alchemist, Blood Cursed, Guerreiro Ressonante, Gunbreaker)
- [x] **Sistema de Proteção de Atributos** - Jogadores não podem modificar atributos
- [x] **Remoção de Botões Não-Autorizados** - Botões de ação removidos para jogadores
- [x] **Aba de Notas Expandida** - Descrições de classe e talentos para jogadores
- [x] **Edição Pós-Atribuição** - Mestres podem editar atributos após atribuição
- [x] **Optimização de UI do Master** - Descrições removidas do modal de atribuição
- [x] **Favicon Personalizado** - Logo SVG na aba do navegador

### 🔄 Em Progresso
- [ ] Sistema de rolagem de dados virtual
- [ ] Biblioteca de monstros e NPCs
- [ ] Sistema de habilidades especiais
- [ ] Melhorias na UX do lobby

### 📋 Planejado para v1.0
- [ ] Inventário detalhado com itens e descrições
- [ ] Autenticação de usuários (Google/Email)
- [ ] Salvamento de personagens entre sessões
- [ ] Histórico de combate e estatísticas
- [ ] Deploy no Firebase Hosting
- [ ] Modo offline com sincronização posterior

### 🚀 Ideias Futuras
- [ ] Sistema de experiência e progressão
- [ ] Chat integrado na sessão
- [ ] Suporte para múltiplas campanhas paralelas
- [ ] Importação/exportação de personagens
- [ ] Temas visuais (já tem dark theme)
- [ ] App nativa (PWA ou Electron)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. **Fork** o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### Diretrizes de Contribuição
- Siga o estilo de código do projeto
- Teste suas mudanças antes de abrir PR
- Descreva claramente o que você mudou
- Referencie issues relacionadas

---

## 📖 Documentação

- [Guia de Desenvolvimento](./docs/DEVELOPMENT.md) *(planejado)*
- [Arquitetura do Projeto](./docs/ARCHITECTURE.md) *(planejado)*
- [Troubleshooting](./docs/TROUBLESHOOTING.md) *(planejado)*

---

## 🐛 Reportando Issues

Encontrou um bug? Abra uma [issue](https://github.com/Pedro-Martins-Nascimento/bloodborne-rpg/issues) com:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs real
- Screenshots (se aplicável)

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE) - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

**Pedro Martins Nascimento** - [GitHub](https://github.com/Pedro-Martins-Nascimento)

---

## 🙏 Agradecimentos

- Fromsoft por Bloodborne, que inspirou este projeto
- Comunidade Vue.js por excelentes ferramentas e documentação
- Firebase por infraestrutura realtime confiável
- Todos os contribuidores e testers

---

## 📞 Suporte

Se tiver dúvidas ou sugestões:
- Abra uma [issue](https://github.com/Pedro-Martins-Nascimento/bloodborne-rpg/issues)
- Confira as discussões do projeto

**Divirta-se matando bestas!** 🩸