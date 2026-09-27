"use client";

import { useMemo, useState } from "react";
import CreateRoomPremiumWizard from "./CreateRoomPremiumWizard";
import { createRoomProfileCopy } from "@/lib/rooms/create-room-profile-i18n";

type CustomerInfo = {
  id: string;
  fullName: string;
  email: string;
  defaultLanguage: string;
  phone: string;
  address: string;
};

export default function CreateRoomExperience({ customer }: { customer: CustomerInfo }) {
  const profileCopy = useMemo(
    () => createRoomProfileCopy(customer.defaultLanguage),
    [customer.defaultLanguage],
  );
  const [roomName, setRoomName] = useState("");

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-7 md:px-8 md:pt-10">
        <section className="rounded-[28px] border border-[var(--gold)]/35 bg-black/25 p-5 shadow-[0_20px_70px_rgba(0,0,0,.25)] md:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Royal Command · {profileCopy.eyebrow}</div>
          <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{profileCopy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{profileCopy.note}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label={profileCopy.name} value={customer.fullName || profileCopy.notRegistered} />
            <Info label={profileCopy.email} value={customer.email || profileCopy.notRegistered} />
            <Info label={profileCopy.customerId} value={customer.id || profileCopy.signInRequired} />
            <Info label={profileCopy.phone} value={customer.phone || profileCopy.notRegistered} />
            <Info label={profileCopy.address} value={customer.address || profileCopy.notRegistered} />
            <Info label={profileCopy.defaultLanguage} value={customer.defaultLanguage || "en"} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--gold-soft)]">{profileCopy.roomNameLabel}</span>
              <input className="rc-input mt-2" value={roomName} onChange={(event) => setRoomName(event.target.value.slice(0, 120))} placeholder={profileCopy.roomNamePlaceholder} />
              <p className="mt-2 text-xs text-[var(--muted)]">{profileCopy.roomNameHelp}</p>
            </label>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-sm font-semibold text-emerald-200">{profileCopy.trainingTitle}</div>
              <div className="mt-2 text-sm leading-6">{profileCopy.trainingBody}</div>
            </div>
          </div>
        </section>
      </div>

      <CreateRoomPremiumWizard initialLocale={profileCopy.locale} initialRoomName={roomName} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</div><div className="mt-1 break-words text-sm font-semibold">{value}</div></div>;
}
