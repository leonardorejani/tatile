# Dados que mudam sem deploy

Quando o app mostra dado que muda por agenda (preço semanal, tabela oficial), colocar o dado no build
obriga a fazer deploy para atualizar, e deploy não deve rodar em cron.

Padrão adotado no precodiesel:

1. O job (launchd, GitHub Actions) gera os arquivos num **worktree limpo da main**, nunca na pasta
   de trabalho.
2. **Sanidade antes de publicar**: contagens mínimas e faixa de valores plausíveis. Falhou, para com
   exit 1 e nada é publicado.
3. Sobe para um **bucket público** numa pasta por versão (`semanas/AAAA-MM-DD/`) e, por último, um
   `manifest.json` que aponta para ela. O app nunca vê meia atualização.
4. Confere com `curl` que o manifest público tem a versão nova; só então dispara as notificações.
5. O app lê o manifest no boot com **limite de tempo** (4 s), confere a sanidade e só troca para o
   bucket se a versão não for mais velha que a do build. Em qualquer falha, segue com o **dado
   embutido no build**: a tela nunca quebra.
6. Interface síncrona preservada: o dado é trocado uma vez antes de o app montar, para as telas
   continuarem lendo sem `await` espalhado.
7. Escrita no bucket só por um **usuário técnico** com papel próprio, nunca com a chave de serviço
   no job; leitura pública.
8. O service worker trata a origem do bucket com rede primeiro, para o dado funcionar offline.
