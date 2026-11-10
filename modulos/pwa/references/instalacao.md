# Instalação por plataforma

Cada navegador instala de um jeito. A tela mostra o caminho certo para quem está olhando:

| Plataforma | Como instala | O que o app faz |
|---|---|---|
| Android (Chrome) | evento `beforeinstallprompt` | botão "Instalar agora" que chama `prompt()` |
| Chrome e Edge no desktop | o mesmo evento | o mesmo botão; texto fala em "barra de tarefas" e "janela própria" |
| iPhone e iPad (Safari) | só manual | passos: Compartilhar, Adicionar à Tela de Início |
| Safari no Mac (Sonoma+) | só manual | passo: Arquivo, Adicionar ao Dock |
| Firefox | não instala PWA no desktop | não mostra convite |

`templates/comum/lib/pwa.js` tem `plataforma()`, `instalado()`, `PASSOS_INSTALAR`, `instalar()` e o
ouvinte do evento; `templates/react/CartaoInstalar.jsx` é o cartão pronto.

- A detecção de plataforma usa o user agent, e só para isso: escolher a instrução. Estilo continua por
  capacidade (`hover`, `pointer`).
- `iPad` com Safari se apresenta como Mac; `maxTouchPoints > 1` separa.
- O cartão some quando `display-mode: standalone` (já instalado).
- Coloque o convite onde o ganho é claro (conta, notificações), não num pop-up na entrada.
- No iPhone, ligar notificação exige o app instalado: o cartão de notificações aponta para o de instalar.
