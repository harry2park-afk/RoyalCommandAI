"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Landmark, Sparkles } from "lucide-react";
import { COMMON_ROOM_FIELDS, ROOM_TEMPLATES } from "@/lib/rooms/templates";

type Room = {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
};

t