import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

function requiresPayment(service: { pricing_type?: string | null; default_included?: boolean | null }) {
  return !service.default_included && service.pricing_type !== "free";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Service catalog unavailable" }, { status: 503 });

  const supabase = await createClient();
  const [{ data: services, error: servicesError }, { data: selections, error: selectionsError }] = await Promise.all([
    supabase
      .from("rc_service_catalog")
      .select("service_key,category,name_ko,name_en,summary_ko,summary_en,pricing_type,currency,price_minor,price_status,default_included,sort_order,connection_status,agreement_required,terms_version")
      .eq("active", true)
      .eq("customer_selectable", true)
      .eq("connection_scope", "rca_chat")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("rc_user_service_selections")
      .select("service_key,selection_status,payment_status,agreed_at,terms_version")
      .eq("owner_id", user.id),
  ]);

  if (servicesError || selectionsError) {
    return NextResponse.json({ error: servicesError?.message || selectionsError?.message || "Unable to load services" }, { status: 500 });
  }

  const selectionByKey = new Map((selections || []).map((row) => [row.service_key, row]));
  return NextResponse.json({
    services: (services || []).map((service) => {
      const selection = selectionByKey.get(service.service_key);
      return {
        ...service,
        payment_required: requiresPayment(service),
        selection_status: selection?.selection_status || (service.default_included ? "active" : "cancelled"),
        payment_status: selection?.payment_status || "not_required",
        agreed_at: selection?.agreed_at || null,
      };
    }),
    checkoutConfigured: false,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Service catalog unavailable" }, { status: 503 });

  const body = await request.json().catch(() => null) as { serviceKey?: unknown; action?: unknown; agree?: unknown } | null;
  const serviceKey = typeof body?.serviceKey === "string" ? body.serviceKey.trim() : "";
  const action = body?.action === "agree_connect" || body?.action === "disconnect" ? body.action : null;
  if (!serviceKey || !action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const { data: service } = await supabase
    .from("rc_service_catalog")
    .select("service_key,default_included,active,customer_selectable,connection_scope,pricing_type,price_minor,currency,terms_version,agreement_required")
    .eq("service_key", serviceKey)
    .maybeSingle();
  if (!service?.active || !service?.customer_selectable || service.connection_scope !== "rca_chat") {
    return NextResponse.json({ error: "Service unavailable in RCA Chat Room" }, { status: 404 });
  }
  if (action === "disconnect" && service.default_included) {
    return NextResponse.json({ error: "Included core service cannot be disconnected" }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (action === "disconnect") {
    const { error } = await supabase
      .from("rc_user_service_selections")
      .upsert({ owner_id: user.id, service_key: serviceKey, selection_status: "cancelled", cancelled_at: now, updated_at: now }, { onConflict: "owner_id,service_key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, serviceKey, selectionStatus: "cancelled", paymentStatus: "not_required" });
  }

  if (service.agreement_required && body?.agree !== true) return NextResponse.json({ error: "Agreement is required" }, { status: 400 });

  const paymentRequired = requiresPayment(service);
  const selectionStatus = paymentRequired ? "pending_payment" : "active";
  const paymentStatus = paymentRequired ? "required" : "not_required";

  const { error: selectionError } = await supabase
    .from("rc_user_service_selections")
    .upsert({
      owner_id: user.id,
      service_key: serviceKey,
      selection_status: selectionStatus,
      agreed_at: now,
      terms_version: service.terms_version,
      payment_status: paymentStatus,
      price_snapshot_minor: service.price_minor,
      currency_snapshot: service.currency,
      selected_at: now,
      activated_at: paymentRequired ? null : now,
      cancelled_at: null,
      updated_at: now,
    }, { onConflict: "owner_id,service_key" });
  if (selectionError) return NextResponse.json({ error: selectionError.message }, { status: 500 });

  let orderId: string | null = null;
  if (paymentRequired) {
    const { data: order, error: orderError } = await supabase
      .from("rc_service_connection_orders")
      .insert({
        owner_id: user.id,
        room_id: null,
        service_key: serviceKey,
        connection_scope: "rca_chat",
        terms_version: service.terms_version,
        agreed_at: now,
        amount_minor: service.price_minor,
        currency: service.currency,
        payment_required: true,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });
    orderId = order.id;
  }

  return NextResponse.json({ ok: true, serviceKey, selectionStatus, paymentStatus, paymentRequired, orderId, checkoutConfigured: false });
}
