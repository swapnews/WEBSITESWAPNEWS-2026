import { NextResponse } from "next/server";
const currencies = ["USD", "AUD", "SGD", "EUR", "GBP", "JPY", "CNY", "MYR"];
export const revalidate = 900;
export async function GET() { try { const response = await fetch(`https://api.frankfurter.app/latest?from=IDR&to=${currencies.join(",")}`, { next: { revalidate: 900 } }); if (!response.ok) throw new Error("currency upstream unavailable"); const data = await response.json(); return NextResponse.json({ rates: data.rates, date: data.date, updated_at: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } }) } catch { return NextResponse.json({ error: "Kurs sementara tidak tersedia" }, { status: 503 }) } }
