import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Truck,
  Waypoints,
} from "lucide-react";

const brand = {
  company: "WV Transport & Logistics, LLC",
  product: "WV Control Center",
  taglineEn:
    "Professional logistics support with real-time visibility and operational control.",
  taglineEs:
    "Soporte logístico profesional con visibilidad en tiempo real y control operativo.",
};

export default function About() {
  return (
    <div className="min-h-screen bg-[#F8FBFF] text-[#0F172A]">
      <section className="relative overflow-hidden bg-[#0B1F3A] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.28),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(18,61,122,0.35),transparent_30%)]" />
        <div className="relative container mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-[#60A5FA]" />
              {brand.company}
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {brand.product}
            </h1>

            <p className="mt-5 max-w-3xl text-lg text-white/80 sm:text-xl">
              Internal logistics control system for transportation operations.
            </p>

            <p className="mt-3 max-w-3xl text-base text-white/70 sm:text-lg">
              {brand.taglineEn}
            </p>

            <p className="mt-2 max-w-3xl text-base text-[#BFDBFE] sm:text-lg">
              {brand.taglineEs}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="rounded-full bg-[#1D4ED8] px-6 py-6 text-white hover:bg-[#123D7A]"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Enter Control Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/20 bg-white/5 px-6 py-6 text-white hover:bg-white/10"
                onClick={() =>
                  window.open(
                    "https://wa.me/19739558328?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20servicios%20de%20transporte",
                    "_blank"
                  )
                }
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact via WhatsApp
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <h3 className="text-2xl font-bold">24/7</h3>
                <p className="mt-1 text-sm text-white/60">Monitoring</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <h3 className="text-2xl font-bold">Real-time</h3>
                <p className="mt-1 text-sm text-white/60">Tracking</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <h3 className="text-2xl font-bold">100%</h3>
                <p className="mt-1 text-sm text-white/60">Visibility</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <h3 className="text-2xl font-bold">Fast</h3>
                <p className="mt-1 text-sm text-white/60">Operations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container mx-auto px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Brand Positioning
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0B1F3A] sm:text-4xl">
              Professional coordination for modern transportation operations
            </h2>
            <p className="mt-5 text-lg text-[#64748B]">
              WV Transport & Logistics, LLC combines transportation support,
              real-time visibility, load coordination, internal communication,
              and operational control in one professional environment.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#EEF5FF]">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Core Platform
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0B1F3A] sm:text-4xl">
              Built for internal logistics control
            </h2>
            <p className="mt-4 text-[#64748B]">
              More than tracking. WV Control Center is designed as an internal
              logistics control system for transportation operations.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5 text-[#1D4ED8]" />}
              title="Dashboard with KPIs"
              description="Operational metrics for loads, payments, profitability, and daily decision-making."
            />
            <FeatureCard
              icon={<MapPinned className="h-5 w-5 text-[#1D4ED8]" />}
              title="Real-time map visibility"
              description="Driver activity, movement visibility, and route control for better operations."
            />
            <FeatureCard
              icon={<Truck className="h-5 w-5 text-[#1D4ED8]" />}
              title="Load status control"
              description="Track assignment, in-transit activity, delivery updates, and operational flow."
            />
            <FeatureCard
              icon={<MessageCircle className="h-5 w-5 text-[#1D4ED8]" />}
              title="Internal chat"
              description="Professional coordination between operations and drivers in one controlled environment."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />}
              title="POD and compliance"
              description="Proof of delivery workflows and structured documentation for transportation support."
            />
            <FeatureCard
              icon={<Bell className="h-5 w-5 text-[#1D4ED8]" />}
              title="Operational alerts"
              description="Visibility into incidents, approvals, updates, and key events across the system."
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Services
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0B1F3A] sm:text-4xl">
              Transportation support with structure and visibility
            </h2>
            <p className="mt-4 text-[#64748B]">
              Our focus is professional logistics support backed by operational
              discipline, coordination, and real-time control.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <ServiceCard
              title="Cargo van logistics support"
              description="Flexible support for regional and local transportation operations with professional coordination."
            />
            <ServiceCard
              title="Broker and dispatcher coordination"
              description="Structured communication and load handling for reliable transportation support."
            />
            <ServiceCard
              title="Operational control workflows"
              description="Visibility, process discipline, and internal control across active transportation activity."
            />
          </div>
        </div>
      </section>

      <section className="border-y border-[#E5E7EB] bg-[#F8FBFF]">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Why WV
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0B1F3A] sm:text-4xl">
              A more professional way to run transportation operations
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <BenefitCard
              icon={<Clock3 className="h-5 w-5 text-[#1D4ED8]" />}
              title="Operational speed"
              description="Fast coordination, faster response, better execution."
            />
            <BenefitCard
              icon={<Waypoints className="h-5 w-5 text-[#1D4ED8]" />}
              title="Real-time visibility"
              description="Know what is happening across loads and drivers."
            />
            <BenefitCard
              icon={<ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />}
              title="Professional control"
              description="Structured workflows instead of fragmented communication."
            />
            <BenefitCard
              icon={<CheckCircle2 className="h-5 w-5 text-[#1D4ED8]" />}
              title="Reliable coordination"
              description="Clear communication and stronger execution support."
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container mx-auto px-6 py-16">
          <div className="rounded-[24px] border border-[#E5E7EB] bg-[#0B1F3A] p-8 text-white shadow-sm lg:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">
                Ready to move forward
              </p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Bring more visibility and control into your logistics operations
              </h2>
              <p className="mt-4 text-white/75">
                WV Transport & Logistics, LLC is building a more professional
                logistics environment with real-time visibility, internal
                coordination, and structured operational control.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <PrimaryButton
  onClick={() => (window.location.href = "/dashboard")}
  className="px-6 py-4"
>
  Open WV Control Center
</PrimaryButton>

                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/20 bg-white/5 px-6 py-6 text-white hover:bg-white/10"
                  onClick={() =>
                    window.open(
                      "https://wa.me/19739558328?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20servicios%20de%20transporte",
                      "_blank"
                    )
                  }
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Speak with us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF5FF]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#0B1F3A]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

function ServiceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-[#0B1F3A]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF5FF]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#0B1F3A]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}
