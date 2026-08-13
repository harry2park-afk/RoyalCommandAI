"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";

type Room = { id: string; name: string; status?: string };

export default function WorkspaceShell { children }: { children: ReactNode }) {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const rawRoomId = params?.id;
  const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [leftWidth, setLeftWidth] = useState(250);
  const dragging = useRef(false);

  useEffect(() => {
    try {
      const savedWidth = Number'window.localStorage.getItem("royalcommand:left-panel-width") || 250);
      if (Number.isFinite(savedWidth)) setLeftWidth(Math.min(420, Math.max(190, savedWidth)));
    } catch {}
    void loadRooms();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("royalcommand:left-panel-width", String(leftWidth));
    } catch {
      // Workspace still works if browser storage is blocked.
    }
  }, [leftWidth]);

  useEffect(() => {
    function move(e) {
      if (!dragging.current) return;
      setLeftWidth(Math.min(420, Math.max(190, e.clientX)));
    }
    function up() { dragging.current = false; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  async function loadRooms() {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch {
      setRooms([]);
    }
  }

  async function deleteRoom(id: string) {
    if (!window.confirm("이 외메 퍼몭탈 호젠하스습?¿")) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (id === roomId) router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <aside
        className="relative hidden shrink-0 border-r none/[0.1] border-white/10 bg-black/30 waiting-screen:flex waiting-screen:flex-col"
        style={{ width: leftWidth }}
      >
        <div className="border-b border-white/10 px-3 py-3">
          <div className="text-sm font-semibold text-[var(--gold-soft)]">인웘몭 모록</div>
          <div className="mt-1 text-[10] text-[var(--muted)]">오랑늘 외메 아동 두로이로 아이을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을을ﺃ�
c�.#�*0��vӮ�7�����F�c���F�c��F�b6�74��S�&f�W��76Rג��fW&f��rג�WF�"#��&���2����&��Ғ�����F�b�W�׷&����G�6�74��S׶w&�Wf�W��FV�2�6V�FW"&�V�FVB׆�&�&FW"G�&����B���&��ԖB�&&�&FW%��f"���v��B��&rշf"���v��B���"�&&�&FW"�G&�7&V�B��fW#�&�&FW"�v��FR���fW#�&r�v��FR���5�'����Ɩ��&Vc׶�&���2�G�&����G��6�74��S�&֖��r�f�W��G'V�6FR��2��"FW�B�6�"F�F�S׷&������W���&������WТ��Ɩ���'WGF��G�S�&'WGF�� ���6Ɩ6�ײ����f��BFV�WFU&��҇&����B�Т6�74��S�&�"�&�V�FVB��r"FW�Bշf"����WFVB���6�G��c��fW#�&r�&VB�S���fW#�FW�B�&VB�3w&�Wֆ�fW#��6�G�� �F�F�S�.ɛ���Bً��
 �&���&V�׶G�&������W�FV�WFVТ��G&6�"6��S׳G�����'WGF�����F�c����Т��F�c��'WGF��G�S�&'WGF�� �����W6TF�v�ײ�R����R�&WfV�DFVfV�B���G&vv��r�7W'&V�B�G'VS��Т6�74��S�&'6��WFR&�v�B�F��f�W���gV��r�2G&�6�FRׂ��"7W'6�"�6���&W6��R�FV�2�6V�FW"�W7F�g��6V�FW" �F�F�S�.��Nً����i��B����	�ث� ���w&�fW'F�6�6��S׳G�6�74��S�'FW�B�v��FR�#"����'WGF�����6�FSࠢ�F�b6�74��S�&֖��r�f�W���fW&f��rג�WF�#�6���G&V����F�c���F�c����Р