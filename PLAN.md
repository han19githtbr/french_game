# Melhorias de UI/UX + Correções de IA — French Quest

## Contexto

O projeto é um app Next.js (Pages Router, Tailwind v4, Framer Motion) de aprendizado de francês com:
- Sistema de temas claro/escuro já implementado com tokens CSS (`--color-*`)
- Geração de imagens por IA (OpenAI → HuggingFace → Stable Horde → placeholder)
- Validação por visão Claude (Anthropic) para confirmar que imagem corresponde à legenda
- Páginas: `index`, `game`, `frases`, `results`, `sentences_results`, `admin`, `classes`

---

## Bugs de IA identificados

### 1. Modelo Claude desatualizado (`ai-image-resolver.ts` linha 171)
```ts
model: 'claude-haiku-4-5-20251001',  // ← modelo que pode não existir mais / incorreto
```
O nome correto deve ser `claude-haiku-4-5` (sem o timestamp de versão no final), ou melhor, usar o alias `claude-haiku-4-5-20251001` conforme a API Anthropic. Será verificado e corrigido para o modelo disponível atual.

### 2. `gpt-image-1` — resposta b64_json sem verificação de tamanho antes de usar
No `ai.ts` linha ~322-326: quando `data.data[0].b64_json` retorna mas `dataUrl.length > MAX_DATA_URL_BYTES`, o código simplesmente não retorna nada (cai no próximo provider) sem logar o motivo — isso pode fazer com que imagens válidas sejam silenciosamente descartadas. Deve-se logar adequadamente.

### 3. Duplicata de índice único pode silenciar erros reais
O índice `{ theme: 1, title: 1 }` com `partialFilterExpression: { source: 'ai' }` é criado a cada chamada de `ensureDailyAIItems`. O `.catch(() => undefined)` pode mascarar falhas de criação de índice não relacionadas a "já existe".

### 4. `filterWordTitles` pode esvaziar o pool de opções
Em `generate-images.ts` linha 83-85: se `filterWordTitles` retornar menos de 2 títulos, cai de volta para o pool sem filtro (`validTitles`). Mas se o pool filtrado retornar exatamente 1, `safeOptionsCount` será forçado para 1, quebrando o jogo pois não há opções de distratores. Deve ser corrigido para garantir mínimo de 2 opções sempre.

### 5. `loadImages` silencia erros de imagem na UI
O `catch` da `loadImages` em `game.tsx` apenas faz `console.error` sem feedback ao usuário — se a API retornar erro o usuário fica olhando para uma tela vazia. Deve-se mostrar um toast de erro.

---

## Melhorias de UI/UX propostas

### Landing page (`index.tsx`)
- Adicionar animação de entrada mais suave nos elementos do card
- Tornar o card de provérbio mais elegante com transição de fade ao trocar
- Melhorar o botão Google Sign-in com hover state mais refinado
- Adicionar um indicador visual de "idioma" (bandeira FR) próximo ao título

### Game page (`game.tsx`)
- **Header fixo**: reorganizar o avatar/usuário no topo em uma topbar limpa, com separação visual clara
- **Seletor de tema**: o botão dropdown pode ter padding e ícones melhores por tema
- **Cards de imagem**: melhorar o estado de loading (skeleton animado em vez de espaço vazio)
- **Opções de resposta**: aumentar legibilidade dos botões de resposta (maior padding, melhor feedback visual de correto/errado)
- **Toast de AI gerada**: remover o toast intrusivo de "novas imagens por IA" — é ruído desnecessário para o usuário
- **Botões laterais fixos** (música, vídeo, troféu): reorganizar em uma sidebar vertical mais coesa, com tooltips melhores
- **Tela de parabéns**: melhorar a animação de conclusão de rodada
- **Loading state**: adicionar skeleton cards em vez de tela branca durante carregamento

### Results page (`results.tsx`)
- **Botão "Voltar ao jogo"**: mover de `absolute mt-50` para posição normal no fluxo, com estilo consistente com o resto do app
- **Cards de missão/nível**: melhorar para usar os tokens de tema como no game.tsx
- **Lista de jogadas**: cards brancos com `text-black` quebram o tema escuro — usar tokens de cor
- **Gráfico de barras**: adicionar gradiente nas barras usando o `linearGradient` já definido mas não aplicado

### Globals CSS (`globals.css`)
- Corrigir o `scrollbarColor: '#lightblue #374151'` — `#lightblue` não é uma cor válida em CSS (deve ser a cor hex real ou `var()`)
- Remover regras CSS duplicadas de `select option` (aparecem duas vezes)
- Padronizar as animações pulse que ainda usam ciano hard-coded

---

## Proposed Changes

### Bug Fixes — AI Image Generation

#### [MODIFY] [ai-image-resolver.ts](file:///c:/Users/Handy%20Claude/Desktop/french_game/lib/ai-image-resolver.ts)
- Corrigir o nome do modelo Claude (linha 171) para `claude-haiku-4-5-20251001` → verificar se é o correto ou usar `claude-3-5-haiku-latest` como alias seguro

#### [MODIFY] [ai.ts](file:///c:/Users/Handy%20Claude/Desktop/french_game/lib/ai.ts)
- Adicionar log quando imagem b64 é descartada por tamanho excessivo
- Melhorar o catch do createIndex para não mascarar erros não-duplicata

#### [MODIFY] [generate-images.ts](file:///c:/Users/Handy%20Claude/Desktop/french_game/pages/api/generate-images.ts)
- Garantir `safeOptionsCount >= 2` mesmo quando `filterWordTitles` retorna pool pequeno

#### [MODIFY] [game.tsx](file:///c:/Users/Handy%20Claude/Desktop/french_game/pages/game.tsx)
- No `catch` de `loadImages`: mostrar `toast.error` ao usuário
- Remover toast de "novas imagens IA" (ruído desnecessário)
- Adicionar skeleton de carregamento para os cards de imagem
- Melhorar botões de resposta (padding, feedback visual)
- Reorganizar a topbar do usuário
- Corrigir `scrollbarColor: '#lightblue #374151'` (aparece 2 vezes inline)

---

### UI/UX Improvements

#### [MODIFY] [index.tsx](file:///c:/Users/Handy%20Claude/Desktop/french_game/pages/index.tsx)
- Transição de fade no provérbio ao trocar
- Refinamento dos estilos do botão Google
- Indicador de idioma/bandeira FR

#### [MODIFY] [results.tsx](file:///c:/Users/Handy%20Claude/Desktop/french_game/pages/results.tsx)
- Mover botão "Voltar ao jogo" para posição normal (remover `absolute mt-50`)
- Corrigir cards brancos `bg-white text-black` para usar tokens de tema
- Aplicar gradiente correto nas barras do gráfico

#### [MODIFY] [globals.css](file:///c:/Users/Handy%20Claude/Desktop/french_game/styles/globals.css)
- Corrigir `#lightblue` inválido nos scrollbarColor inline
- Remover regras duplicadas de `select option`
- Adicionar animações de skeleton para loading states
- Adicionar `.card-skeleton` e `.image-skeleton` utilitários

---

## Verification Plan

### Manual Verification
1. Testar seleção de tema e carregamento de imagens (verificar se skeletons aparecem)
2. Verificar que erros de API mostram toast ao usuário
3. Testar tema claro e escuro em todas as páginas corrigidas
4. Conferir que `results.tsx` não usa mais `bg-white text-black` em modo escuro
5. Verificar que o `claude-haiku` model ID é válido na API Anthropic

### Automated
- `npm run build` para verificar sem erros de TypeScript/build

---

## Open Questions

> [!IMPORTANT]
> **Modelo Claude**: O modelo `claude-haiku-4-5-20251001` pode não ser válido. Vou usar `claude-haiku-4-5-20251001` conforme a documentação Anthropic (formato correto é `claude-<model>-<YYYYMMDD>`). Se houver chave Anthropic configurada no ambiente, os logs de erro de API dirão o modelo inválido.

> [!NOTE]
> O app não está rodando localmente durante esta sessão — as correções serão verificadas via `npm run build` e revisão de código. Testes visuais ficam ao encargo do usuário após o build.
