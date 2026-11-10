# Módulo estados

O ciclo completo de uma ação: esperando, deu certo, deu errado, vazio, desfazer. Complementa o
módulo skeleton. Fontes: Vercel, Rauno Freiberg, Emil Kowalski e unslop (heydamir/unslop, CC BY 4.0, Damir Sokolovsky). Aprovado na 1.1 (09/11/2026), regras 6 a 10 na 1.2 (10/11/2026). Código:
`codigo/estados.ts`.

## Regras

1. **Skeleton e spinner só aparecem se demorar, e não somem num piscar.** Espera 200 ms antes de
   mostrar. Se mostrou, fica pelo menos 400 ms. Resposta rápida não pisca nada.

   ```tsx
   const mostrar = useAtrasoDeCarga(query.isLoading)   // espera 200, minimo 400
   if (mostrar) return <Skeleton forma={forma} />
   if (!query.data) return null                        // os primeiros 200 ms: nada, sem piscar
   ```

   Núcleo sem React: `criarAtrasoDeCarga` (serve pra RN e pra qualquer framework).
2. **UI otimista com Desfazer.** A tela muda na hora. Se o servidor falhar, volta sozinha e avisa.
   Com React Query: `onMutate` aplica e guarda o anterior, `onError` devolve o anterior e mostra
   o erro, `onSettled` revalida. O aviso de sucesso traz "Desfazer" por 5 segundos (toast: ver a
   skill `ask-sonner`).
3. **Ação perigosa: segurar pra confirmar, ou Desfazer.** Ação leve dispara no toque. Ação
   perigosa (excluir, cancelar pedido) só dispara depois de segurar ~1 s ou ao soltar o dedo, e
   soltar antes cancela. Alternativa: executar e oferecer Desfazer. Nunca excluir num toque sem
   volta.
4. **Vazio e erro sempre com próxima ação.**
   - Vazio: o que vai aparecer ali e como fazer aparecer ("Nenhum pedido ainda. Os pedidos
     aparecem aqui assim que chegarem.", com o botão de criar quando fizer sentido).
   - Erro: o que aconteceu em linguagem de gente e "Tentar de novo". Nunca "Erro." solto nem tela
     em branco.
5. **Botão que recarrega mostra que está carregando no próprio botão.** A pílula fecha em círculo,
   o spinner gira (`aria-busy="true"`, clique repetido ignorado, no mínimo uma volta), fica verde
   com check e volta ao texto (receita do módulo movimento, "botão que carrega"). Vale mesmo quando
   a resposta é rápida e o skeleton nem aparece (regra 1): o botão é o retorno do clique. Com
   `prefers-reduced-motion`, sem animar a largura. **Nunca** ícone de seta circular (ou qualquer
   ícone de enfeite) do lado do texto "Atualizar" (decisão do Leonardo, 10/11/2026).

6. **Hover só com mouse, e discreto.** Todo `:hover` vai dentro de
   `@media (hover: hover) and (pointer: fine)`: no celular o toque não deixa o card "grudado"
   aceso. Card clicável sobe 2px com sombra (nada de 10px com brilho). Apertar encolhe: `:active`
   com `scale(.98)` no card e `scale(.97)` no botão. O padrão do botão é encolher. A onda
   (ripple) do Material só quando o Leonardo pedir. Resposta ao toque em menos de 100 ms.

   ```css
   @media (hover: hover) and (pointer: fine) {
     .card:hover { transform: translateY(-2px); box-shadow: var(--sombra-2) }
   }
   .card:active { transform: scale(.98) }
   .botao:active { transform: scale(.97) }
   ```
7. **Dica de botão em grupo (barra de ferramentas).** A primeira dica espera 400 ms. Enquanto
   alguma estiver aberta, as vizinhas abrem na hora e sem animação, e isso vale até 300 ms depois
   de a última fechar. Sai da barra por mais de 300 ms, volta a esperar 400.
8. **Lista clicável sem vão entre os itens.** Vão de 8px faz o destaque piscar quando o mouse
   passa e o clique cair no nada. `gap: 0` na lista e o respiro vira `padding` dentro do item.
9. **Menu abre no `pointerdown`, não no `click`.** Ganha 80 a 100 ms de resposta. Teclado
   (Enter e espaço) continua no `click`.
10. **Card de número: rótulo, número e variação com referência.** "Faturamento", `R$ 12.400,00`,
    "+12% vs outubro". Sem sparkline, sem ícone de enfeite e sem "+12%!!" (unslop). Número em
    `tabular-nums` (módulo tipografia).

## Provar

`npm run unit` testa o atraso com relógio falso: resposta rápida não mostra, lenta aparece aos
200 ms, chegada logo depois fica até 400 ms, recarga seguida não pisca. A vitrine mostra os
quatro rodando.

As regras 6 a 10 são CSS e revisão de tela. A troca de tema sem transição (módulo cor, regra 9)
tem teste em `teste/estados.test.ts`: a classe liga antes de aplicar e só sai no segundo quadro.
