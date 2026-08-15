import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole } from "@/lib/auth/roles";

function gmailTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) throw new Error("GMAIL_USER atau GMAIL_APP_PASSWORD belum diset");
    return nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
}

function approvalHtml(name: string) {
    return `<div style="font-family:Arial,sans-serif;background:#f6f4fb;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px"><h2 style="color:#4c1d95;margin:0 0 16px">Selamat, ${name}!</h2><p style="color:#444;line-height:1.7">Akun wartawan Anda di <strong>SwapNews</strong> telah disetujui oleh tim Redaksi.</p><p style="color:#444;line-height:1.7">Anda kini dapat menulis, mengirim artikel, dan mengakses ruang kerja review di dashboard wartawan.</p><a href="https://swapnews.co.id/panelswap" style="display:inline-block;margin:20px 0 0;padding:12px 28px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Masuk Dashboard Wartawan</a><hr style="border:none;border-top:1px solid #eee;margin:24px 0"/><p style="color:#999;font-size:11px">Email ini dikirim otomatis oleh sistem SwapNews. Mohon tidak membalas email ini.</p></div></div>`;
}

function rejectionHtml(name: string) {
    return `<div style="font-family:Arial,sans-serif;background:#f6f4fb;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px"><h2 style="color:#991b1b;margin:0 0 16px">Halo, ${name}</h2><p style="color:#444;line-height:1.7">Terima kasih telah mendaftar sebagai wartawan <strong>SwapNews</strong>.</p><p style="color:#444;line-height:1.7">Setelah review tim Redaksi, pendaftaran Anda saat ini <strong>belum dapat disetujui</strong>. Anda dapat mendaftar ulang setelah melengkapi persyaratan yang diminta.</p><p style="color:#444;line-height:1.7">Jika ada pertanyaan, silakan hubungi tim Redaksi melalui kontak resmi SwapNews.</p><hr style="border:none;border-top:1px solid #eee;margin:24px 0"/><p style="color:#999;font-size:11px">Email ini dikirim otomatis oleh sistem SwapNews. Mohon tidak membalas email ini.</p></div></div>`;
}

export async function POST(request: NextRequest) {
    const profile = await getCurrentProfile();
    if (!profile || !isAdminRole(profile.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    const { email, name, action } = (await request.json()) as { email?: string; name?: string; action?: string };
    if (!email || !name || !action) return NextResponse.json({ error: "Data email tidak lengkap" }, { status: 400 });
    if (!["approved", "rejected"].includes(action)) return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    const user = process.env.GMAIL_USER;
    if (!user) return NextResponse.json({ error: "GMAIL_USER belum diset" }, { status: 500 });
    try {
        const transporter = gmailTransporter();
        const isApproved = action === "approved";
        await transporter.sendMail({
            from: `"SwapNews Redaksi" <${user}>`,
            to: email,
            subject: isApproved ? "Pendaftaran Wartawan SwapNews Disetujui" : "Pendaftaran Wartawan SwapNews",
            html: isApproved ? approvalHtml(name) : rejectionHtml(name),
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal mengirim email";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
