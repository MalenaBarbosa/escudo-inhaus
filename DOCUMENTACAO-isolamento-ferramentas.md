# Isolamento & Ferramentas — Programa Escudo

Módulo funcional para dois controles do Programa Escudo: **Gestão de isolamento e sinalização** e **Gestão de ferramentas**, com um **Painel** de acompanhamento. Arquivo único (`isolamento-ferramentas.html`), sem instalação — basta abrir no navegador do celular ou do computador.

## 1. O que tem em cada aba

**Isolamento e sinalização** — o encarregado registra um isolamento com foto obrigatória: responsável, data, previsão de retirada, local, atividade/material, se precisa de recurso para retirar e se é para descarte. Todos os campos são obrigatórios.

**Gestão de ferramentas** — tem duas entradas independentes:

- *Encarregado*: escolhe a função da equipe (Mecânico, Eletricista, Instrumentista, Soldador — listas já carregadas a partir dos kits enviados) e confere item a item, com foto obrigatória em cada ferramenta, além do nome de quem está com as ferramentas.
- *Almoxarife*: não usa lista fixa — digita o nome de cada ferramenta (da ferramentaria ou recebida para a Parada de Usina), marca se tem ou não, e anexa foto.

Cada conferência entra na nota do encarregado do Programa Escudo, e novas ferramentas recebidas podem ser incluídas a qualquer momento na tela de administração das listas por função.

**Painel** — não fica mais dentro dos formulários. Mostra:

- Gráfico e lista de isolamentos, com filtro por ativos/vencidos/encerrados, e botão para encerrar isolamentos já desmobilizados.
- Gráfico de ferramentas por status: conforme, não conforme e não possuímos.

## 2. Onde colocar o arquivo

Coloque `isolamento-ferramentas.html` na raiz (ou na mesma pasta das outras páginas) do repositório do Programa Escudo no GitHub — o mesmo repositório que já publica o site pelo GitHub Pages. Depois do commit, o link de preenchimento pelo celular fica em:

```
https://<seu-usuario-ou-organizacao>.github.io/<nome-do-repositorio>/isolamento-ferramentas.html
```

Esse é o link que pode ser enviado para a turma preencher pelo celular — qualquer pessoa com o link consegue abrir, sem precisar de conta no Claude.

## 3. Único passo técnico: ligar ao Firebase do Escudo

O arquivo já vem pronto para conversar com o Firebase Realtime Database do Escudo (o mesmo banco que o restante do Programa Escudo usa), mas com os dados de conexão em branco — assim ele nunca aponta sozinho para o banco errado.

Abra `isolamento-ferramentas.html` em um editor de texto e procure por `firebaseConfig` perto do início do bloco `<script>`. Você vai ver isto:

```js
var firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  databaseURL: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};
```

Troque cada `"COLE_AQUI"` pelo valor real do projeto **escudo-in-haus**, que você encontra no Console do Firebase em *Configurações do projeto → Seus apps → SDK do Firebase (config)*. É a mesma configuração já usada nas outras páginas do Escudo — pode copiar de lá.

Enquanto os campos estiverem como `"COLE_AQUI"`, o formulário continua funcionando normalmente, só que os registros ficam apenas no aparelho de quem preencheu (não são compartilhados). Assim que a configuração real for colada e o arquivo publicado, os dados passam a ser gravados de verdade no Firebase e aparecem para todo mundo que abrir o link, em tempo real.

Não é preciso mexer em mais nada no código — o `FIREBASE_ROOT` (nó `escudoIsolamento` dentro do banco) já está definido para não conflitar com o restante dos dados do Escudo.

## 4. Estrutura dos dados no Firebase (referência)

Tudo fica dentro do nó `escudoIsolamento`:

- `escudoIsolamento/isolamentos/{id}` — um registro por isolamento (responsável, local, data, previsão de retirada, atividade, precisaRecurso, descarte, foto, status ativo/retirado).
- `escudoIsolamento/funcoes/{slug}` — lista de ferramentas de cada função (Mecânico, Eletricista, Instrumentista, Soldador), editável na tela de administração dentro do próprio app.
- `escudoIsolamento/verificacoes/{id}` — uma conferência de ferramentas (do encarregado ou do almoxarife), com `verificacoes/{id}/itens/{itemId}` guardando cada ferramenta conferida (status conforme/faltando/danificada + foto).

## 5. Observações

- As fotos são comprimidas automaticamente antes de salvar, para não pesar o banco.
- O mesmo arquivo-fonte também está publicado como página no Claude (uso interno, para testes rápidos); o arquivo entregue aqui é a versão para hospedar junto com o site do Programa Escudo no GitHub, que é a que deve ser usada para a turma preencher pelo celular.
