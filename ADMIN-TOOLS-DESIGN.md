# Admin Tools — descrição da interface

## Direção visual

A interface segue uma linguagem **clean, escura e utilitária**, criada para manter a atenção no mapa. O verde suave é usado apenas como cor de ação e estado, enquanto cinzas de baixo contraste separam as áreas sem adicionar ruído. `DM Sans` atende aos controles e textos; `Manrope` dá mais presença aos títulos.

## Estrutura

- **Topbar fixa:** navegação de retorno, nome do editor, estado do processamento e ação de exportar.
- **Painel de Camadas (esquerda):** lista a composição do mapa. Cada item possui nome, tipo, visibilidade e seleção e pode ser arrastado para alterar a prioridade. Camadas mais altas na lista aparecem à frente no mapa.
- **Viewport (centro):** superfície independente, ampla e quadriculada. O mapa tem pan, zoom, ajuste à tela e fica visualmente elevado por uma sombra discreta.
- **Inspector (direita):** muda de acordo com o tipo da camada selecionada. Para uma camada do tipo Terreno, contém máscara, gráficos de preenchimento, intensidade, escala, variação de tamanho, seed, rotação, mirror e slice. Para Imagem, apresenta o upload do background ou elemento visual.
- **Rodapé do inspector:** mantém a ação principal sempre acessível mesmo durante o scroll.

Os dois painéis laterais são fixos e possuem scroll próprio. Assim, navegar pelo inspector nunca desloca o mapa e manipular o viewport nunca interfere nos controles.

## Componentes e estados

- Cards de camada selecionados ganham fundo e borda verdes discretos.
- Uploads usam uma área tracejada com instrução curta e feedback do arquivo escolhido.
- Assets aparecem em uma grade compacta com remoção individual.
- Tipos de camada são apresentados como badges para diferenciar suas funções rapidamente.
- Controles ainda indisponíveis são apresentados como próximos tipos, sem competir com as ações atuais.
- O estado vazio orienta o primeiro passo; durante a geração, a topbar comunica o progresso.

## Princípios para evolução

1. Cada camada possui um `type`; o inspector deve ser um formulário específico para esse tipo.
2. Novos tipos devem reutilizar a estrutura de seleção, visibilidade e nome da camada.
3. O viewport deve permanecer independente dos painéis e ser a maior área da tela.
4. Controles avançados aparecem no inspector, nunca sobre o mapa.
5. Resultados com a mesma seed e configurações devem ser reproduzíveis para permitir publicação posterior aos jogadores.
6. A máscara define pontos de spawn, não um recorte. O recorte só é aplicado quando a opção `Slice` estiver ativa.
7. Objetos de terreno usam a coordenada Y como profundidade: elementos mais baixos são desenhados à frente.
8. O projeto pode ser salvo em JSON com camadas, configurações, resultados e todas as imagens incorporadas, sem depender dos arquivos originais.
9. Conjuntos de imagens formam uma biblioteca do projeto e podem ser aplicados a múltiplas camadas de terreno.
10. “Exportar mapa” produz um HTML autônomo sem a interface administrativa, mantendo pan e zoom para visualização.
11. Camadas do tipo Objeto representam marcadores posicionáveis e podem se tornar POIs com nome, tipo, descrição, ícone e galeria.
12. Tipos de POI vivem em JSON e definem a cor usada nos nomes tanto no mapa quanto na navegação lateral.
13. O mapa publicado mantém seus POIs como elementos interativos sobre o raster: pesquisa, filtro, foco, detalhes, galeria e lightbox continuam disponíveis.
14. O inspector é estritamente específico ao tipo: Imagem oferece offset e opacidade; Objeto oferece metadados, miniaturas e coordenadas manuais; Terreno concentra geração e máscara.
15. Máscaras podem ser pintadas no próprio viewport com brush, eraser e fill, e permanecem invisíveis fora do modo de edição.
16. Conjuntos da biblioteca podem ser renomeados e ter imagens adicionadas ou removidas sem precisar recriá-los.
17. Valores de sliders também aceitam entrada numérica direta para ajustes precisos.
18. Durante a pintura da máscara, o botão esquerdo pinta/apaga e o botão direito assume o pan; confirmar rasteriza o desenho como PNG reutilizável da camada.
19. Objetos possuem escala, opacidade e offset próprios, independentes dos controles procedurais de Terreno.
20. A pintura de máscara mantém histórico local para `Ctrl+Z` e mostra o raio exato do brush junto ao cursor.
21. Ícones usam amostragem nearest-neighbor para preservar pixels e bordas em qualquer zoom.
22. A intensidade de Terreno define a quantidade total de pontos; aumentar o conjunto apenas alterna os gráficos usados nesses mesmos pontos.
23. Regiões usam máscaras exclusivas: a região desenhada mais recentemente remove sua intersecção das anteriores.
24. O visualizador alterna entre Objetos e Regiões; no primeiro, regiões aparecem no hover, e no segundo formam um overview colorido a 50%.
