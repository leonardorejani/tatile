# Caso: precodiesel.com.br

Site de preço do diesel por cidade (Next.js 14, Supabase, Vercel) que virou app instalável. O que
foi feito, na ordem, e o que deu errado no caminho.

## O que entrou

- Manifesto com `id`, ícones `any` e `maskable`, `apple-touch-icon`, `theme_color` por esquema.
- Service worker com rede primeiro para páginas e para o bucket de dados, cache primeiro para
  `/_next/static/` e ícones, caches por versão.
- Cartão de instalação por plataforma: botão no Android e no Chrome do desktop, passos no iPhone e no
  Safari do Mac, escondido quando já instalado.
- Notificações por conta: chave "Ligar notificações" na tela da conta, teste na hora, disparador
  semanal que avisa só a queda de preço dos postos favoritos, uma notificação por pessoa.
- Casca: dock embaixo no celular, painel lateral com mapa ao lado no desktop.
- Dados semanais fora do build: job de segunda às 9h publica no bucket com manifest por último; o app
  lê de lá com 4 s de limite e cai no dado embutido se falhar.

## O que deu errado e virou regra

| Sintoma | Causa | Regra |
|---|---|---|
| Fundo cortado embaixo no iPhone | `min-h-screen` (100vh) na casca | N05: `dvh` |
| Botão ficava "aceso" depois do toque | `:hover` sem `@media (hover: hover)` | N08 |
| Página dava zoom ao tocar na busca | campo com 14 px | N07: 16 px; nunca travar zoom (N06) |
| Ninguém sabia se a notificação ia chegar | inscrição sem retorno | "Ligou, testou": rota de teste |
| iPhone não mostrava a opção de notificação | só existe instalado | cartão aponta para instalar |
| Dock cobria o último item da lista | faltou somar a área segura | N09 |
| Atualizar preço exigia deploy | dado no build | dados-sem-deploy.md |

## Estado que o auditor deixou

94 arquivos, 0 erros. Ficaram dois avisos N05 numa página de ferramentas internas e um N08 no CSS do
mapa, conhecidos e de baixo impacto, e a dica D01 (prints no manifesto).
