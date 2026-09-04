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
- [rodando] Codex via CLI: tarefa do ícone e tarefa da aba de peso, em background.
