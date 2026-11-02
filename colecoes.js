// Coleções temáticas. Cada uma tem a página /<slug> e mostra só os pins
// marcados com esse slug na coluna "colecao".

const COLECOES = {
  brasil: {
    nome: "História do Brasil",
    descricao: "Do desembarque de Cabral ao fim do Império.",
    donoId: 16, // conta BrasilADM: única que publica e importa na coleção
    dataMinima: "1500-04-22",
  },
};

module.exports = { COLECOES };
