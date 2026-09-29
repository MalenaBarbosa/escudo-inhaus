# Formação CIPA — Módulo EAD (NR-05)

Plataforma da etapa a distância (12h) do treinamento de membros da CIPA. É um arquivo único (`index.html`), pronto para o GitHub Pages.

## Publicar
1. Suba `index.html` (e, se quiser, as logos) para o repositório.
2. Em **Settings > Pages**, publique a branch `main`.
3. O painel do instrutor fica no link `.../#admin` ou no botão "Sou instrutor ou gestor".

## Configurar (bloco `CONFIG` no início do `index.html`)
- `empresas`: opções do primeiro acesso e filtro do painel.
- `turmas`: com uma turma só, o campo não aparece no cadastro.
- `notaMinima` (9), `tempoMinLeituraMin` (10), `notaMinimaPresencial` (7).
- `pinAdmin`: senha do painel. **Troque antes de publicar.**
- `canalDenuncias`, `instrutor`, `responsavelTecnico`.
- `logoPrincipal`, `logoParceiro`, `logoPlataforma`: já vêm embutidas; podem apontar para um arquivo do repositório (ex.: `"logo-cipa.png"`).
- `firebase`: cole a configuração do projeto. Sem ela, a plataforma roda em "modo teste" e grava só no navegador de quem acessa.

## Firebase (Realtime Database)
Os dados ficam em `cipaEAD/participantes/{cpf}`. Regra mínima:

```json
{ "rules": { "cipaEAD": { ".read": true, ".write": true } } }
```

## Documentos
Declaração EAD e certificado de 20h são gerados em PDF no navegador (precisa de internet para carregar as bibliotecas). O certificado de 20h só é liberado depois que o instrutor lança a etapa presencial.
