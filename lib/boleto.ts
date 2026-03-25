function calcularVencimento(fator: number) {
  if (fator === 0) return null;

  const baseAntiga = new Date("1997-10-07");
  const baseNova = new Date("2025-02-22");

  // testa com base antiga
  const dataAntiga = new Date(baseAntiga);
  dataAntiga.setDate(dataAntiga.getDate() + fator);

  // testa com base nova
  const dataNova = new Date(baseNova);
  dataNova.setDate(dataNova.getDate() + fator);

  // regra: escolher a data mais plausível (entre 2000 e 2100)
  if (dataAntiga.getFullYear() >= 2000 && dataAntiga.getFullYear() <= 2025) {
    return dataAntiga.toISOString().split("T")[0];
  }

  return dataNova.toISOString().split("T")[0];
}

function linhaParaCodigoBarras(linha: string) {
  const codigo = linha.replace(/\D/g, "");

  return (
    codigo.slice(0, 4) +           // banco
    codigo.slice(32, 33) +         // dígito verificador geral
    codigo.slice(33, 37) +         // fator vencimento
    codigo.slice(37, 47) +         // valor
    codigo.slice(4, 9) +           // campo livre
    codigo.slice(10, 20) +
    codigo.slice(21, 31)
  );
}

export function parseBoleto(linha: string) {
  const codigo = linha.replace(/\D/g, "");

  if (codigo.length !== 47) {
    throw new Error("Linha digitável inválida");
  }

  // 💰 valor
  const valor = parseInt(codigo.slice(37, 47)) / 100;

  // 📅 fator
  const fator = parseInt(codigo.slice(34, 37));

  console.log(fator);

  let baseDate;

  baseDate = new Date("2025-02-22");

  const data = new Date(baseDate);
  data.setDate(data.getDate() + fator);

  const vencimento = data.toISOString().split("T")[0];
  //const vencimento = data.toLocaleDateString("pt-BR");

  return {
    valor,
    vencimento,
  };
}