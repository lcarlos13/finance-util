import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const { funcionario, dias, grid } = await req.json();

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string
      ),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SHEET_FOLHA_EXTRA_ID as string;

    // 🔹 1. Nome do funcionário (A1)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [[funcionario]],
      },
    });

    // 🔹 2. Montar linhas da tabela
    const linhas = dias.map((dia: any) => {
      const row = [
        dia.data,
        grid[`${dia.data}-entrada`] || "",
        grid[`${dia.data}-inicio_almoco`] || "",
        grid[`${dia.data}-saida_almoco`] || "",
        grid[`${dia.data}-intervalo`] || "",
        grid[`${dia.data}-retorno`] || "",
        grid[`${dia.data}-saida`] || "",
      ];

      return row;
    });

    // 🔹 3. Escrever a partir da linha 4
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A4",
      valueInputOption: "RAW",
      requestBody: {
        values: linhas,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}