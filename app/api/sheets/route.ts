import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { beneficiario, valor, vencimento, tipo, numeroDocumento, dataDocumento } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `'${tipo}'!A:H`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          beneficiario,
          "",
          "",
          "",
          numeroDocumento,
          valor,
          dataDocumento,
          vencimento
        ]],
      },
    });

    return NextResponse.json({
      ok: true,
      range: response.data.updates?.updatedRange,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ erro: "Erro ao salvar" }, { status: 500 });
  }
}