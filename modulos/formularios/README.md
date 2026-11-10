# Módulo formulários

Fontes: Vercel Web Interface Guidelines, Emil Kowalski e Josh Comeau. Aprovado na 1.1 (09/11/2026), regras 8 a 11 na 1.2 (10/11/2026). Os tempos citam os tokens do módulo movimento (`modulos/movimento/README.md`).

## Regras

1. **Nunca bloquear colar** (senha, e-mail, código). Bloquear não protege nada e faz digitar duas
   vezes.
2. **Tipo e preenchimento certos:** `type="email"`, `tel`, `url`, `number`; `autocomplete`
   (`email`, `name`, `tel`, `one-time-code`, `current-password`, `new-password`); `name` em todo
   campo; `spellcheck="false"` e `autocapitalize="off"` em e-mail, usuário e código. O celular
   abre o teclado certo e sugere o dado.
3. **Fonte de 16px no campo** (o iPhone dá zoom abaixo disso). Nunca travar o zoom.
4. **Rótulo visível sempre.** Placeholder é exemplo, não rótulo, e termina com "...", ex.:
   "voce@empresa.com...".
5. **Botão de enviar liberado até o envio começar.** Aí vira carregando e desabilita (evita envio
   duplo). Não desabilitar antes "porque falta campo": o erro explica melhor.
6. **Erro do lado do campo, dizendo como corrigir**, e o foco vai pro primeiro campo com erro.
   "Falta o final do e-mail, por exemplo voce@empresa.com", não "E-mail inválido". Validar ao
   sair do campo, não a cada tecla.
7. **Formulário longo salva rascunho** e pede confirmação antes de fechar com coisa não salva.

8. **Botão e menu dizem o que vai acontecer.** Item de menu que abre mais uma etapa termina em
   "..." ("Renomear...", "Mover para..."). Botão com a ação específica ("Enviar nota", "Salvar
   endereço"), nunca "Continuar" ou "OK" soltos. Erro diz o conserto com exemplo (regra 6).
9. **Rótulo que sobe pro canto (floating label).** O nome do campo começa dentro dele e sobe pro
   canto ao focar ou ao ter valor, em 240 ms. Nunca
   some, ao contrário do placeholder. Com campo preenchido por autofill o rótulo já nasce em cima
   (`:autofill` e `:not(:placeholder-shown)`).
10. **Campo válido ganha check com leve salto.** Ao sair do campo com valor válido: borda de
    `--sucesso` e um check que entra com `scale` .6 para 1 na curva `--curva-salto`
    (`cubic-bezier(.34, 1.56, .64, 1)`, passa um pouco do alvo e volta). O salto é só para
    confirmação pequena como essa. Em modal, página ou aviso, não.
11. **Botão desabilitado diz o porquê.** `disabled` tira o botão do foco e a dica de mouse não
    chega no teclado nem no celular. Usar `aria-disabled="true"` (segue focável, o clique é
    ignorado) e escrever o motivo em texto ao lado, ligado por `aria-describedby`. Nunca só
    tooltip. Convive com a regra 5: o desabilitado de verdade é o do envio em andamento.

## Provar

O auditor (`npm run auditor`) acha colar bloqueado, zoom travado e campo com fonte pequena. O
resto é revisão: a vitrine mostra colar e erro lado a lado.
