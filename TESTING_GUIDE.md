# 🚀 Guia de Teste - Master Dashboard

## ⚡ Como Começar

### 1. Servidor em Execução
O Vite está rodando em: **http://localhost:5174/**

### 2. Navegação
```
Login → Selecione "Mestre" → Crie Sessão (ou use URL direta)
```

### 3. Acessar Master Dashboard
```
http://localhost:5174/mestre/[SESSION_ID]
```

---

## ✅ Checklist de Testes

### Interface Layout
- [ ] Layout 4-colunas visível em desktop (1 combate + 3 jogadores)
- [ ] Painel de combate sticky (fixado no topo)
- [ ] Cards de jogadores em grid responsivo
- [ ] Header com "PAINEL DO MESTRE" em amber-100
- [ ] Sessão ID visível em vermelho

### Filtro de Busca
- [ ] Campo "Filtrar jogadores..." aparece
- [ ] Digitar nome filtra jogadores
- [ ] Contador atualiza corretamente
- [ ] Mensagem "Nenhum jogador encontrado" aparece

### Cards de Jogadores (Não Expandido)
- [ ] Nome + Nível + Arquétipo (primeira arma) aparecem
- [ ] Stats rápidos com barra HP visual
- [ ] Cores corretas:
  - [ ] Verde (75%+)
  - [ ] Amarelo (50-75%)
  - [ ] Laranja (25-50%)
  - [ ] Vermelho (<25%)
- [ ] Botão Reset funciona
- [ ] Border muda ao passar mouse

### Expansão de Card
- [ ] Clique expande o card suavemente
- [ ] Clique novamente recolhe
- [ ] Formulário de arma visível ao expandir
- [ ] Controle de HP visível ao expandir
- [ ] Status Ativos aparecem se existirem

### Gerenciamento de Armas
- [ ] Botão + abre formulário
- [ ] Botão - fecha formulário
- [ ] Campos: Nome, Dano, Tipo aparecem
- [ ] "Adicionar Arma" funciona
- [ ] Nova arma aparece na lista
- [ ] Botão X remove arma
- [ ] Lista tem max-height com scroll
- [ ] Ícone de espada aparece

### Controle de HP
- [ ] Barra de range aparece ao expandir
- [ ] Slider move suavemente
- [ ] Cor muda em tempo real
- [ ] Valor sincroniza com Firebase (se modo sessão)
- [ ] Efeito glow no slider ao hover

### Sistema de Combate
- [ ] Botão "+ Adicionar Monstro" cria entradas
- [ ] Campo de iniciativa funciona
- [ ] Iniciativa de jogadores conectados aparece
- [ ] Botão "Iniciar Combate" muda layout
- [ ] Ordem de turnos aparece corretamente
- [ ] Próximo Turno funciona
- [ ] Encerrar Combate volta ao setup

### Seção Aguardando Ficha
- [ ] Jogadores não aprovados aparecem aqui
- [ ] Templates de arquétipo aparecem
- [ ] Clique em template carrega ficha
- [ ] Jogador move para seção "Conectados"
- [ ] Botão Expulsar funciona

---

## 🎮 Cenários de Teste Detalhados

### Cenário 1: Testar Filtro
```
1. Tenha 3+ jogadores conectados
2. Abra "Filtrar jogadores..."
3. Digite "Ca" (deve filtrar "Caçador")
4. Digite "xyz" (deve mostrar "Nenhum encontrado")
5. Limpe a busca (deve mostrar todos novamente)
✅ Esperar: Filtro em tempo real funcionando
```

### Cenário 2: Testar HP Dinâmico
```
1. Expanda um card de jogador
2. Use o slider para ajustar HP para 100% (verde)
3. Ajuste para 60% (amarelo)
4. Ajuste para 30% (laranja)
5. Ajuste para 5% (vermelho)
✅ Esperar: Cores mudarem conforme HP
```

### Cenário 3: Testar Armas
```
1. Expanda card e clique em +
2. Nome: "Pé Grande"
3. Dano: "2d6"
4. Tipo: "Impacto"
5. Clique "Adicionar"
6. Veja arma na lista
7. Clique × para remover
8. Confirme remoção
✅ Esperar: Arma adicionada/removida com sucesso
```

### Cenário 4: Testar Responsividade
```
1. Abra DevTools (F12)
2. Redimensione para tablet (768px)
   - Cards em 2 colunas?
   - Combate em coluna inteira?
3. Redimensione para mobile (375px)
   - Cards em 1 coluna?
   - Tudo empilhado?
4. Volte ao desktop
✅ Esperar: Layout responsivo em todos os tamanhos
```

### Cenário 5: Testar Combate
```
1. Tenha 2+ jogadores conectados
2. Clique "+ Adicionar Monstro"
3. Nome: "Besta"
4. Iniciativa: 15
5. Adicione Iniciativa para jogadores
6. Clique "Iniciar Combate"
7. Veja ordem de turnos
8. Clique "Próximo Turno" 2x
9. Clique "Encerrar"
✅ Esperar: Combate funcionando sem erros
```

---

## 🐛 Possíveis Bugs a Procurar

### Problemas de Renderização
```
❌ Cards não expandem ao clicar
❌ Estilos glass-panel não aparecem
❌ Ícones não carregam
❌ Cores não mudam no HP bar
```

### Problemas de Funcionalidade
```
❌ Filtro não funciona
❌ Arma não é adicionada
❌ HP não sincroniza com Firebase
❌ Slider travado
❌ Combate não inicia
```

### Problemas de Responsividade
```
❌ Layout quebra em tablet
❌ Texto cortado em mobile
❌ Elementos sobrepostos
❌ Scroll não funciona
```

### Problemas de Performance
```
❌ Lag ao expandir card
❌ Animações travadas
❌ Scroll lento
❌ Firebase lento
```

---

## 📊 Testes de Dados

### Estrutura de Dados Esperada
```javascript
{
  "id": "player123",
  "nome": "Caçador Valente",
  "hp_max": 24,
  "hp_atual": 18,
  "frascos": 5,
  "balas": 8,
  "level": 1,
  "equipamentos": [
    {
      "nome": "Machado de Caçador",
      "dano": "1d8+2",
      "tipo": "Machado"
    }
  ],
  "status": ["Envenenado"],
  "esperando": false,
  "aprovado": true
}
```

### Teste de Dados de HP
```javascript
// Verde (75%+)
hp_atual: 18, hp_max: 24 → 75% ✅

// Amarelo (50-75%)
hp_atual: 15, hp_max: 24 → 62.5% ✅

// Laranja (25-50%)
hp_atual: 10, hp_max: 24 → 41.6% ✅

// Vermelho (<25%)
hp_atual: 5, hp_max: 24 → 20.8% ✅
```

---

## 🔗 URLs de Teste

### Local Development
```
Main: http://localhost:5174/
Master: http://localhost:5174/mestre/TEST123
Player: http://localhost:5174/player/TEST123
Login: http://localhost:5174/
```

### Com Parâmetro de Sessão
```
/mestre/ABC123DEF
/mestre/XYZ789
/mestre/SESSION001
```

---

## 📝 Relatório de Teste

Ao testar, anote:

```markdown
## Teste Realizado: [DATA]

### Ambiente
- Browser: Chrome/Firefox/Safari/Edge
- Resolução: [1920x1080 / 768x1024 / 375x667]
- Vite Version: 7.3.1

### Testes Aprovados ✅
- [ ] Layout 4-colunas
- [ ] Filtro funcionando
- [ ] HP colors dinâmicas
- [ ] Armas add/remove
- [ ] Responsividade

### Testes Falhados ❌
- [ ] [Descrição do problema]
- [ ] [Resolução esperada]

### Notas
[Qualquer observação adicional]

### Pronto para Deploy?
- [ ] Sim
- [ ] Não (motivo: ...)
```

---

## 🎯 Critério de Aceitação

O Master Dashboard está **pronto para uso** quando:

✅ Todos os 5 testes principais passam
✅ Layout responsivo em 3 tamanhos (mobile/tablet/desktop)
✅ Sem erros no console do navegador
✅ Animações suaves (60fps)
✅ Firebase sync funcionando (modo sessão)
✅ Nenhum visual quebrado ou overflow
✅ Todos os botões funcionam
✅ Filtro em tempo real

---

## 🚀 Deploy Checklist

Antes de fazer deploy:

- [ ] Rodar `npm run build`
- [ ] Verificar build errors
- [ ] Testar em ambiente de produção
- [ ] Verificar console errors
- [ ] Testar Firebase em produção
- [ ] Testar em 3+ browsers
- [ ] Testar em mobile real
- [ ] Documentação atualizada

---

**Bom teste! Reporte qualquer problema! ⚔️**
