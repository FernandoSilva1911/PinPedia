// Validação dos dados de entrada da API.

function dataValida(texto) {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function numeroNoIntervalo(valor, min, max) {
  if (valor === null || valor === "" || typeof valor === "boolean") return false;
  const n = Number(valor);
  return Number.isFinite(n) && n >= min && n <= max;
}

const idValido = (id) => /^\d+$/.test(String(id));

// Devolve a mensagem do primeiro problema encontrado, ou null se o pin estiver ok.
// Com comCoordenadas = false valida só os campos editáveis (RF006).
function validarPin(pin, { comCoordenadas = true, dataMinima = null } = {}) {
  if (!pin || typeof pin !== "object") return "Dados do pin ausentes.";

  const { titulo, data, texto, latitude, longitude } = pin;

  if (!titulo || !String(titulo).trim() || !data || !texto || !String(texto).trim()) {
    return "Preencha título, data e conteúdo.";
  }
  if (String(titulo).length > 200) return "O título deve ter no máximo 200 caracteres.";
  if (!dataValida(data)) return "Data inválida. Use o formato AAAA-MM-DD.";
  if (dataMinima && data < dataMinima) {
    return `A data não pode ser anterior a ${dataMinima.split("-").reverse().join("/")}.`;
  }

  if (comCoordenadas) {
    if (!numeroNoIntervalo(latitude, -90, 90)) return "Latitude inválida.";
    if (!numeroNoIntervalo(longitude, -180, 180)) return "Longitude inválida.";
  }
  return null;
}

// Filtro de datas das rotas de consulta (RF004).
function validarFiltro({ dataInicial, dataFinal }) {
  if (dataInicial && !dataValida(dataInicial)) return "Data inicial inválida.";
  if (dataFinal && !dataValida(dataFinal)) return "Data final inválida.";
  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    return "A data inicial não pode ser posterior à data final.";
  }
  return null;
}

module.exports = { dataValida, idValido, validarPin, validarFiltro };
