# 🩸 Bloodborne: Tabletop Companion

<div align="center">
  <img src="./src/assets/yharnam-hero.png" alt="Bloodborne - A Hunter stands before Yharnam" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
</div>

> **Um aplicativo web realtime para mestres e jogadores de RPG de mesa temático de Bloodborne**

Um aplicativo web moderno e responsivo construído para auxiliar mestres e jogadores em campanhas de RPG de mesa temáticas de Bloodborne. O objetivo é substituir fichas de papel por uma interface digital interativa e imersiva.

**Características principais:**
- 📱 Interface otimizada para celulares (jogadores)
- 🎮 Painel completo para mestres (web/desktop)
- ⚡ Sincronização em tempo real de todos os dados
- 🎭 Design temático gótico inspirado em Yharnam

**Stack tecnológico:** Vite + Vue 3 + Tailwind CSS + Firebase Realtime Database

---

## 🌐 Demo ao Vivo

**[Acesse o aplicativo aqui](https://bloodborne-rpg.vercel.app/#/)** *(Vercel)*

---

## ✨ Funcionalidades

### Jogador 👤
- **Ficha de Personagem Dinâmica:** Visualize e acompanhe Vida, Frascos de Sangue, Balas de Prata e Status em tempo real
- **Sincronização Instantânea:** Qualquer mudança do mestre aparece imediatamente na ficha
- **Interface Minimalista:** Design limpo e responsivo focado em facilitar a leitura durante a sessão

### Mestre 🎭
- **Painel de Controle Completo:** Gerencie a vida, aplicar efeitos especiais e controlar a sessão
- **Templates de Ficha:** Atribua arquétipos pré-definidos (Caçador do Machado, Cutelo, etc.) com um clique
- **Tracker de Iniciativa Sincronizado:** Sistema de combate completo onde você define a ordem e controla os turnos
- **Lobby de Sessão:** Jogadores entram com seus nomes e aguardam atribuição de fichas
- **Efeitos Especiais:** Aplique status como Frenesi, Veneno e outros em tempo real
- **Notificações em Tempo Real:** Todos os jogadores são notificados instantaneamente sobre mudanças

### Geral 🎮
- **Interface Imersiva:** Design e fontes inspirados na estética gótica de Yharnam
- **Totalmente Responsivo:** Funciona perfeitamente em celulares, tablets e desktops
- **Segurança:** Credenciais do Firebase gerenciadas de forma segura com variáveis de ambiente

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
│   ├── components/          # Componentes Vue reutilizáveis
│   │   └── InitiativeTracker.vue
│   ├── views/               # Páginas principais
│   │   ├── Login.vue
│   │   ├── MasterDashboard.vue
│   │   └── PlayerSheet.vue
│   ├── router/              # Configuração de rotas
│   ├── services/            # Integração com Firebase
│   │   └── firebase.js
│   ├── assets/              # Imagens, ícones, etc
│   ├── App.vue              # Componente raiz
│   ├── main.js              # Arquivo de entrada
│   └── style.css            # Estilos globais
├── index.html               # HTML principal
├── .env.example             # Variáveis de ambiente (template)
├── .gitignore               # Arquivos ignorados pelo Git
├── tailwind.config.js       # Configuração Tailwind CSS
├── vite.config.js           # Configuração Vite
├── postcss.config.js        # Configuração PostCSS
├── package.json             # Dependências e scripts
└── README.md                # Este arquivo
```

---

## 📝 Roadmap & Próximos Passos

Este projeto está em desenvolvimento ativo. Aqui estão as funcionalidades planejadas:

### 🔄 Em Progresso
- [ ] Sistema de rolagem de dados virtual
- [ ] Biblioteca de monstros e NPCs para o mestre
- [ ] Sistema de habilidades especiais dos personagens

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
- [ ] Suporte para múltiplas campanhas
- [ ] Importação/exportação de personagens
- [ ] Dark mode completo
- [ ] App nativa (PWA ou React Native)

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

Encontrou um bug? Abra uma [issue](https://github.com/SEU-USUARIO/bloodborne-rpg/issues) com:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs real
- Screenshots (se aplicável)

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE) - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

**Pedro** - [GitHub](https://github.com/SEU-USUARIO)

---

## 🙏 Agradecimentos

- Fromsoft por Bloodborne, que inspirou este projeto
- Comunidade Vue.js por excelentes ferramentas e documentação
- Todos os contribuidores e testers beta

---

## 📞 Suporte

Se tiver dúvidas ou sugestões:
- Abra uma [issue](https://github.com/SEU-USUARIO/bloodborne-rpg/issues)
- Entre em contato via email
- Confira as discussões do projeto

**Divirta-se matando bestas!** 🩸