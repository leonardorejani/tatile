# Verificação

"Pronto" exige prova de cada camada. O auditor prova o código; o resto se prova rodando.

1. **Auditor**: `node "$HOME/.claude/skills/tatile/modulos/pwa/scripts/auditar.mjs" .` sai 0. Cole a saída.
2. **Build** do projeto sem erro.
3. **Render real** com `chrome-devtools-axi` (ou Playwright) em 390x844 (celular) e 1280x900
   (desktop): tela principal sem estouro (`document.documentElement.scrollWidth === innerWidth`),
   dock visível só no celular, painel lateral no desktop. Olhe o screenshot, não só o DOM.
4. **Manifesto servido**: `curl -s <url>/manifest.webmanifest` com `name`, `display` e ícones; cada
   ícone responde 200.
5. **Service worker ativo**: `navigator.serviceWorker.controller` depois de recarregar.
6. **Offline**: no headless, recarregue com a rede desligada (emulação offline) e veja a casca abrir.
7. **Notificação**: rota de teste com endpoint inventado devolve o 404 ou 410 do serviço de push
   (assinatura certa); sem login, 401. Disparador com `--simular` sai 0.
8. **Pendente de aparelho**, dito como pendente: notificação aparecendo no iPhone e no Android,
   instalação pelo menu, gesto e teclado.
