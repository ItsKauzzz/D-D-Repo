# D&D Repo

## Pontos de interesse do mapa

Os pontos de interesse são carregados da pasta `data/locations`.

Ao abrir o mapa, o sistema tenta fazer varredura dos arquivos `.json` diretamente em `data/locations/` (quando o servidor permite listagem de diretório). Se a listagem não estiver disponível, usa `data/locations/index.json` como fallback.

No mapa, o scroll do mouse controla o zoom (aproximar/afastar) até os limites configurados.

## Configuração de tipos

O arquivo `data/poi-config.json` define cores e atributos padrão por tipo:
- `icon_seed` (seed global usada para distribuir ícones por tipo de forma determinística)
- `icon_size_px` (tamanho base do ícone em pixels do mapa; escala junto com zoom in/out)
- `color`
- `show_pin_default`
- `show_icon_default`
- `show_name_default`
- `icons` (lista de imagens PNG do tipo, ex.: `Icon/Vila/icon_1.png`)
- `label_style` (ex.: `size_offset_pt`, `bold`, `italic`)

> `show_pin_default` e `show_name_default` só são usados quando o POI não define explicitamente `show_pin`/`show_name` no próprio JSON.

### Ícones por tipo no mapa

- As imagens de ícone ficam na pasta raiz `Icon/`, separadas por tipo (ex.: `Icon/Cidade`, `Icon/Vila`, `Icon/Acontecimento`) e devem ser PNG.
- Neste repositório, os PNGs não são versionados no git (adicione localmente os arquivos na pasta `Icon/`).
- A escolha do ícone é **fixa por POI** e leva em conta a combinação de `icon_seed` + tipo + id do arquivo + nome.
- Para ajuste manual por local específico, use `icon_index_offset` no JSON do POI (pode ser negativo ou positivo).
  - Exemplo: se a seed sorteou o índice `3` para uma vila, usar `icon_index_offset: -2` muda para o índice `1` (com wrap).
- O ícone é desenhado abaixo do pin e permanece estável sempre que o mapa recarrega.
- O ícone acompanha exatamente o zoom do mapa (mantém proporção em relação à imagem total).
- A âncora do ícone fica centralizada para evitar “salto” vertical durante zoom in/out.
- O menu do mapa possui uma opção para esconder/exibir ícones, e a lista lateral mostra miniatura do ícone ao lado do nome do POI.

## Editor local de mapa

`map_edit.html` é uma página para uso local que permite criar novos POIs:
- formulário com nome, tipo e coordenadas
- seleção de coordenada por clique no mapa
- edição de POIs existentes ao clicar no item da lista lateral
- gravação de JSON em `data/locations` via File System Access API (Chrome/local) ou download manual do arquivo em navegadores sem suporte
- opção de escolher a pasta uma vez e reutilizar nos próximos salvamentos (persistida em IndexedDB, quando suportado)

Cada arquivo JSON deve conter:
- `x` e `y` (coordenadas no mapa)
- `name`
- `type` (ex.: `Cidade`, `Vila`, `Acontecimento`)
- `description`
- `image_prefix` (prefixo para buscar imagens em `data/locations/images`)
- `show_pin` (boolean)
- `show_icon` (boolean, opcional)
- `show_name` (boolean)
- `icon_index_offset` (number opcional para deslocar o índice do ícone)

### Galeria de imagens

As imagens devem ficar em `data/locations/images` e seguir o padrão:
`<image_prefix>_image_<numero>.<extensão>`

Exemplo:
- `aurora_image_1.jpg`
- `aurora_image_2.jpg`

No mapa, as imagens da galeria são exibidas inteiras (sem crop) e com miniaturas para navegar entre anterior/próxima.

Exemplo:

```json
{
  "x": 1120,
  "y": 840,
  "name": "Cidade de Aurora",
  "type": "Cidade",
  "description": "Capital comercial de Telarium.",
  "image_prefix": "aurora",
  "show_pin": true,
  "show_name": true
}
```
