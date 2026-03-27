import { google } from "googleapis";
import { NextResponse } from "next/server";

const mapaSecoes: Record<string, string> = {
  "FOLHA DE PAGAMENTO": "FOLHA DE PAGAMENTO",
  "VALES": "FOLHA DE PAGAMENTO",
  "RESCISÕES": "FOLHA DE PAGAMENTO",
  "FÉRIAS": "FOLHA DE PAGAMENTO",

  "ENCARGOS SOCIAIS": "ENCARGOS SOCIAIS",
  "V. TRANSPORTE": "ENCARGOS SOCIAIS",
  "CESTA BÁSICA": "ENCARGOS SOCIAIS",

  "HONORÁRIOS": "HONORÁRIOS",
  "ASSESSORIA JURÍDICA": "HONORÁRIOS",

  "MANUTENÇÃO": "MANUTENÇÃO",
  "MATERIAL": "MANUTENÇÃO",
  "MÃO DE OBRA": "MANUTENÇÃO",

  "DESPESAS FIXAS": "DESPESAS FIXAS",

  "MATERIAL DE LIMPEZA": "MATERIAL DE LIMPEZA",
  "CONSERVAÇÃO": "MATERIAL DE LIMPEZA",

  "ALUGUÉIS": "ALUGUÉIS",
  "CONDOMÍNIO": "ALUGUÉIS",
  "IMPOSTOS": "ALUGUÉIS",
  "TAXAS": "ALUGUÉIS",

  "DESPESAS DIVERSAS": "DESPESAS DIVERSAS",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { beneficiario, valor, vencimento, tipo, numeroDocumento, dataDocumento } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const leitura = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: "RELATORIO GERAL!A:Z",
    });

    const linhas = leitura.data.values || [];
    const secao = mapaSecoes[tipo];
    let linhaSecao = -1;

    for (let i = 0; i < linhas.length; i++) {
        const primeiraColuna = linhas[i][0]?.toString().toUpperCase().trim();

        if (primeiraColuna?.includes(secao)) {
            linhaSecao = i;
            break;
        }
    }

    if (linhaSecao === -1) {
        throw new Error("Seção não encontrada na planilha");
    }
    //console.log(linhaSecao);

    let linhaInsercao = linhaSecao + 1;

    while (
        linhas[linhaInsercao] &&
        linhas[linhaInsercao][0] !== "" &&
        linhas[linhaInsercao][0] !== undefined
    ) {
        linhaInsercao++;
    }
    //console.log(linhaInsercao);

    const range = `RELATORIO GERAL!A${linhaInsercao + 1}:D${linhaInsercao + 1}`;

    await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[
            vencimento,
            beneficiario,
            valor,
            ""
            ]],
        },
    });

    return NextResponse.json({
      ok: true,
      //range: response.data.updates?.updatedRange,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ erro: "Erro ao salvar" }, { status: 500 });
  }
}