# D&D Repo

## Pontos de interesse do mapa

Os pontos de interesse são carregados da pasta `data/locations`.

Ao abrir o mapa, o sistema tenta fazer varredura dos arquivos `.json` diretamente em `data/locations/` (quando o servidor permite listagem de diretório). Se a listagem não estiver disponível, usa `data/locations/index.json` como fallback.

No mapa, o scroll do mouse controla o zoom (aproximar/afastar) até os limites configurados.

## Configuração de tipos

O arquivo `data/poi-config.json` define cores e atributos padrão por tipo:
- `color`
- `show_pin_default`
- `show_name_default`

## Editor local de mapa

`map_edit.html` é uma página para uso local que permite criar novos POIs:
- formulário com nome, tipo e coordenadas
- seleção de coordenada por clique no mapa
- gravação de JSON em `data/locations` via File System Access API (Chrome/local) ou download manual do arquivo em navegadores sem suporte
- opção de escolher a pasta uma vez e reutilizar nos próximos salvamentos (persistida em IndexedDB, quando suportado)

Cada arquivo JSON deve conter:
- `x` e `y` (coordenadas no mapa)
- `name`
- `type` (ex.: `Cidade`, `Vila`, `Acontecimento`)
- `show_pin` (boolean)
- `show_name` (boolean)

Exemplo:

```json
{
  "x": 1120,
  "y": 840,
  "name": "Cidade de Aurora",
  "type": "Cidade",
  "show_pin": true,
  "show_name": true
}
```
