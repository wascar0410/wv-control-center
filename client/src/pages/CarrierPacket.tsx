import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Pencil, Save, X, RefreshCw } from "lucide-react";

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
};

type PacketData = typeof DEFAULT_DATA;

function EditableField({ label, value, editing, onChange, multiline = false }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; multiline?: boolean;
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
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            className="w-full text-sm text-[#0B1F3A] font-medium border border-[#1D4ED8]/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <div className="text-sm text-[#0B1F3A] font-medium leading-snug">{value}</div>
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

  useEffect(() => {
    const stored = localStorage.getItem("wv-carrier-packet");
    if (stored) {
      try { setData(JSON.parse(stored)); } catch {}
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

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-40 bg-[#0B1F3A] border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={WV_LOGO} alt="WV Transport LLC" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-white font-bold text-sm">Carrier Packet</div>
              <div className="text-[#93C5FD] text-xs">WV Transport &amp; Logistics, LLC</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedMsg && <span className="text-green-400 text-xs font-semibold">Guardado</span>}
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
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent text-xs gap-1.5"
                  onClick={() => setEditing(false)}
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs gap-1.5"
                  onClick={handleSave}
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent text-xs gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            )}
            <Button
              size="sm"
              className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs gap-1.5"
              onClick={() => window.print()}
            >
              <FileDown className="w-3.5 h-3.5" /> Descargar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div
          className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(11,31,58,0.12)] overflow-hidden"
          id="carrier-packet-doc"
        >
          {/* Header */}
          <div
            className="px-8 py-8 text-white"
            style={{ background: "linear-gradient(135deg, #0B1F3A 0%, #123D7A 60%, #1D4ED8 100%)" }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-5">
                <img src={WV_LOGO} alt="WV Transport LLC" className="w-20 h-20 object-contain drop-shadow-lg" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#93C5FD] mb-1">
                    Carrier Packet
                  </div>
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#93C5FD] mb-1">
                    {item.label}
                  </div>
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
          <div
            className="px-8 py-5 text-white flex items-center justify-between"
            style={{ background: "linear-gradient(90deg, #0B1F3A 0%, #123D7A 100%)" }}
          >
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

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #carrier-packet-doc { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
