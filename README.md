# D&D Repo

## Pontos de interesse do mapa

Os pontos de interesse são carregados da pasta `data/locations`.

Ao abrir o mapa, o sistema tenta fazer varredura dos arquivos `.json` diretamente em `data/locations/` (quando o servidor permite listagem de diretório). Se a listagem não estiver disponível, usa `data/locations/index.json` como fallback.

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
