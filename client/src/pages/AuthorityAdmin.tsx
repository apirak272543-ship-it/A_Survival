import { useMemo, useState } from "react";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";

const ROLE_LABELS = {
  user: "ผู้เล่น/ผู้ใช้ทั่วไป",
  gm: "GM · ใช้เครื่องมือสร้างเกม",
  admin: "Admin · ใช้เครื่องมือสร้างเกม",
  master: "Master · จัดการสิทธิ์ทั้งหมด",
} as const;

export default function AuthorityAdmin() {
  const { user } = useAuth();
  const membersQuery = trpc.auth.authority.list.useQuery({ limit: 100 }, { enabled: user?.role === "master" });
  const auditQuery = trpc.auth.authority.audit.useQuery({ limit: 100 }, { enabled: user?.role === "master" });
  const invitationsQuery = trpc.auth.authority.invitations.useQuery({ limit: 100 }, { enabled: user?.role === "master" });
  const utils = trpc.useUtils();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"gm" | "admin">("gm");
  const [inviteNote, setInviteNote] = useState("");
  const setRole = trpc.auth.authority.setRole.useMutation({
    onSuccess: () => { void utils.auth.authority.list.invalidate(); void utils.auth.authority.audit.invalidate(); },
  });
  const revoke = trpc.auth.authority.revokeCreatorAccess.useMutation({
    onSuccess: () => { void utils.auth.authority.list.invalidate(); void utils.auth.authority.audit.invalidate(); },
  });
  const invite = trpc.auth.authority.invite.useMutation({
    onSuccess: () => { setInviteEmail(""); setInviteNote(""); void utils.auth.authority.invitations.invalidate(); },
  });
  const revokeInvitation = trpc.auth.authority.revokeInvitation.useMutation({
    onSuccess: () => void utils.auth.authority.invitations.invalidate(),
  });

  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  const actionError = setRole.error?.message ?? revoke.error?.message ?? invite.error?.message ?? revokeInvitation.error?.message ?? null;
  const auditEvents = auditQuery.data?.events ?? [];
  const invitations = invitationsQuery.data?.invitations ?? [];

  if (membersQuery.isLoading) {
    return <main className="grid min-h-dvh place-items-center bg-[#070a10] px-6 text-slate-100"><p className="text-sm text-cyan-100">กำลังโหลดรายชื่อ authority จาก server…</p></main>;
  }

  return (
    <main className="min-h-dvh bg-[#070a10] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-cyan-300/15 bg-[#0c1422] p-6 shadow-2xl shadow-cyan-950/20">
          <p className="text-xs font-black tracking-[0.2em] text-cyan-200">A_SURVIVAL AUTHORITY</p>
          <h1 className="mt-3 text-2xl font-bold text-white">จัดการ Master / Admin / GM</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">หน้านี้เปิดเฉพาะ Master ที่ server ยืนยันแล้วเท่านั้น สมาชิกต้องเข้าสู่ระบบ OAuth มาก่อนจึงจะปรากฏในรายชื่อ จากนั้น Master จึงมอบสิทธิ์ GM หรือ Admin ได้</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4"><p className="text-xs font-bold text-amber-100">Master</p><p className="mt-1 text-xs text-slate-400">เพิ่ม/ลดสิทธิ์ creator และจัดการ role ได้</p></div>
            <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.04] p-4"><p className="text-xs font-bold text-violet-100">Admin / GM</p><p className="mt-1 text-xs text-slate-400">ใช้ Creator Studio และ Workbench ได้ แต่เปลี่ยนสิทธิ์สมาชิกไม่ได้</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-bold text-slate-200">การเพิกถอน</p><p className="mt-1 text-xs text-slate-400">ลดกลับเป็น user โดยไม่ลบบันทึกบัญชีถาวร</p></div>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-cyan-300/15 bg-[#0c1422] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-white">เชิญสมาชิกใหม่</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">บันทึก invitation ผูกกับอีเมล OAuth เป็นเวลา 7 วัน แต่ระบบยังไม่ส่งอีเมลเองจนกว่าจะมี mail provider ที่ยืนยันแล้ว</p></div><span className="rounded-full border border-amber-300/20 bg-amber-300/[0.05] px-3 py-1 text-[11px] font-bold text-amber-100">Master เท่านั้น</span></div><form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={event => { event.preventDefault(); if (!inviteEmail.trim()) return; invite.mutate({ email: inviteEmail, requestedRole: inviteRole, note: inviteNote || undefined }); }}><input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="อีเมลสมาชิก เช่น gm@example.com" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40" required maxLength={320} /><select value={inviteRole} onChange={event => setInviteRole(event.target.value as "gm" | "admin")} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"><option value="gm">เชิญเป็น GM</option><option value="admin">เชิญเป็น Admin</option></select><button type="submit" disabled={invite.isPending} className="rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-sm font-bold text-cyan-100 disabled:opacity-50">{invite.isPending ? "กำลังบันทึก…" : "สร้าง invitation"}</button><input type="text" value={inviteNote} onChange={event => setInviteNote(event.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40 md:col-span-2" maxLength={512} /></form></section>

        <section className="mt-6 rounded-3xl border border-violet-300/15 bg-[#0c1422] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">Invitation ที่สร้างไว้</h2><p className="mt-1 text-xs text-slate-500">{invitations.length} รายการ · ผู้รับต้องเข้าสู่ระบบด้วย OAuth อีเมลตรงกันก่อนรับสิทธิ์</p></div></div>{invitationsQuery.data?.available === false && <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">ฐานข้อมูลยังไม่พร้อม จึงยังสร้างหรือแสดง invitation จริงไม่ได้</div>}<div className="mt-4 divide-y divide-white/8">{invitations.map(invitation => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="break-all text-sm font-bold text-white">{invitation.email}</p><p className="mt-1 text-xs text-slate-500">{invitation.requestedRole.toUpperCase()} · {invitation.status} · หมดอายุ {new Date(invitation.expiresAt).toLocaleString("th-TH")}</p>{invitation.note && <p className="mt-1 text-xs text-slate-400">{invitation.note}</p>}</div>{invitation.status === "pending" && <button type="button" onClick={() => revokeInvitation.mutate({ invitationId: invitation.id })} disabled={revokeInvitation.isPending} className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-100 disabled:opacity-50">เพิกถอน invitation</button>}</div>)}{invitations.length === 0 && invitationsQuery.data?.available !== false && <p className="py-4 text-sm text-slate-500">ยังไม่มี invitation</p>}</div></section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1422]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div><h2 className="text-lg font-bold text-white">สมาชิกที่เข้าสู่ระบบแล้ว</h2><p className="mt-1 text-xs text-slate-500">ทั้งหมด {members.length} บัญชี · ข้อมูลนี้อ่านจาก server ไม่ใช่ localStorage</p></div>
            <button type="button" onClick={() => void membersQuery.refetch()} disabled={membersQuery.isFetching} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{membersQuery.isFetching ? "กำลังโหลด…" : "รีเฟรชรายชื่อ"}</button>
          </div>
          {membersQuery.data?.available === false && <div className="m-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">ฐานข้อมูลยังไม่พร้อม จึงยังไม่แสดงหรือเปลี่ยน role จริง ตรวจพบเฉพาะ contract เท่านั้น</div>}
          {actionError && <div className="m-5 rounded-2xl border border-rose-300/20 bg-rose-300/[0.05] p-4 text-sm text-rose-100" role="alert">ดำเนินการไม่สำเร็จ: {actionError}</div>}
          <div className="divide-y divide-white/8">
            {members.map(member => {
              const isMaster = member.role === "master";
              return <div key={member.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-bold text-white">{member.name || "ไม่มีชื่อแสดง"}</p><p className="mt-1 break-all text-xs text-slate-500">{member.email || "ไม่มีอีเมลจาก OAuth"} · user id {member.id}</p><p className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-300">{ROLE_LABELS[member.role]}</p></div><div className="flex flex-wrap gap-2">{isMaster ? <span className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs font-bold text-amber-100">ล็อก Master</span> : <><button type="button" onClick={() => setRole.mutate({ targetUserId: member.id, role: "gm" })} disabled={setRole.isPending || revoke.isPending || member.role === "gm"} className="rounded-xl border border-violet-300/20 bg-violet-300/[0.06] px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">ตั้งเป็น GM</button><button type="button" onClick={() => setRole.mutate({ targetUserId: member.id, role: "admin" })} disabled={setRole.isPending || revoke.isPending || member.role === "admin"} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">ตั้งเป็น Admin</button><button type="button" onClick={() => revoke.mutate({ targetUserId: member.id })} disabled={setRole.isPending || revoke.isPending || member.role === "user"} className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-100 disabled:opacity-50">เพิกถอน creator</button></>}</div></div>;
            })}
            {members.length === 0 && <div className="p-8 text-center text-sm text-slate-500">ยังไม่มีสมาชิกที่อ่านได้จากฐานข้อมูล หรือฐานข้อมูลยังไม่พร้อม</div>}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1422]"><div className="border-b border-white/10 p-5"><h2 className="text-lg font-bold text-white">ประวัติการเปลี่ยนสิทธิ์</h2><p className="mt-1 text-xs text-slate-500">บันทึก immutable จาก server · {auditEvents.length} เหตุการณ์</p></div>{auditQuery.data?.available === false && <div className="m-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">ฐานข้อมูลยังไม่พร้อม จึงยังไม่มี audit events ให้โหลด</div>}<div className="divide-y divide-white/8">{auditEvents.map(event => <div key={event.id} className="p-5"><p className="text-xs font-bold text-slate-200">{event.action === "grant" ? "มอบสิทธิ์" : "เพิกถอนสิทธิ์"} · {event.fromRole} → {event.toRole}</p><p className="mt-1 text-xs text-slate-500">actor {event.actorUserId} · target {event.targetUserId} · {new Date(event.createdAt).toISOString()}</p><p className="mt-2 text-xs text-slate-300">เหตุผล: {event.reason}</p></div>)}{auditEvents.length === 0 && auditQuery.data?.available !== false && <div className="p-8 text-center text-sm text-slate-500">ยังไม่มีเหตุการณ์ที่อ่านได้</div>}</div></section>

        <a href="/" className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100">กลับหน้าผู้เล่น</a>
      </div>
    </main>
  );
}
