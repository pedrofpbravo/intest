# WORKLOG

## 2026-09-04 — Ícone novo + aba de peso + seed de pesos

### Plano aprovado
1. **Ícone**: recriar o print (rolo de papel higiênico branco em círculo turquesa, fundo azul-escuro) e gerar icons/icon-512.png, icon-192.png, apple-touch-icon.png. Bump `?v=2` no index.html e manifest (feito por Fable na revisão).
2. **Aba de peso**: barra inferior fixa (Intestino | Peso). View de peso: gráfico de linha (SVG puro) + lista. Sheet de novo/editar peso: datetime-local default agora + campo kg (decimal com vírgula). Dados em `users/{uid}/weights` `{at, kg, createdAt, updatedAt}`. Backup passa a incluir `weights`. fakedb espelhado.
3. **Seed**: 56 pesos (04/jun a 04/set 2026, sempre 08:00) na conta pedrofelipebravo@gmail.com, via login local do Pedro + import executado por Fable no browser. "2 8/jul" interpretado como 28/jul.
4. **Deploy**: bump CACHE + APP_VERSION, commit + push (GitHub Pages).

### Decisões
- Navegação: barra inferior (escolha do Pedro). FAB fica acima da barra.
- View de peso: só gráfico de linha + lista (sem card de stats).
- Codex NÃO toca em index.html/manifest na tarefa do ícone (evita conflito com a tarefa da aba); bumps de versão ficam com Fable.

### Delegações
- [enviada] Codex A: gerar os 3 PNGs do ícone (script Python em scratchpad, saída em icons/).
- [enviada] Codex B: implementar a aba de peso (index.html, styles.css, charts.js, logic.js, db.js, fakedb.js, main.js).

### Resultados / revisão
- BLOQUEIO (resolvido): 3 delegações via subagente falharam com "approval request failed" em todo comando. Diagnóstico: o runtime app-server do plugin rejeita CreateProcess nesta máquina (broker novo não resolveu; teardown via broker/shutdown + probe confirmaram). O `codex exec` direto pelo CLI funciona normalmente.
- Decisão (Pedro): consertar o Codex antes de qualquer implementação direta por Fable. Solução: delegar via `codex exec -s workspace-write` direto no CLI; workflow Fable orquestra / Codex executa mantido, só muda o transporte.
- Seed JSON pronto e validado em scratchpad (56 registros, ids determinísticos wimp-*).
- Codex via CLI entregou as duas tarefas. Revisão Fable: código no padrão, sem desvios do brief.
- Verificação consolidada no browser (#debug): 20/20 checks PASS (abas, gráfico, CRUD de peso com vírgula/ponto, validação, backup com weights, view de intestino intacta). Console sem erros.
- Ícone verificado visualmente: fiel ao print (rolo branco, círculo turquesa, fundo azul-escuro).
- Fixes de integração por Fable: ?v=2 (index.html + manifest), APP_VERSION v2, CACHE intest-v2, porta dev 8085 -> 8090 (8085 ocupada por processo zumbi).
- Commit 9d34940 "v2: weight tracking tab, new app icon" + push para main.
- Seed concluído: 56 pesos importados na conta pedrofelipebravo@gmail.com via import dinâmico de js/db.js no browser local (Pedro digitou a senha). Verificado no servidor (serverTimestamp resolvido) e na UI: 56 linhas, gráfico ok, topo "86,2 · 04/09 08:00 · +0,3 kg". Ids determinísticos wimp-YYYY-MM-DD-08-00 (reimportar sobrescreve, não duplica).

### Fechado em 2026-09-04. Riscos/abertos
- Runtime app-server do plugin Codex rejeita CreateProcess nesta máquina; delegações devem usar `codex exec -s workspace-write` direto no CLI até o plugin ser corrigido.
- Porta 8085 ocupada por processo python zumbi (pid 2900, não identificado/não morto); dev agora em 8090.
- Pedro segue logado na conta pessoal no browser local desta máquina (sair pelo menu ⋯ se não quiser manter).

## 2026-09-04 (2) — Gráfico de frequência (Semana / Mês / Ano)

### Plano aprovado
Card novo "Frequência" na aba Intestino, abaixo de "Distribuição Bristol": barras = quantos registros por período, com filtro segmentado Semana / Mês / Ano. Janela fixa (12 semanas / 12 meses / todos os anos), sem paginação. Barras em cor única (`var(--accent)`), contagem impressa acima. Escolhas confirmadas pelo Pedro em uma rodada única de perguntas.

### Decisões
- Sem paginação para períodos antigos, sem barras empilhadas por Bristol, sem linha de média, sem aba nova.
- Semanas começam na segunda (reusa `weekStartStr`); rótulos "01/09" (semana), "set" (mês), "2026" (ano).
- Períodos vazios permanecem no resultado com valor 0, para virarem barras zeradas em vez de sumirem.
- Filtro persistido em `localStorage` (`intest.freq`).
- fakedb passa de 14 dias para ~430 dias (431 eventos determinísticos), senão `#debug` não exercita as views de mês e ano.

### Delegações
- [enviada] Codex (`codex exec -s workspace-write -m gpt-5.6-sol -c model_reasoning_effort=xhigh`, sessão 01a06ef6): 7 arquivos — logic.js (`frequencyBuckets`), charts.js (`labelEvery`), index.html (card), styles.css (pills), main.js (state + render + wiring), fakedb.js (histórico maior), bump v3.

### Resultados / revisão
- Codex entregou exatamente os 7 arquivos permitidos, sem arquivos novos, sem commit. Transporte via CLI funcionou (plugin segue quebrado).
- Verificação consolidada por Fable no browser (#debug, viewport 375x812), tudo PASS: 12 barras na semana (última = 31/08, semana atual), 12 no mês (última = set), 2 no ano; soma do ano = 431 = total de eventos; recontagem independente por ano (2025=192, 2026=239) bate com o gráfico; spot-check da semana 03/08-09/08 = 8 registros, igual à barra; mês corrente = 4 nos dois métodos; pills trocam o gráfico e o `aria-pressed`; escolha sobrevive ao reload; console sem erros; sem scroll horizontal; Bristol, lista (431 linhas), sheet de novo/editar e aba Peso intactos.
- Fix de Fable 1 (charts.js): `labelEvery` contava do primeiro item, o que forçava o último rótulo colado no vizinho (folga de 3,4 px entre "24/08" e "31/08"). Passou a contar de trás para frente: 6 rótulos igualmente espaçados, folga mínima 27,7 px. Bristol (labelEvery=1) segue com os 7 rótulos.
- Fix de Fable 2 (main.js): a leitura do `localStorage` estava no topo do módulo sem try/catch. Safari com armazenamento bloqueado lança na hora do load e o app inteiro não sobe no iPhone. Virou `savedFreqRange()` com try/catch.
- Screenshot visual não foi possível (painel do browser não estava em exibição, sem composição de frames); a verificação foi feita medindo o DOM/SVG renderado (getBoundingClientRect dos rótulos, contagem de barras e valores).

### Aberto
- Falta commit + push e o bump já está feito (APP_VERSION v3 / CACHE intest-v3): decidir com o Pedro quando publicar no GitHub Pages.
- Servidor python na 8090 fica órfão quando o Codex o inicia; matar o pid antes de subir o preview (aconteceu nesta sessão, pid 39804).
