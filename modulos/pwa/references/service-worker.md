# Service worker

Modelo: `templates/comum/public/sw.js`. Uma estratégia por tipo de recurso:

| Recurso | Estratégia | Por quê |
|---|---|---|
| Navegação (página) | rede primeiro, casca em cache se cair | página fresca com sinal, app abre sem sinal |
| Dado do app (`/data/`, API pública, bucket) | rede primeiro, último visto se cair | preço e lista têm que vir frescos |
| Arquivo com hash (`/_next/static/`, `/assets/`) e ícones | cache primeiro | nunca muda; o nome muda quando muda |
| Mídia (fotos) | cache primeiro, cache separado | pesa; separado para limpar sem perder a casca |
| POST, outras origens sem lista | não intercepta | o service worker não deve mexer no que não entende |

Versão: `VERSAO` no nome de cada cache; o `activate` apaga o que não é da versão atual. Suba a versão
quando mudar a estratégia, não a cada deploy (o hash dos arquivos já cuida disso).

`skipWaiting` + `clients.claim`: a versão nova assume no próximo carregamento. Se o app guarda estado
que uma versão nova pode quebrar, troque por um aviso "versão nova, toque para atualizar".

Dado de outra origem (bucket do Supabase, API) entra em `DADOS_EXTERNOS`; sem isso o service worker
ignora e o app fica sem nada offline.

Nunca guarde no cache: resposta com dado pessoal (conta, sessão), POST, e resposta com erro.
