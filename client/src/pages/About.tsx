import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Target,
  Award,
  MapPin,
  Phone,
  Mail,
  Clock3,
  Route,
  CheckCircle2,
  BarChart3,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png";

// Business Contact Information
const PRIMARY_EMAIL = "wascardely@gmail.com";
const BUSINESS_EMAIL = "info@wvtransports.com";
const BUSINESS_PHONE = "+1 (973) 955-8328";
const WHATSAPP_PHONE = "19739558328";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hola, quiero información sobre servicios de transporte"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${WHATSAPP_MESSAGE}`;

// Use primary email for contact form submissions
const EMAIL = PRIMARY_EMAIL;

export default function About() {
  const [, setLocation] = useLocation();
  const contactMutation = trpc.contact.submit.useMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  const { ref: valuesRef, isVisible: valuesVisible } = useIntersectionObserver();
  const { ref: servicesRef, isVisible: servicesVisible } = useIntersectionObserver();
  const { ref: teamRef, isVisible: teamVisible } = useIntersectionObserver();
  const { ref: statsRef, isVisible: statsVisible } = useIntersectionObserver();

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        setParallaxOffset(scrollY * 0.5);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const values = [
    {
      icon: Shield,
      title: "Confiabilidad",
      description:
        "Trabajamos con enfoque en puntualidad, seguridad y cumplimiento en cada operación.",
    },
    {
      icon: Zap,
      title: "Eficiencia",
      description:
        "Optimizamos tiempos, rutas y procesos para mejorar el rendimiento operativo.",
    },
    {
      icon: TrendingUp,
      title: "Crecimiento",
      description:
        "Construimos sistemas y procesos que permiten escalar con orden y rentabilidad.",
    },
    {
      icon: Users,
      title: "Colaboración",
      description:
        "Coordinamos operaciones, despacho y control financiero para tomar mejores decisiones.",
    },
  ];

  const steps = [
    {
      icon: Target,
      title: "Recibimos la solicitud",
      description:
        "Analizamos origen, destino, tiempo y condiciones de la carga para organizar la operación.",
    },
    {
      icon: Route,
      title: "Planificamos la ruta",
      description:
        "Definimos la mejor ejecución operativa según distancia, prioridad y disponibilidad.",
    },
    {
      icon: Clock3,
      title: "Monitoreamos la carga",
      description:
        "Damos seguimiento en tiempo real para mantener control y visibilidad de cada movimiento.",
    },
    {
      icon: CheckCircle2,
      title: "Confirmamos la entrega",
      description:
        "Cerramos la operación con control de cumplimiento y enfoque en servicio confiable.",
    },
  ];

  const services = [
    {
      icon: Truck,
      title: "Transporte de Carga Ligera",
      description:
        "Servicio con cargo van para cargas urgentes, regionales y operaciones de última milla.",
    },
    {
      icon: Target,
      title: "Logística Integrada",
      description:
        "Gestión operativa desde la asignación y seguimiento hasta la entrega final.",
    },
    {
      icon: BarChart3,
      title: "Control y Rentabilidad",
      description:
        "Análisis de costos, seguimiento financiero y visibilidad por carga en tiempo real.",
    },
    {
      icon: Shield,
      title: "Seguimiento Operativo",
      description:
        "Monitoreo constante del estado de cada envío para mantener control y respuesta rápida.",
    },
    {
      icon: Zap,
      title: "Automatización",
      description:
        "Uso de tecnología propia para reducir errores, acelerar decisiones y mejorar eficiencia.",
    },
    {
      icon: Award,
      title: "Soporte Estratégico",
      description:
        "Acompañamiento operativo para organizar procesos, mejorar control y crecer con base sólida.",
    },
  ];

  const differentiators = [
    {
      icon: Zap,
      title: "Tecnología Propia",
      description:
        "Operamos con un sistema diseñado para logística, cargas, finanzas y seguimiento.",
    },
    {
      icon: Route,
      title: "Mejor Toma de Decisiones",
      description:
        "Evaluamos rutas, márgenes y operación para enfocarnos en cargas más convenientes.",
    },
    {
      icon: Shield,
      title: "Visibilidad Total",
      description:
        "Centralizamos la información para que cada carga tenga control claro y seguimiento real.",
    },
  ];

  const team = [
    {
      name: "Wascar Ortiz Ramos",
      role: "Managing Member",
      bio: "Responsable de operaciones, ejecución de cargas y desarrollo estratégico del negocio.",
    },
    {
      name: "Yisvel Rodriguez",
      role: "Operations & Load Coordination",
      bio: "Encargado de coordinación de cargas, control operativo y seguimiento del sistema.",
    },
    {
      name: "WV Control Center",
      role: "Technology & Operations Platform",
      bio: "Plataforma interna para controlar cargas, decisiones operativas y finanzas.",
    },
  ];

  const stats = [
    { number: "24/7", label: "Monitoreo operativo" },
    { number: "100%", label: "Enfoque en control" },
    { number: "1", label: "Sistema centralizado" },
    { number: "∞", label: "Capacidad de crecimiento" },
  ];

  const testimonials = [
    {
      quote:
        "Un enfoque moderno y organizado para operaciones de transporte con mejor control diario.",
      author: "Operaciones Internas",
    },
    {
      quote:
        "La combinación de logística y tecnología permite tomar decisiones más rápidas y más claras.",
      author: "Gestión de Cargas",
    },
    {
      quote:
        "La plataforma centraliza información crítica para trabajar con más orden y visibilidad.",
      author: "Control Operativo",
    },
  ];

  const contacts = [
    {
      icon: MapPin,
      title: "Ubicación",
      content: "WV Transport, LLC\nPennsylvania, United States",
    },
    {
      icon: Phone,
      title: "Teléfono",
      content: BUSINESS_PHONE,
    },
    {
      icon: Mail,
      title: "Email",
      content: PRIMARY_EMAIL,
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await contactMutation.mutateAsync({
        name: formData.name,
        company: formData.company || undefined,
        email: formData.email,
        message: formData.message,
      });

      if (result.success) {
        toast.success(result.message);
        setFormData({
          name: "",
          company: "",
          email: "",
          message: "",
        });
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        ref={heroRef}
        className="relative border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 py-16 overflow-hidden"
        style={{
          backgroundPosition: `0 ${parallaxOffset}px`,
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-10 md:flex-row">
            <div className="flex-1">
              <img
                src={LOGO_URL}
                alt="WV Transport Control"
                className="mb-6 h-32 w-32 object-contain"
              />

              <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
                WV Transport Control
              </h1>

              <p className="mb-4 text-xl text-muted-foreground">
                Transporte con cargo van, logística eficiente y control total de
                operaciones en tiempo real.
              </p>

              <p className="mb-6 max-w-2xl text-base text-muted-foreground">
                Especializados en carga ligera, entregas urgentes y operaciones
                regionales, ayudamos a mejorar control, visibilidad y rentabilidad
                en cada carga.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Ir al Panel
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.open(WHATSAPP_URL, "_blank")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
                <h2 className="mb-6 text-2xl font-bold text-foreground">
                  Nuestra Misión
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  Proporcionar soluciones de transporte y logística confiables,
                  eficientes y tecnológicamente avanzadas que permitan mover
                  mercancía con mayor control, mejor seguimiento y decisiones más
                  rentables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
          Cómo Funciona
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <Card
              key={idx}
              className="border border-border bg-card p-6 text-center transition-shadow hover:shadow-lg"
            >
              <step.icon className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Values */}
      <div
        ref={valuesRef}
        className="container mx-auto px-4 py-16"
      >
        <h2 className={`mb-12 text-center text-3xl font-bold text-foreground transition-all duration-700 ${
          valuesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}>
          Nuestros Valores
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value, idx) => (
            <Card
              key={idx}
              className={`border border-border bg-card p-6 transition-all duration-700 hover:shadow-lg ${
                valuesVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: valuesVisible ? `${idx * 100}ms` : "0ms",
              }}
            >
              <value.icon className="mb-4 h-10 w-10 text-primary" />
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {value.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {value.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Services */}
      <div
        ref={servicesRef}
        className="border-y border-border bg-card py-16"
      >
        <div className="container mx-auto px-4">
          <h2 className={`mb-12 text-center text-3xl font-bold text-foreground transition-all duration-700 ${
            servicesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}>
            Nuestros Servicios
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, idx) => (
              <Card
                key={idx}
                className={`border border-border bg-background p-6 transition-all duration-700 hover:border-primary ${
                  servicesVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{
                  transitionDelay: servicesVisible ? `${idx * 100}ms` : "0ms",
                }}
              >
                <service.icon className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {service.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Why choose us */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
          ¿Por Qué Elegirnos?
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {differentiators.map((item, idx) => (
            <Card
              key={idx}
              className="border border-border bg-card p-6 text-center transition-shadow hover:shadow-lg"
            >
              <item.icon className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Team */}
      <div
        ref={teamRef}
        className="container mx-auto px-4 py-16"
      >
        <h2 className={`mb-12 text-center text-3xl font-bold text-foreground transition-all duration-700 ${
          teamVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}>
          Nuestro Equipo
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {team.map((member, idx) => (
            <Card
              key={idx}
              className={`border border-border bg-card p-6 text-center transition-all duration-700 hover:shadow-lg ${
                teamVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: teamVisible ? `${idx * 100}ms` : "0ms",
              }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>

              <h3 className="mb-1 text-lg font-bold text-foreground">
                {member.name}
              </h3>

              <p className="mb-3 text-sm font-semibold text-primary">
                {member.role}
              </p>

              <p className="text-sm text-muted-foreground">{member.bio}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="border-y border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Enfoque y Resultados
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, idx) => (
              <Card
                key={idx}
                className="border border-border bg-background p-6"
              >
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  "{item.quote}"
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {item.author}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Contact cards */}
      <div className="border-y border-border bg-gradient-to-r from-primary/10 to-primary/5 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Contacto
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {contacts.map((contact, idx) => (
              <Card
                key={idx}
                className="border border-border bg-card p-6 text-center"
              >
                <contact.icon className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {contact.title}
                </h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {contact.content}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Contact form */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Solicita Información
          </h2>
          <p className="mb-8 text-muted-foreground">
            Cuéntanos qué necesitas y te contactaremos con más detalles sobre
            nuestros servicios y operaciones.
          </p>

          <form onSubmit={handleContactSubmit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="name"
                type="text"
                placeholder="Nombre"
                value={formData.name}
                onChange={handleInputChange}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                required
              />
              <input
                name="company"
                type="text"
                placeholder="Empresa"
                value={formData.company}
                onChange={handleInputChange}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <input
              name="email"
              type="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleInputChange}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              required
            />

            <textarea
              name="message"
              placeholder="Cuéntanos qué necesitas..."
              value={formData.message}
              onChange={handleInputChange}
              rows={5}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              required
            />

            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || contactMutation.isPending}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting || contactMutation.isPending ? "Enviando..." : "Enviar Solicitud"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(WHATSAPP_URL, "_blank")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Escribir por WhatsApp
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div
        ref={statsRef}
        className="container mx-auto px-4 py-16"
      >
        <h2 className={`mb-12 text-center text-3xl font-bold text-foreground transition-all duration-700 ${
          statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}>
          Por los Números
        </h2>

        <div className="grid gap-6 md:grid-cols-4">
          {stats.map((stat, idx) => (
            <Card
              key={idx}
              className={`border border-border bg-card p-6 text-center transition-all duration-700 hover:border-primary ${
                statsVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: statsVisible ? `${idx * 100}ms` : "0ms",
              }}
            >
              <p className="mb-2 text-4xl font-bold text-primary">
                {stat.number}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary to-primary/80 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
            ¿Necesitas mover carga rápida y segura?
          </h2>

          <p className="mx-auto mb-8 max-w-2xl text-primary-foreground/90">
            En WV Transport combinamos operación, logística y tecnología para
            ayudarte a trabajar con más control, velocidad y eficiencia.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => setLocation("/")}
              className="bg-white text-primary hover:bg-white/90"
            >
              Acceder al Panel de Control
            </Button>

            <Button
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => window.open(WHATSAPP_URL, "_blank")}
            >
              Hablar con Nosotros
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 WV Transport, LLC. Todos los derechos reservados.</p>
          <p className="mt-2">
            WV Transport Control - Transporte, Logística y Operaciones en un solo lugar
          </p>
        </div>
      </div>
    </div>
  );
}
