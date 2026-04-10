# D&D Repo

## Pontos de interesse do mapa

Os pontos de interesse são carregados da pasta `data/locations`.

1. Liste os arquivos em `data/locations/index.json`.
2. Cada arquivo JSON deve conter:
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
