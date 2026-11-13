# Reino dos Ecos

Jogo 2D lateral original, com desenho feito em Canvas, para jogar em salas com a comunidade. Arte, personagens e cenário são gerados por código; não usa arte nem marca de terceiros.

## Rodar

Requer Node.js 18 ou superior e npm. Na pasta do projeto:

```sh
npm ci
npm start
```

Acesse `http://localhost:3000`. Em outra máquina, use o endereço da máquina que hospeda o servidor na mesma rede e libere a porta 3000 no firewall, se necessário. Em produção, o responsável deve configurar hospedagem, HTTPS/WSS e acesso de rede; **este projeto não está publicado e não é uma integração ou bot oficial do Discord**. Para mudar a porta: `PORT=8080 npm start`.

Todos precisam acessar a mesma instância do servidor e entrar com o **mesmo código de sala** (até 16 letras minúsculas, números ou hífen). Até 12 jogadores por sala, 120 conexões no servidor. Compartilhe o endereço e o código no Discord por conta própria. Não há contas, autenticação, senhas, mensagens de chat, proteção de sala ou checagem de identidade: qualquer pessoa que souber o código e alcançar o servidor pode entrar.

## Preparação para Render (não publicado)

Configure um **Web Service Node** com build `npm ci` e start `npm start`. O servidor já escuta em `0.0.0.0` e usa `PORT`, como exigido pelo Render; o navegador usa WSS automaticamente quando a página usa HTTPS. Use **uma única instância**: as salas só existem na memória de cada processo, portanto réplicas não compartilham jogadores. Reinícios e deploys desconectam os jogadores e apagam as salas; no plano Free o serviço pode hibernar por inatividade e demorar para despertar. Teste o deploy e a reconexão antes de divulgar; aqui não houve deploy. Consulte https://render.com/docs/web-services e https://render.com/docs/free.

## Como jogar

Escolha nome, cor, emblema, tema e classe. Teclado: **A/D ou setas** movem, **W/seta para cima/espaço** pula, **J ou clique no cenário** ataca. No celular, use os botões na tela; segure para mover ou atacar, solte e pressione novamente para pular. Evite os monstros, atravesse as plataformas e derrote o Guardião do Eclipse no lado direito. A barra do chefe aparece ao se aproximar. Um marco de retorno é ativado depois da metade do mapa. Ao morrer, renasce com vida cheia e os inimigos locais retornam. O botão de vitória reinicia a aventura.

* **Guardião:** espada de curto alcance.
* **Arqueiro:** flechas rápidas de longo alcance.
* **Arcano:** orbes mais lentos e mais fortes.

## Limites importantes

* Multiplayer sincroniza **presença, nome, cor, emblema, classe, posição, direção e animação** entre jogadores da mesma sala. Salas são mantidas apenas em memória e desaparecem quando vazias ou o servidor reinicia. Ao cair a conexão, o jogo continua sozinho; saia e entre de novo para reconectar.
* Mapa é igual na geometria para todos, mas o tema escolhido altera as cores apenas no seu navegador. Mobs, ataques, vida, dano, chefão, mortes e vitória são **locais e não sincronizados**: outros jogadores aparecem, mas não podem lutar juntos contra o mesmo inimigo. Não há PvP ou anti-cheat; os clientes informam suas posições.
* Nome, sala, cor, classe, emblema e tema são guardados no `localStorage` do navegador, quando disponível. Progresso e pontuações não são salvos. Limpar os dados do navegador remove a personalização.
* Sem banco de dados. O servidor limita tamanho e frequência das mensagens, conexões e tamanho da sala, valida campos e não aceita caminhos arbitrários. Não expõe segredos; não é uma proteção completa contra abuso ou servidor de jogo autoritativo.

O servidor não é autoritativo; limites simples não impedem ataques distribuídos, sabotagem ou falsificação de jogadores. Use proteção adicional e uma revisão de segurança antes de expor publicamente. Conexões que não entram em uma sala são encerradas em 10 segundos, e clientes que não recebem dados são desconectados para evitar crescimento ilimitado da fila.

## Testes

```sh
npm test
```

A suíte testa arquivos públicos, validação, isolamento de salas, presença, limites de coordenadas, limite de sala, mensagens excessivas, payload binário/grande e saída, usando clientes WebSocket reais em localhost. Também testa movimentos, pulo, ataque e reentrada do cliente em um DOM simulado. Isso não substitui testes visuais e táteis em navegadores e celulares reais.

## Arquivos

`server.js`: HTTP estático e salas WebSocket. `public/index.html`, `public/style.css` e `public/game.js`: interface, controles, mundo e combate. `test/server.test.js` e `test/security.test.js`: testes de integração; `test/client.test.js`: cliente com DOM simulado. Dependência de servidor: `ws`; nenhum framework de frontend.
