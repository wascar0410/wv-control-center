import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Pencil, Save, X, RefreshCw, Mail, Printer } from "lucide-react";

const WV_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/5H4pkNJXcp8hDFeVp3tRuz/wv-logo-512_13053a10.png";

const DEFAULT_DATA = {
  companyName: "WV Transport & Logistics, LLC",
  entityType: "Limited Liability Company (LLC)",
  state: "Pennsylvania, USA",
  address: "502 W 7th St, Suite 100, Erie, PA 16502",
  phone: "(267) 390-3204",
  email: "info@wvtransports.com",
  website: "wvtransports.com",
  mcNumber: "MC-XXXXXXX (Pending)",
  dotNumber: "DOT-XXXXXXX (Pending)",
  einNumber: "XX-XXXXXXX",
  operatingAuthority: "Common Carrier - Cargo Van / Sprinter",
  insuranceCarrier: "To be provided upon request",
  insurancePolicyNumber: "To be provided upon request",
  insuranceLiability: "$1,000,000 General Liability",
  insuranceCargo: "$100,000 Cargo Insurance",
  equipmentTypes: "Cargo Van (Ford Transit / Ram ProMaster), Sprinter Van",
  maxWeight: "3,500 lbs",
  maxDims: "144 in L x 60 in W x 60 in H",
  serviceArea: "Pennsylvania, New Jersey, New York, Delaware, Maryland, Ohio - Regional & Local",
  dispatchContact: "Walter Vasquez",
  dispatchPhone: "(267) 390-3204",
  dispatchEmail: "info@wvtransports.com",
  dispatchHours: "Monday to Friday: 7:00 AM - 7:00 PM EST",
  paymentTerms: "Quick Pay available. Standard Net-30. Factoring accepted.",
  preferredLanes: "PA to NJ, PA to NY, PA to OH, Mid-Atlantic regional lanes",
  notes: "WV Transport & Logistics is a professionally operated cargo van carrier with documented workflows, real-time GPS tracking, digital proof of delivery, and internal operational control through WV Control Center. We prioritize communication, reliability, and verified delivery execution on every load.",
  // LOI / Broker fields
  brokerName: "",
  brokerCompany: "",
  brokerEmail: "",
  brokerPhone: "",
  brokerLanes: "Pennsylvania, New Jersey, and New York corridor",
  brokerVolume: "5 – 15 loads/month",
  loiDate: "",
};

type PacketData = typeof DEFAULT_DATA;

function EditableField({ label, value, editing, onChange, multiline = false, placeholder = "" }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="py-2 border-b border-[#E8EDF5] last:border-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] mb-0.5">{label}</div>
      {editing ? (
        multiline ? (
          <textarea
            className="w-full text-sm text-[#0B1F3A] font-medium border border-[#1D4ED8]/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
            rows={3}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            className="w-full text-sm text-[#0B1F3A] font-medium border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <div className={`text-sm font-medium leading-snug ${value ? "text-[#0B1F3A]" : "text-[#9CA3AF] italic"}`}>
          {value || placeholder || "—"}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div
        className="px-4 py-2 mb-3 rounded-lg text-white text-xs font-bold uppercase tracking-[0.18em]"
        style={{ background: "linear-gradient(90deg, #0B1F3A 0%, #1D4ED8 100%)" }}
      >
        {title}
      </div>
      <div className="px-2">{children}</div>
    </div>
  );
}

export default function CarrierPacket() {
  const [data, setData] = useState<PacketData>({ ...DEFAULT_DATA });
  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<"packet" | "loi">("packet");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("wv-carrier-packet");
    if (stored) {
      try { setData({ ...DEFAULT_DATA, ...JSON.parse(stored) }); } catch {}
    }
  }, []);

  const update = (key: keyof PacketData) => (value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    localStorage.setItem("wv-carrier-packet", JSON.stringify(data));
    setEditing(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm("Restablecer todos los campos a los valores predeterminados?")) {
      setData({ ...DEFAULT_DATA });
      localStorage.removeItem("wv-carrier-packet");
    }
  };

  const handlePrintLOI = () => {
    setActiveTab("loi");
    setTimeout(() => window.print(), 300);
  };

  const handleEmailBroker = () => {
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const subject = encodeURIComponent(`Carrier Packet & Letter of Intent — WV Transport & Logistics, LLC`);
    const body = encodeURIComponent(
`Dear ${data.brokerName || "Freight Broker"},

My name is ${data.dispatchContact} from WV Transport & Logistics, LLC — a Pennsylvania-based cargo van carrier.

I am reaching out to express our interest in establishing a carrier relationship with ${data.brokerCompany || "your brokerage"} for freight lanes in ${data.brokerLanes}.

CARRIER OVERVIEW:
• Company: ${data.companyName}
• MC Number: ${data.mcNumber}
• DOT Number: ${data.dotNumber}
• Equipment: ${data.equipmentTypes}
• Max Capacity: ${data.maxWeight}
• Service Area: ${data.serviceArea}
• Preferred Lanes: ${data.preferredLanes}

INSURANCE:
• General Liability: ${data.insuranceLiability}
• Cargo Insurance: ${data.insuranceCargo}

DISPATCH CONTACT:
• Name: ${data.dispatchContact}
• Phone: ${data.dispatchPhone}
• Email: ${data.dispatchEmail}
• Hours: ${data.dispatchHours}

PAYMENT TERMS: ${data.paymentTerms}

LETTER OF INTENT:
We formally express our intent to provide cargo van carrier services for ${data.brokerCompany || "[Broker Company]"} upon completion of our MC/DOT operating authority registration. Estimated load volume: ${data.brokerVolume} per month.

${data.notes}

We would love to schedule a brief call to discuss onboarding. Please feel free to contact us at ${data.dispatchPhone} or ${data.dispatchEmail}.

Thank you for your time and consideration.

Best regards,
${data.dispatchContact}
${data.companyName}
${data.dispatchPhone} | ${data.dispatchEmail}
${data.website}

Date: ${today}`
    );

    const mailtoUrl = `mailto:${data.brokerEmail || ""}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, "_blank");
    setEmailSent(true);
    setShowEmailModal(false);
    setTimeout(() => setEmailSent(false), 4000);
  };

  const today = data.loiDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-40 bg-[#0B1F3A] border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={WV_LOGO} alt="WV Transport LLC" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-white font-bold text-sm">Carrier Packet</div>
              <div className="text-[#93C5FD] text-xs">WV Transport &amp; Logistics, LLC</div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("packet")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${activeTab === "packet" ? "bg-[#1D4ED8] text-white" : "text-[#93C5FD] hover:text-white"}`}
            >
              Carrier Packet
            </button>
            <button
              onClick={() => setActiveTab("loi")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${activeTab === "loi" ? "bg-[#1D4ED8] text-white" : "text-[#93C5FD] hover:text-white"}`}
            >
              Letter of Intent
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {savedMsg && <span className="text-green-400 text-xs font-semibold">✓ Guardado</span>}
            {emailSent && <span className="text-green-400 text-xs font-semibold">✓ Email abierto</span>}
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent text-xs gap-1.5"
              onClick={handleReset}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restablecer
            </Button>
            {editing ? (
              <>
                <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent text-xs gap-1.5" onClick={() => setEditing(false)}>
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
                <Button size="sm" className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs gap-1.5" onClick={handleSave}>
                  <Save className="w-3.5 h-3.5" /> Guardar
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent text-xs gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            )}
            {activeTab === "loi" && (
              <Button size="sm" variant="outline" className="border-amber-400/50 text-amber-300 hover:bg-amber-400/10 bg-transparent text-xs gap-1.5" onClick={() => setShowEmailModal(true)}>
                <Mail className="w-3.5 h-3.5" /> Enviar al Broker
              </Button>
            )}
            {activeTab === "loi" ? (
              <Button size="sm" className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs gap-1.5" onClick={handlePrintLOI}>
                <Printer className="w-3.5 h-3.5" /> Imprimir LOI
              </Button>
            ) : (
              <Button size="sm" className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs gap-1.5" onClick={() => window.print()}>
                <FileDown className="w-3.5 h-3.5" /> Descargar PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0B1F3A] text-base">Enviar al Broker por Correo</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Se abrirá tu cliente de correo con el Carrier Packet y LOI pre-redactados. Revisa y envía.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 block mb-1">Nombre del Broker</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                  placeholder="John Smith"
                  value={data.brokerName}
                  onChange={(e) => update("brokerName")(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 block mb-1">Empresa del Broker</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                  placeholder="Coyote Logistics"
                  value={data.brokerCompany}
                  onChange={(e) => update("brokerCompany")(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 block mb-1">Email del Broker *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                  placeholder="broker@company.com"
                  type="email"
                  value={data.brokerEmail}
                  onChange={(e) => update("brokerEmail")(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEmailModal(false)}>Cancelar</Button>
              <Button className="flex-1 bg-[#1D4ED8] hover:bg-[#1e40af] text-white gap-2" onClick={handleEmailBroker}>
                <Mail className="w-4 h-4" /> Abrir en Correo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CARRIER PACKET TAB ── */}
      {activeTab === "packet" && (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(11,31,58,0.12)] overflow-hidden" id="carrier-packet-doc">
            {/* Header */}
            <div className="px-8 py-8 text-white" style={{ background: "linear-gradient(135deg, #0B1F3A 0%, #123D7A 60%, #1D4ED8 100%)" }}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-5">
                  <img src={WV_LOGO} alt="WV Transport LLC" className="w-20 h-20 object-contain drop-shadow-lg" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#93C5FD] mb-1">Carrier Packet</div>
                    <h1 className="text-2xl font-bold leading-tight">{data.companyName}</h1>
                    <div className="text-[#BFDBFE] text-sm mt-1">{data.entityType}</div>
                    <div className="text-[#93C5FD] text-xs mt-0.5">{data.state}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-[#93C5FD] space-y-1 flex-shrink-0">
                  <div>{data.address}</div>
                  <div>{data.phone}</div>
                  <div>{data.email}</div>
                  <div>{data.website}</div>
                </div>
              </div>
              <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "MC Number", value: data.mcNumber },
                  { label: "DOT Number", value: data.dotNumber },
                  { label: "EIN / Tax ID", value: data.einNumber },
                  { label: "Authority", value: data.operatingAuthority },
                ].map((item) => (
                  <div key={item.label} className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#93C5FD] mb-1">{item.label}</div>
                    <div className="text-white text-xs font-semibold leading-snug">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="p-8 grid md:grid-cols-2 gap-x-10">
              <div>
                <Section title="Company Information">
                  <EditableField label="Legal Name" value={data.companyName} editing={editing} onChange={update("companyName")} />
                  <EditableField label="Entity Type" value={data.entityType} editing={editing} onChange={update("entityType")} />
                  <EditableField label="State" value={data.state} editing={editing} onChange={update("state")} />
                  <EditableField label="Address" value={data.address} editing={editing} onChange={update("address")} />
                  <EditableField label="Phone" value={data.phone} editing={editing} onChange={update("phone")} />
                  <EditableField label="Email" value={data.email} editing={editing} onChange={update("email")} />
                  <EditableField label="Website" value={data.website} editing={editing} onChange={update("website")} />
                </Section>
                <Section title="Authority and Registration">
                  <EditableField label="MC Number" value={data.mcNumber} editing={editing} onChange={update("mcNumber")} />
                  <EditableField label="DOT Number" value={data.dotNumber} editing={editing} onChange={update("dotNumber")} />
                  <EditableField label="EIN / Tax ID" value={data.einNumber} editing={editing} onChange={update("einNumber")} />
                  <EditableField label="Operating Authority" value={data.operatingAuthority} editing={editing} onChange={update("operatingAuthority")} />
                </Section>
                <Section title="Insurance">
                  <EditableField label="Insurance Carrier" value={data.insuranceCarrier} editing={editing} onChange={update("insuranceCarrier")} />
                  <EditableField label="Policy Number" value={data.insurancePolicyNumber} editing={editing} onChange={update("insurancePolicyNumber")} />
                  <EditableField label="General Liability" value={data.insuranceLiability} editing={editing} onChange={update("insuranceLiability")} />
                  <EditableField label="Cargo Insurance" value={data.insuranceCargo} editing={editing} onChange={update("insuranceCargo")} />
                </Section>
              </div>
              <div>
                <Section title="Equipment">
                  <EditableField label="Vehicle Types" value={data.equipmentTypes} editing={editing} onChange={update("equipmentTypes")} />
                  <EditableField label="Max Weight Capacity" value={data.maxWeight} editing={editing} onChange={update("maxWeight")} />
                  <EditableField label="Max Cargo Dimensions" value={data.maxDims} editing={editing} onChange={update("maxDims")} />
                </Section>
                <Section title="Service Area and Lanes">
                  <EditableField label="Service Area" value={data.serviceArea} editing={editing} onChange={update("serviceArea")} multiline />
                  <EditableField label="Preferred Lanes" value={data.preferredLanes} editing={editing} onChange={update("preferredLanes")} multiline />
                </Section>
                <Section title="Dispatch Contact">
                  <EditableField label="Contact Name" value={data.dispatchContact} editing={editing} onChange={update("dispatchContact")} />
                  <EditableField label="Phone" value={data.dispatchPhone} editing={editing} onChange={update("dispatchPhone")} />
                  <EditableField label="Email" value={data.dispatchEmail} editing={editing} onChange={update("dispatchEmail")} />
                  <EditableField label="Hours" value={data.dispatchHours} editing={editing} onChange={update("dispatchHours")} />
                </Section>
                <Section title="Payment and Terms">
                  <EditableField label="Payment Terms" value={data.paymentTerms} editing={editing} onChange={update("paymentTerms")} multiline />
                </Section>
              </div>
            </div>

            {/* Notes */}
            <div className="px-8 pb-8">
              <Section title="Company Statement">
                <EditableField label="About WV Transport" value={data.notes} editing={editing} onChange={update("notes")} multiline />
              </Section>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 text-white flex items-center justify-between" style={{ background: "linear-gradient(90deg, #0B1F3A 0%, #123D7A 100%)" }}>
              <div className="flex items-center gap-3">
                <img src={WV_LOGO} alt="WV Transport LLC" className="w-8 h-8 object-contain" />
                <div>
                  <div className="text-white text-xs font-bold">WV Transport &amp; Logistics, LLC</div>
                  <div className="text-[#93C5FD] text-[10px]">Professional Carrier - Pennsylvania, USA</div>
                </div>
              </div>
              <div className="text-[#93C5FD] text-[10px] text-right">
                <div>This carrier packet is prepared for broker and shipper review.</div>
                <div>All information subject to verification. 2026 WV Transport &amp; Logistics, LLC</div>
              </div>
            </div>
          </div>
          {!editing && (
            <div className="no-print mt-4 text-center text-[#6B7A99] text-xs">
              Haz clic en <strong>Editar</strong> para actualizar los campos (MC/DOT, seguro, etc.) — Los cambios se guardan en este dispositivo
            </div>
          )}
        </div>
      )}

      {/* ── LETTER OF INTENT TAB ── */}
      {activeTab === "loi" && (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* LOI Broker Fields (no-print) */}
          <div className="no-print bg-white rounded-2xl shadow-md p-6 mb-6 border border-[#E8EDF5]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Datos del Broker — Personaliza antes de imprimir o enviar</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Nombre del Broker</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" placeholder="John Smith" value={data.brokerName} onChange={(e) => update("brokerName")(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Empresa del Broker</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" placeholder="Coyote Logistics" value={data.brokerCompany} onChange={(e) => update("brokerCompany")(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Email del Broker</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" placeholder="broker@company.com" type="email" value={data.brokerEmail} onChange={(e) => update("brokerEmail")(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Teléfono del Broker</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" placeholder="(555) 000-0000" value={data.brokerPhone} onChange={(e) => update("brokerPhone")(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Lanes / Rutas</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" value={data.brokerLanes} onChange={(e) => update("brokerLanes")(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Volumen Estimado</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" value={data.brokerVolume} onChange={(e) => update("brokerVolume")(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7A99] block mb-1">Fecha del LOI</label>
                <input className="w-full border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" placeholder={today} value={data.loiDate} onChange={(e) => update("loiDate")(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs gap-2" onClick={() => { localStorage.setItem("wv-carrier-packet", JSON.stringify(data)); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }}>
                <Save className="w-3.5 h-3.5" /> Guardar datos del broker
              </Button>
              <Button variant="outline" className="text-xs gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setShowEmailModal(true)}>
                <Mail className="w-3.5 h-3.5" /> Enviar al Broker
              </Button>
            </div>
          </div>

          {/* LOI Document */}
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(11,31,58,0.12)] overflow-hidden" id="loi-doc">
            {/* LOI Header */}
            <div className="px-10 py-8 text-white" style={{ background: "linear-gradient(135deg, #0B1F3A 0%, #123D7A 60%, #1D4ED8 100%)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={WV_LOGO} alt="WV Transport LLC" className="w-16 h-16 object-contain drop-shadow-lg" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#93C5FD] mb-1">Letter of Intent</div>
                    <div className="text-xl font-bold">{data.companyName}</div>
                    <div className="text-[#93C5FD] text-xs mt-0.5">{data.state}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-[#93C5FD]">
                  <div>Date: {today}</div>
                  <div className="mt-1">MC: {data.mcNumber}</div>
                  <div>DOT: {data.dotNumber}</div>
                </div>
              </div>
            </div>

            {/* LOI Body */}
            <div className="px-10 py-8 text-[#0B1F3A]">
              <div className="mb-6">
                <div className="text-xs text-[#6B7A99] mb-1">To:</div>
                <div className="font-bold text-base">{data.brokerName || "[Broker Contact Name]"}</div>
                <div className="text-sm text-[#374151]">{data.brokerCompany || "[Broker Company Name]"}</div>
                {data.brokerEmail && <div className="text-sm text-[#374151]">{data.brokerEmail}</div>}
                {data.brokerPhone && <div className="text-sm text-[#374151]">{data.brokerPhone}</div>}
              </div>

              <div className="mb-5">
                <div className="font-bold text-lg mb-3 text-[#0B1F3A]">RE: Letter of Intent to Engage Carrier Services</div>
                <p className="text-sm text-[#374151] leading-relaxed mb-4">
                  Dear {data.brokerName || "[Broker Name]"},
                </p>
                <p className="text-sm text-[#374151] leading-relaxed mb-4">
                  This Letter of Intent formally expresses the intent of <strong>{data.companyName}</strong> to provide cargo van carrier services to <strong>{data.brokerCompany || "[Broker Company Name]"}</strong> for freight lanes in the <strong>{data.brokerLanes}</strong> corridor, upon completion of our MC/DOT operating authority registration with the Federal Motor Carrier Safety Administration (FMCSA).
                </p>
                <p className="text-sm text-[#374151] leading-relaxed mb-4">
                  We are committed to delivering professional, reliable, and fully documented freight services with 100% Proof of Delivery compliance, real-time GPS tracking, and transparent communication on every load.
                </p>
              </div>

              {/* LOI Terms Table */}
              <div className="bg-[#F0F4FA] rounded-xl p-5 mb-6">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#1D4ED8] mb-3">Agreement Terms</div>
                <div className="space-y-2">
                  {[
                    ["Carrier", data.companyName],
                    ["Broker / Client", data.brokerCompany || "[Broker Company Name — TBD]"],
                    ["Scope", "Cargo Van Freight — Regional Lanes"],
                    ["Service Lanes", data.brokerLanes],
                    ["Estimated Volume", `${data.brokerVolume} per broker`],
                    ["Equipment", data.equipmentTypes],
                    ["Max Capacity", data.maxWeight],
                    ["Insurance — Liability", data.insuranceLiability],
                    ["Insurance — Cargo", data.insuranceCargo],
                    ["Payment Terms", data.paymentTerms],
                    ["Effective Upon", "MC/DOT Authority Approval — FMCSA"],
                    ["Status", "Pending Execution — Awaiting Operating Authority"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-sm border-b border-[#E8EDF5] pb-2 last:border-0">
                      <span className="font-semibold text-[#6B7A99] w-44 flex-shrink-0">{k}</span>
                      <span className="text-[#0B1F3A] font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-[#374151] leading-relaxed mb-4">
                Both parties acknowledge that this Letter of Intent is a planning-level document expressing mutual interest. Formal carrier agreements, rate confirmations, and onboarding documentation will be executed upon completion of MC/DOT operating authority registration and carrier setup with {data.brokerCompany || "[Broker Company]"}.
              </p>
              <p className="text-sm text-[#374151] leading-relaxed mb-8">
                We look forward to building a professional and long-term carrier relationship. Please do not hesitate to contact us at <strong>{data.dispatchPhone}</strong> or <strong>{data.dispatchEmail}</strong> to discuss next steps.
              </p>

              {/* Signature block */}
              <div className="grid grid-cols-2 gap-10 mt-8">
                <div>
                  <div className="border-b-2 border-[#0B1F3A] mb-2 pb-8" />
                  <div className="text-sm font-bold text-[#0B1F3A]">{data.dispatchContact}</div>
                  <div className="text-xs text-[#6B7A99]">Authorized Representative</div>
                  <div className="text-xs text-[#6B7A99]">{data.companyName}</div>
                  <div className="text-xs text-[#6B7A99] mt-1">Date: {today}</div>
                </div>
                <div>
                  <div className="border-b-2 border-[#0B1F3A] mb-2 pb-8" />
                  <div className="text-sm font-bold text-[#0B1F3A]">{data.brokerName || "[Broker Representative]"}</div>
                  <div className="text-xs text-[#6B7A99]">Authorized Representative</div>
                  <div className="text-xs text-[#6B7A99]">{data.brokerCompany || "[Broker Company]"}</div>
                  <div className="text-xs text-[#6B7A99] mt-1">Date: _______________</div>
                </div>
              </div>
            </div>

            {/* LOI Footer */}
            <div className="px-10 py-4 text-white flex items-center justify-between" style={{ background: "linear-gradient(90deg, #0B1F3A 0%, #123D7A 100%)" }}>
              <div className="flex items-center gap-3">
                <img src={WV_LOGO} alt="WV Transport LLC" className="w-7 h-7 object-contain" />
                <div className="text-white text-xs font-bold">{data.companyName}</div>
              </div>
              <div className="text-[#93C5FD] text-[10px] text-right">
                <div>{data.address} · {data.phone} · {data.email}</div>
                <div>MC: {data.mcNumber} · DOT: {data.dotNumber}</div>
              </div>
            </div>
          </div>

          <div className="no-print mt-4 text-center text-[#6B7A99] text-xs">
            Completa los datos del broker arriba, luego usa <strong>Imprimir LOI</strong> para generar el PDF o <strong>Enviar al Broker</strong> para abrir tu correo con el mensaje pre-redactado.
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #carrier-packet-doc, #loi-doc { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
